import { db, sqliteVecAvailable } from '../database/index';
import {
    characters,
    locations,
    organizations,
    items,
    loreEntries,
    plotThreads,
    chapterPlotThreads,
    storyBeats,
    chapters,
} from '../schema/index';
import { eq } from 'drizzle-orm';
import { semanticSearch } from './embeddings/search';
import { countTokens, truncateToTokens } from './embeddings/tokenizer';
import { resolveTemplate } from '../database/templates';
import type { FieldDefinition } from '../database/templates';
import { isFieldVisible } from '../../mainview/templates/fieldVisibility';
import { isTreeEdge } from '../../mainview/templates/tree';
import type {
    EmbeddingSettings,
    Project,
    MentionTarget,
    ContextSource,
    CompendiumCategory,
} from '../../mainview/types';

export interface ContextRequest {
    projectId: string;
    project: Project;
    userMessage: string;
    currentChapterId?: string;
    currentEntityId?: string;
    mentionTargets?: MentionTarget[];
    fileContents?: string[];
    customPrompt?: string | null;
    chapterContextMode?: 'brief' | 'full';
    tokenBudget: number;
    embeddingSettings?: EmbeddingSettings;
}

export interface ContextResult {
    systemPrompt: string;
    tokenEstimate: number;
    sources: ContextSource[];
}

const ENTRY_PROMPT_INSTRUCTION =
    '\n\nWhen asked to create a character, location, organization, item, or lore entry, append a JSON code block at the end of your response:\n```entry-data\n{"category": "character|location|organization|item|lore", "name": "Entry Name", "fields": {"field1": "value1", ...}}\n```\nInclude all relevant attributes in the fields object.';

function formatProjectPrompt(project: Project): string {
    const lines: string[] = [];
    lines.push(`You are a writing assistant for "${project.name}".`);
    if (project.contentRating)
        lines.push(`Content rating: ${project.contentRating}`);
    if (project.primaryGenre) lines.push(`Genre: ${project.primaryGenre}`);
    if (project.projectScope)
        lines.push(`Project scope: ${project.projectScope}`);
    if (project.pov) lines.push(`Point of view: ${project.pov}`);
    if (project.pacing) lines.push(`Pacing: ${project.pacing}`);
    if (project.seriesArch)
        lines.push(`Series architecture: ${project.seriesArch}`);
    if (project.description)
        lines.push(`\nProject description:\n${project.description}`);
    if (project.genres?.length)
        lines.push(`\nGenres: ${project.genres.join(', ')}`);
    if (project.themes?.length)
        lines.push(`Themes: ${project.themes.join(', ')}`);
    return lines.join('\n');
}

function formatTemplateData(data: Record<string, unknown> | null): string[] {
    if (!data) return [];
    const parts: string[] = [];
    for (const [key, value] of Object.entries(data)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            if (value.every(isTreeEdge)) {
                const labels = (
                    value as Array<{ relation: string; targetId: string }>
                ).map((e) => `${e.relation} → ${e.targetId}`);
                parts.push(`  ${key}: ${labels.join(', ')}`);
            } else if (value.length > 0) {
                parts.push(`  ${key}: ${value.join(', ')}`);
            }
        } else if (typeof value === 'object') {
            parts.push(`  ${key}: ${JSON.stringify(value)}`);
        } else {
            parts.push(`  ${key}: ${String(value)}`);
        }
    }
    return parts;
}

async function getResolvedFields(
    projectId: string,
    type: string
): Promise<FieldDefinition[]> {
    try {
        const resolved = await resolveTemplate(
            projectId,
            type as CompendiumCategory
        );
        return resolved.fields;
    } catch {
        return [];
    }
}

function filterByVisibility(
    data: Record<string, unknown>,
    resolvedFields: FieldDefinition[]
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        const field = resolvedFields.find((f) => f.name === key);
        if (!field) {
            out[key] = value;
            continue;
        }
        if (isFieldVisible(field, data)) out[key] = value;
    }
    return out;
}

