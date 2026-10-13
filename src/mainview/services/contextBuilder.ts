import type {
    Project,
    MentionTarget,
    Chapter,
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    FieldDefinition,
    CompendiumCategory,
    StoryScene,
    StorySequence,
} from '../types/index';
import { isFieldVisible } from '../templates/fieldVisibility';
import { isTreeEdge } from '../templates/tree';

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export interface BuildContextParams {
    project: Project;
    mentions: MentionTarget[];
    fileContents: string[];
    customPrompt: string | null;
    chapterContextMode: 'brief' | 'full';
    maxContextTokens: number;
    chapters: Chapter[];
    characters: Character[];
    locations: Location[];
    organizations: Organization[];
    items: Item[];
    loreEntries: LoreEntry[];
    scenes?: StoryScene[];
    sequences?: StorySequence[];
    resolvedTemplates?: Partial<Record<CompendiumCategory, FieldDefinition[]>>;
}

export interface BuildContextResult {
    systemPrompt: string;
    estimatedTokens: number;
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

function formatChapterChip(
    ch: Chapter,
    mode: 'brief' | 'full',
    fullMode: 'brief' | 'full'
): string {
    const effectiveMode = mode === 'full' ? 'full' : fullMode;
    const header = `\n[Chapter: "${ch.title}"]`;
    if (effectiveMode === 'brief') {
        const excerpt = (ch.content || '').slice(0, 800);
        return `${header}\n${excerpt}${ch.content && ch.content.length > 800 ? '\n[...]' : ''}`;
    }
    return `${header}\n${ch.content || '(empty)'}`;
}

function formatTemplateData(
    data: Record<string, unknown> | null,
    resolvedFields?: FieldDefinition[]
): string[] {
    if (!data) return [];
    const parts: string[] = [];
    for (const [key, value] of Object.entries(data)) {
        const field = resolvedFields?.find((f) => f.name === key);
        if (resolvedFields && field && !isFieldVisible(field, data)) continue;
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

function formatCharacterEntity(
    ch: Character,
    resolvedFields?: FieldDefinition[]
): string {
    const parts: string[] = [`\n[Character: "${ch.name}"]`];
    parts.push(...formatTemplateData(ch.templateData, resolvedFields));
    return parts.join('\n');
}

function formatLocationEntity(
    loc: Location,
    resolvedFields?: FieldDefinition[]
): string {
    const parts: string[] = [`\n[Location: "${loc.name}"]`];
    parts.push(...formatTemplateData(loc.templateData, resolvedFields));
    return parts.join('\n');
}

function formatOrganizationEntity(
    org: Organization,
    resolvedFields?: FieldDefinition[]
): string {
    const parts: string[] = [`\n[Organization: "${org.name}"]`];
    parts.push(...formatTemplateData(org.templateData, resolvedFields));
    return parts.join('\n');
}

function formatItemEntity(
    item: Item,
    resolvedFields?: FieldDefinition[]
): string {
    const parts: string[] = [`\n[Item: "${item.name}"]`];
    parts.push(...formatTemplateData(item.templateData, resolvedFields));
    return parts.join('\n');
}

function formatLoreEntity(
    lore: LoreEntry,
    resolvedFields?: FieldDefinition[]
): string {
    const parts: string[] = [`\n[Lore: "${lore.name}"]`];
    parts.push(...formatTemplateData(lore.templateData, resolvedFields));
    return parts.join('\n');
}

function formatSceneEntity(scene: StoryScene): string {
    const parts: string[] = [`\n[Scene: "${scene.title}"]`];
    if (scene.summary) parts.push(`  summary: ${scene.summary}`);
    if (scene.setting) parts.push(`  setting: ${scene.setting}`);
    if (scene.charactersPresent)
        parts.push(`  characters: ${scene.charactersPresent}`);
    if (scene.keyEvents) parts.push(`  keyEvents: ${scene.keyEvents}`);
    if (scene.conflict) parts.push(`  conflict: ${scene.conflict}`);
    if (scene.duration) parts.push(`  duration: ${scene.duration}`);
    return parts.join('\n');
}

function formatSequenceEntity(seq: StorySequence): string {
    const parts: string[] = [`\n[Sequence: "${seq.title}"]`];
    if (seq.summary) parts.push(`  summary: ${seq.summary}`);
    return parts.join('\n');
}

export function buildContext(params: BuildContextParams): BuildContextResult {
    const {
        project,
        mentions,
        fileContents,
        customPrompt,
        chapterContextMode,
        maxContextTokens,
        chapters,
        characters,
        locations,
        organizations,
        items,
        loreEntries,
        scenes,
        sequences,
        resolvedTemplates,
    } = params;

    const protectedParts: string[] = [
        formatProjectPrompt(project),
        ENTRY_PROMPT_INSTRUCTION,
        customPrompt?.trim() ? `\n${customPrompt.trim()}` : '',
    ].filter(Boolean);

    const mentionBlocks: string[] = [];
    if (mentions.length > 0) {
        mentionBlocks.push('\n\n--- Context from mentions ---');
        for (const m of mentions) {
            let block = '';
            if (m.type === 'chapter') {
                const ch = chapters.find((c) => c.id === m.id);
                if (ch)
                    block = formatChapterChip(
                        ch,
                        m.mode || 'brief',
                        chapterContextMode
                    );
            } else if (m.type === 'character') {
                const ch = characters.find((c) => c.id === m.id);
                if (ch)
                    block = formatCharacterEntity(
                        ch,
                        resolvedTemplates?.character
                    );
            } else if (m.type === 'location') {
                const loc = locations.find((l) => l.id === m.id);
                if (loc)
                    block = formatLocationEntity(
                        loc,
                        resolvedTemplates?.location
                    );
            } else if (m.type === 'organization') {
                const org = organizations.find((o) => o.id === m.id);
                if (org)
                    block = formatOrganizationEntity(
                        org,
                        resolvedTemplates?.organization
                    );
            } else if (m.type === 'item') {
                const it = items.find((i) => i.id === m.id);
                if (it) block = formatItemEntity(it, resolvedTemplates?.item);
            } else if (m.type === 'lore') {
                const le = loreEntries.find((l) => l.id === m.id);
                if (le) block = formatLoreEntity(le, resolvedTemplates?.lore);
            } else if (m.type === 'scene') {
                const sc = scenes?.find((s) => s.id === m.id);
                if (sc) block = formatSceneEntity(sc);
            } else if (m.type === 'sequence') {
                const seq = sequences?.find((s) => s.id === m.id);
                if (seq) block = formatSequenceEntity(seq);
            }
            if (block) mentionBlocks.push(block);
        }
    }

    const fileBlocks: string[] = [];
    if (fileContents.length > 0) {
        fileBlocks.push('\n\n--- Context from attached files ---');
        for (const f of fileContents) {
            fileBlocks.push(f);
        }
    }

    const dynamicParts = [...mentionBlocks, ...fileBlocks];
    let fullPrompt = [...protectedParts, ...dynamicParts].join('\n');
    let estimated = estimateTokens(fullPrompt);

    while (estimated > maxContextTokens && dynamicParts.length > 0) {
        dynamicParts.pop();
        fullPrompt = [...protectedParts, ...dynamicParts].join('\n');
        estimated = estimateTokens(fullPrompt);
    }

    if (estimated > maxContextTokens && protectedParts.length > 0) {
        const lastProtectedIndex = protectedParts.length - 1;
        const lastProtected = protectedParts[lastProtectedIndex];
        if (lastProtected && lastProtected.length > 200) {
            protectedParts[lastProtectedIndex] = lastProtected.slice(0, 2000);
            fullPrompt = [...protectedParts, ...dynamicParts].join('\n');
            estimated = estimateTokens(fullPrompt);
        }
    }

    if (estimated > maxContextTokens) {
        fullPrompt = [...protectedParts].join('\n');
        estimated = estimateTokens(fullPrompt);
    }

    return { systemPrompt: fullPrompt, estimatedTokens: estimated };
}