function formatChapterContent(ch: any, mode: 'brief' | 'full'): string {
    const header = `\n[Chapter: "${ch.title}"]`;
    if (mode === 'brief') {
        const excerpt = (ch.content || '').slice(0, 800);
        return `${header}\n${excerpt}${ch.content && ch.content.length > 800 ? '\n[...]' : ''}`;
    }
    return `${header}\n${ch.content || '(empty)'}`;
}

function formatEntityBlock(
    type: string,
    name: string,
    templateData: any,
    resolvedFields?: FieldDefinition[]
): string {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const parts = [`\n[${label}: "${name}"]`];
    if (templateData) {
        try {
            const data =
                typeof templateData === 'string'
                    ? JSON.parse(templateData)
                    : templateData;
            const filtered = resolvedFields
                ? filterByVisibility(data, resolvedFields)
                : data;
            parts.push(...formatTemplateData(filtered));
        } catch {
            /* skip */
        }
    }
    return parts.join('\n');
}

function retrieveStructuredContext(
    request: ContextRequest,
    budgetTokens: number
): { text: string; sources: ContextSource[] } {
    const parts: string[] = [];
    const sources: ContextSource[] = [];
    let usedTokens = 0;

    if (request.currentChapterId) {
        const ch = db
            .select()
            .from(chapters)
            .where(eq(chapters.id, request.currentChapterId))
            .get();

        if (ch) {
            const mode = request.chapterContextMode || 'brief';
            const block = formatChapterContent(ch, mode);
            const tokens = countTokens(block);
            if (usedTokens + tokens <= budgetTokens) {
                parts.push(block);
                sources.push({
                    entityType: 'chapter',
                    entityId: ch.id,
                    label: ch.title,
                });
                usedTokens += tokens;
            }

            const threadRows = db
                .select({
                    plotThreadId: chapterPlotThreads.plotThreadId,
                    intensity: chapterPlotThreads.intensity,
                })
                .from(chapterPlotThreads)
                .where(
                    eq(chapterPlotThreads.chapterId, request.currentChapterId)
                )
                .all();

            for (const tr of threadRows) {
                const thread = db
                    .select()
                    .from(plotThreads)
                    .where(eq(plotThreads.id, tr.plotThreadId))
                    .get();
                if (thread) {
                    const block = `\n[Plot Thread: "${thread.name}" (intensity: ${tr.intensity})]\n  ${thread.description || ''}`;
                    const tokens = countTokens(block);
                    if (usedTokens + tokens <= budgetTokens) {
                        parts.push(block);
                        sources.push({
                            entityType: 'plot_thread',
                            entityId: thread.id,
                            label: thread.name,
                        });
                        usedTokens += tokens;
                    }
                }
            }

            const beatRows = db
                .select()
                .from(storyBeats)
                .where(eq(storyBeats.chapterId, request.currentChapterId))
                .all();

            for (const beat of beatRows) {
                const block = `\n[Story Beat: ${beat.beatType} - "${beat.title}"]\n  ${beat.description || ''}`;
                const tokens = countTokens(block);
                if (usedTokens + tokens <= budgetTokens) {
                    parts.push(block);
                    sources.push({
                        entityType: 'story_beat',
                        entityId: beat.id,
                        label: beat.title,
                    });
                    usedTokens += tokens;
                }
            }
        }
    }

    return { text: parts.join('\n'), sources };
}

async function retrieveSemanticContext(
    request: ContextRequest,
    budgetTokens: number
): Promise<{ text: string; sources: ContextSource[] }> {
    if (!request.embeddingSettings || !sqliteVecAvailable) {
        return { text: '', sources: [] };
    }

    const results = await semanticSearch(request.embeddingSettings, {
        projectId: request.projectId,
        query: request.userMessage,
        topK: 10,
    });

    const parts: string[] = [];
    const sources: ContextSource[] = [];
    let usedTokens = 0;

    for (const result of results) {
        const label =
            result.entityType.charAt(0).toUpperCase() +
            result.entityType.slice(1);
        const block = `\n[Retrieved ${label}] (relevance: ${result.score.toFixed(2)})\n${result.chunkText}`;
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            sources.push({
                entityType: result.entityType,
                entityId: result.entityId,
                label: `${label} (relevance: ${result.score.toFixed(2)})`,
                score: result.score,
            });
            usedTokens += tokens;
        }
    }

    return { text: parts.join('\n'), sources };
}

async function retrieveCompendiumEntities(
    projectId: string,
    budgetTokens: number
): Promise<{ text: string; sources: ContextSource[] }> {
    const parts: string[] = [];
    const sources: ContextSource[] = [];
    let usedTokens = 0;

    const allChars = db
        .select()
        .from(characters)
        .where(eq(characters.projectId, projectId))
        .all();
    if (allChars.length > 0) {
        const header = `\n--- All Characters (${allChars.length}) ---`;
        let block = header;
        const resolvedFields = await getResolvedFields(projectId, 'character');
        for (const ch of allChars) {
            const entry = formatEntityBlock(
                'character',
                ch.name,
                ch.templateData,
                resolvedFields
            );
            const testBlock = block + entry;
            if (countTokens(testBlock) > budgetTokens) break;
            block += entry;
            sources.push({
                entityType: 'character',
                entityId: ch.id,
                label: ch.name,
            });
        }
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            usedTokens += tokens;
        }
    }

    const allLocs = db
        .select()
        .from(locations)
        .where(eq(locations.projectId, projectId))
        .all();
    if (allLocs.length > 0) {
        const header = `\n--- All Locations (${allLocs.length}) ---`;
        let block = header;
        const resolvedFields = await getResolvedFields(projectId, 'location');
        for (const loc of allLocs) {
            const entry = formatEntityBlock(
                'location',
                loc.name,
                loc.templateData,
                resolvedFields
            );
            const testBlock = block + entry;
            if (countTokens(testBlock) > budgetTokens) break;
            block += entry;
            sources.push({
                entityType: 'location',
                entityId: loc.id,
                label: loc.name,
            });
        }
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            usedTokens += tokens;
        }
    }

    const allOrgs = db
        .select()
        .from(organizations)
        .where(eq(organizations.projectId, projectId))
        .all();
    if (allOrgs.length > 0) {
        const header = `\n--- All Organizations (${allOrgs.length}) ---`;
        let block = header;
        const resolvedFields = await getResolvedFields(
            projectId,
            'organization'
        );
        for (const org of allOrgs) {
            const entry = formatEntityBlock(
                'organization',
                org.name,
                org.templateData,
                resolvedFields
            );
            const testBlock = block + entry;
            if (countTokens(testBlock) > budgetTokens) break;
            block += entry;
            sources.push({
                entityType: 'organization',
                entityId: org.id,
                label: org.name,
            });
        }
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            usedTokens += tokens;
        }
    }

    const allItems = db
        .select()
        .from(items)
        .where(eq(items.projectId, projectId))
        .all();
    if (allItems.length > 0) {
        const header = `\n--- All Items (${allItems.length}) ---`;
        let block = header;
        const resolvedFields = await getResolvedFields(projectId, 'item');
        for (const item of allItems) {
            const entry = formatEntityBlock(
                'item',
                item.name,
                item.templateData,
                resolvedFields
            );
            const testBlock = block + entry;
            if (countTokens(testBlock) > budgetTokens) break;
            block += entry;
            sources.push({
                entityType: 'item',
                entityId: item.id,
                label: item.name,
            });
        }
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            usedTokens += tokens;
        }
    }

    const allLore = db
        .select()
        .from(loreEntries)
        .where(eq(loreEntries.projectId, projectId))
        .all();
    if (allLore.length > 0) {
        const header = `\n--- All Lore (${allLore.length}) ---`;
        let block = header;
        const resolvedFields = await getResolvedFields(projectId, 'lore');
        for (const lore of allLore) {
            const entry = formatEntityBlock(
                'lore',
                lore.name,
                lore.templateData,
                resolvedFields
            );
            const testBlock = block + entry;
            if (countTokens(testBlock) > budgetTokens) break;
            block += entry;
            sources.push({
                entityType: 'lore',
                entityId: lore.id,
                label: lore.name,
            });
        }
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            usedTokens += tokens;
        }
    }

    const allThreads = db
        .select()
        .from(plotThreads)
        .where(eq(plotThreads.projectId, projectId))
        .all();
    if (allThreads.length > 0) {
        const header = `\n--- All Plot Threads (${allThreads.length}) ---`;
        let block = header;
        for (const thread of allThreads) {
            const entry = `\n[Plot Thread: "${thread.name}"]\n  ${thread.description || ''}\n  Type: ${thread.threadType}`;
            const testBlock = block + entry;
            if (countTokens(testBlock) > budgetTokens) break;
            block += entry;
            sources.push({
                entityType: 'plot_thread',
                entityId: thread.id,
                label: thread.name,
            });
        }
        const tokens = countTokens(block);
        if (usedTokens + tokens <= budgetTokens) {
            parts.push(block);
            usedTokens += tokens;
        }
    }

    return { text: parts.join('\n'), sources };
}

export async function buildContext(
    request: ContextRequest
): Promise<ContextResult> {
    const budget = Math.max(1, request.tokenBudget);
    const sources: ContextSource[] = [];

    const projectPrompt = formatProjectPrompt(request.project);
    const projectTokens = countTokens(projectPrompt);

    const entryInstruction = ENTRY_PROMPT_INSTRUCTION;
    const entryTokens = countTokens(entryInstruction);

    let customBlock = '';
    let customTokens = 0;
    if (request.customPrompt) {
        customBlock = `\n${request.customPrompt.trim()}`;
        customTokens = countTokens(customBlock);
    }

    const protectedParts = [projectPrompt, entryInstruction, customBlock].filter(
        Boolean
    );
    const baseTokens = projectTokens + entryTokens + customTokens;
    const remainingBudget = Math.max(budget - baseTokens, 0);

    const mentionBudget = Math.floor(remainingBudget * 0.2);
    const structuredBudget = Math.floor(remainingBudget * 0.1);
    const compendiumBudget = Math.floor(remainingBudget * 0.35);
    const semanticBudget = Math.floor(remainingBudget * 0.25);
    const fileBudget = Math.floor(remainingBudget * 0.1);

    const mentionParts: string[] = [];
    let mentionUsed = 0;

    if (request.mentionTargets && request.mentionTargets.length > 0) {
        mentionParts.push('\n\n--- Context from mentions ---');

        for (const m of request.mentionTargets) {
            let block = '';
            if (m.type === 'chapter') {
                const ch = db
                    .select()
                    .from(chapters)
                    .where(eq(chapters.id, m.id))
                    .get();
                if (ch) {
                    const mode =
                        m.mode === 'full'
                            ? 'full'
                            : request.chapterContextMode || 'brief';
                    block = formatChapterContent(ch, mode);
                    sources.push({
                        entityType: 'chapter',
                        entityId: ch.id,
                        label: ch.title,
                    });
                }
            } else if (m.type === 'character') {
                const e = db
                    .select()
                    .from(characters)
                    .where(eq(characters.id, m.id))
                    .get();
                if (e) {
                    block = formatEntityBlock(
                        'character',
                        e.name,
                        e.templateData,
                        await getResolvedFields(request.projectId, 'character')
                    );
                    sources.push({
                        entityType: 'character',
                        entityId: e.id,
                        label: e.name,
                    });
                }
            } else if (m.type === 'location') {
                const e = db
                    .select()
                    .from(locations)
                    .where(eq(locations.id, m.id))
                    .get();
                if (e) {
                    block = formatEntityBlock(
                        'location',
                        e.name,
                        e.templateData,
                        await getResolvedFields(request.projectId, 'location')
                    );
                    sources.push({
                        entityType: 'location',
                        entityId: e.id,
                        label: e.name,
                    });
                }
            } else if (m.type === 'organization') {
                const e = db
                    .select()
                    .from(organizations)
                    .where(eq(organizations.id, m.id))
                    .get();
                if (e) {
                    block = formatEntityBlock(
                        'organization',
                        e.name,
                        e.templateData,
                        await getResolvedFields(
                            request.projectId,
                            'organization'
                        )
                    );
                    sources.push({
                        entityType: 'organization',
                        entityId: e.id,
                        label: e.name,
                    });
                }
            } else if (m.type === 'item') {
                const e = db
                    .select()
                    .from(items)
                    .where(eq(items.id, m.id))
                    .get();
                if (e) {
                    block = formatEntityBlock(
                        'item',
                        e.name,
                        e.templateData,
                        await getResolvedFields(request.projectId, 'item')
                    );
                    sources.push({
                        entityType: 'item',
                        entityId: e.id,
                        label: e.name,
                    });
                }
            } else if (m.type === 'lore') {
                const e = db
                    .select()
                    .from(loreEntries)
                    .where(eq(loreEntries.id, m.id))
                    .get();
                if (e) {
                    block = formatEntityBlock(
                        'lore',
                        e.name,
                        e.templateData,
                        await getResolvedFields(request.projectId, 'lore')
                    );
                    sources.push({
                        entityType: 'lore',
                        entityId: e.id,
                        label: e.name,
                    });
                }
            }
            if (block) {
                const tokens = countTokens(block);
                if (mentionUsed + tokens <= mentionBudget) {
                    mentionParts.push(block);
                    mentionUsed += tokens;
                }
            }
        }
    }

    const { text: structuredText, sources: structuredSources } =
        retrieveStructuredContext(request, structuredBudget);
    sources.push(...structuredSources);

    const { text: compendiumText, sources: compendiumSources } =
        await retrieveCompendiumEntities(request.projectId, compendiumBudget);
    sources.push(...compendiumSources);

    const { text: semanticText, sources: semanticSources } =
        await retrieveSemanticContext(request, semanticBudget);
    sources.push(...semanticSources);

    let fileBlock = '';
    let fileUsed = 0;
    if (request.fileContents && request.fileContents.length > 0) {
        const fileParts: string[] = ['\n\n--- Context from attached files ---'];
        for (const f of request.fileContents) {
            const tokens = countTokens(f);
            if (fileUsed + tokens <= fileBudget) {
                fileParts.push(f);
                fileUsed += tokens;
            }
        }
        if (fileParts.length > 1) {
            fileBlock = fileParts.join('\n');
        }
    }

    const dynamicSegments = [
        mentionParts.join(''),
        structuredText,
        compendiumText,
        semanticText,
        fileBlock,
    ].filter(Boolean);

    let fullPrompt = [...protectedParts, ...dynamicSegments].join('\n');
    let tokenEstimate = countTokens(fullPrompt);

    while (tokenEstimate > budget && dynamicSegments.length > 0) {
        dynamicSegments.pop();
        fullPrompt = [...protectedParts, ...dynamicSegments].join('\n');
        tokenEstimate = countTokens(fullPrompt);
    }

    if (tokenEstimate > budget && protectedParts.length > 0) {
        const lastProtectedIndex = protectedParts.length - 1;
        const lastProtected = protectedParts[lastProtectedIndex];
        if (lastProtected && lastProtected.length > 200) {
            protectedParts[lastProtectedIndex] = lastProtected.slice(0, 2000);
            fullPrompt = [...protectedParts, ...dynamicSegments].join('\n');
            tokenEstimate = countTokens(fullPrompt);
        }
    }

    if (tokenEstimate > budget) {
        fullPrompt = truncateToTokens(fullPrompt, budget);
        tokenEstimate = countTokens(fullPrompt);
    }

    return { systemPrompt: fullPrompt, tokenEstimate, sources };
}
