import type { CompendiumCategory, Project } from '../types';
import { buildAIContext } from './contextEngine';
import { buildContext, type BuildContextParams } from './contextBuilder';

export interface BuildBaseSystemPromptParams extends Omit<
    BuildContextParams,
    'project'
> {
    project: Project | null;
    projectId: string;
    userMessage: string;
    currentChapterId?: string;
    embeddingsAvailable: boolean;
    embeddingsEnabled: boolean;
}

export interface BaseSystemPromptResult {
    systemPrompt: string | null;
    tokenEstimate?: number;
}

export async function buildBaseSystemPrompt({
    project,
    projectId,
    userMessage,
    currentChapterId,
    embeddingsAvailable,
    embeddingsEnabled,
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
}: BuildBaseSystemPromptParams): Promise<BaseSystemPromptResult> {
    if (!project) return { systemPrompt: null };

    if (embeddingsAvailable && embeddingsEnabled) {
        const result = await buildAIContext({
            projectId,
            userMessage,
            currentChapterId,
            mentionTargets: mentions,
            fileContents,
            customPrompt,
            chapterContextMode,
            tokenBudget: maxContextTokens,
        });
        return {
            systemPrompt: result.systemPrompt,
            tokenEstimate: result.tokenEstimate,
        };
    }

    const result = buildContext({
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
    });
    return {
        systemPrompt: result.systemPrompt,
        tokenEstimate: result.estimatedTokens,
    };
}

export interface StructurePromptResult {
    prompt: string;
    mode: 'create' | 'merge' | 'replace';
}

export function buildStructurePrompt({
    command,
    analysisInput,
    modificationContext,
}: {
    command: string;
    analysisInput: string;
    modificationContext?: string;
}): StructurePromptResult {
    const bt = '\x60\x60\x60';

    if (command === 'generatestructure') {
        return {
            mode: 'create',
            prompt:
                'You are a senior structural editor helping a writer plan a new chapter.\n\n' +
                (analysisInput
                    ? `Chapter context:\n${analysisInput}\n\n`
                    : '') +
                'The writer has provided a pitch for this chapter. Analyze the pitch and break it down into a structured arrangement of scenes and sequences.\n\n' +
                'Provide your structural analysis, then output the chapter structure as a JSON code block:\n' +
                bt +
                'structure-data\n' +
                '{\n' +
                '  "scenes": [\n' +
                '    {"title": "...", "summary": "...", "setting": "...", "charactersPresent": ["character name", ...], "keyEvents": ["event description", ...], "conflict": "...", "duration": "..."}\n' +
                '  ],\n' +
                '  "sequences": [\n' +
                '    {"title": "...", "summary": "...", "sceneIndices": [0, 1]}\n' +
                '  ]\n' +
                '}\n' +
                bt +
                '\n\nRules:\n' +
                '- Each scene is a discrete moment with a single location/time\n' +
                '- Sequences group related scenes into narrative units\n' +
                '- Scenes not in any sequence appear at chapter level\n' +
                '- sceneIndices refer to the scenes array (0-indexed)\n' +
                '- charactersPresent: array of character name strings\n' +
                '- keyEvents: array of brief event description strings',
        };
    }

    if (command === 'extractstructure') {
        return {
            mode: 'create',
            prompt:
                "You are a senior structural editor extracting structure from a chapter's text.\n\n" +
                (analysisInput
                    ? `Chapter context:\n${analysisInput}\n\n`
                    : '') +
                'Read the chapter text and identify its natural structure. Extract discrete scenes and group them into sequences where appropriate.\n\n' +
                'Briefly describe what you found, then output the structure as a JSON code block:\n' +
                bt +
                'structure-data\n' +
                '{\n' +
                '  "scenes": [\n' +
                '    {"title": "...", "summary": "...", "setting": "...", "charactersPresent": ["character name", ...], "keyEvents": ["event description", ...], "conflict": "...", "duration": "..."}\n' +
                '  ],\n' +
                '  "sequences": [\n' +
                '    {"title": "...", "summary": "...", "sceneIndices": [0, 1]}\n' +
                '  ]\n' +
                '}\n' +
                bt +
                '\n\nRules:\n' +
                '- Each scene is a discrete moment with a single location/time\n' +
                '- Sequences group related scenes into narrative units\n' +
                '- Scenes not in any sequence appear at chapter level\n' +
                '- sceneIndices refer to the scenes array (0-indexed)\n' +
                '- charactersPresent: array of character name strings\n' +
                '- keyEvents: array of brief event description strings',
        };
    }

    if (command === 'modifystructure') {
        return {
            mode: 'merge',
            prompt:
                "You are a senior structural editor helping a writer modify their chapter's structure.\n\n" +
                (modificationContext ? `${modificationContext}\n\n` : '') +
                "Analyze the writer's requested changes against the current structure.\n\n" +
                'If anything is unclear, ambiguous, or logically inconsistent, ask clarifying questions first. Do NOT output a structure-data block until you have enough information.\n\n' +
                'When you have enough information to make the changes, provide the COMPLETE modified structure as a JSON code block:\n' +
                bt +
                'structure-data\n' +
                '{\n' +
                '  "scenes": [\n' +
                '    {"id": "existing-scene-id", "title": "...", "summary": "...", "setting": "...", "charactersPresent": [...], "keyEvents": [...], "conflict": "...", "duration": "..."}\n' +
                '  ],\n' +
                '  "sequences": [\n' +
                '    {"id": "existing-sequence-id", "title": "...", "summary": "...", "sceneIndices": [0, 1]}\n' +
                '  ]\n' +
                '}\n' +
                bt +
                '\n\nIMPORTANT rules:\n' +
                '- Include the "id" field for every item that corresponds to an EXISTING scene or sequence listed above\n' +
                '- Omit the "id" field for brand new items\n' +
                '- Output the COMPLETE structure — both kept/modified and new items\n' +
                '- Items from the current structure whose IDs are omitted will be DELETED\n' +
                '- sceneIndices refer to the scenes array (0-indexed)\n' +
                '- charactersPresent: array of character name strings\n' +
                '- keyEvents: array of brief event description strings',
        };
    }

    if (command === 'rewritestructure') {
        return {
            mode: 'replace',
            prompt:
                "You are a senior structural editor. The writer wants to completely replace this chapter's structure.\n\n" +
                (analysisInput
                    ? `Chapter context:\n${analysisInput}\n\n`
                    : '') +
                "Analyze the writer's instructions and provide a fresh, complete structure.\n\n" +
                'Provide your structural notes, then output the new structure as a JSON code block:\n' +
                bt +
                'structure-data\n' +
                '{\n' +
                '  "scenes": [\n' +
                '    {"title": "...", "summary": "...", "setting": "...", "charactersPresent": ["character name", ...], "keyEvents": ["event description", ...], "conflict": "...", "duration": "..."}\n' +
                '  ],\n' +
                '  "sequences": [\n' +
                '    {"title": "...", "summary": "...", "sceneIndices": [0, 1]}\n' +
                '  ]\n' +
                '}\n' +
                bt +
                '\n\nRules:\n' +
                '- Each scene is a discrete moment with a single location/time\n' +
                '- Sequences group related scenes into narrative units\n' +
                '- Scenes not in any sequence appear at chapter level\n' +
                '- sceneIndices refer to the scenes array (0-indexed)\n' +
                '- charactersPresent: array of character name strings\n' +
                '- keyEvents: array of brief event description strings\n' +
                '- This will REPLACE all existing structure, so provide a complete chapter structure',
        };
    }

    return {
        mode: 'create',
        prompt:
            "You are a senior developmental editor analyzing a chapter's structure.\n\n" +
            (analysisInput ? `Chapter context:\n${analysisInput}\n\n` : '') +
            'Provide a concise editorial analysis focusing on key structural and prose elements:\n\n' +
            '## Editorial Review\n' +
            '- **Pacing & Tension**: Highlight major drag points, rushed sections, and the overall tension arc.\n' +
            '- **Core Pros & Cons**: Identify primary strengths to keep and critical weaknesses/unclear motivations.\n' +
            '- **Show vs. Tell**: Note key areas where telling must become showing.\n' +
            '- **Must-Fix Actions**: Immediate structural or narrative changes required.\n\n' +
            '---\n\n' +
            'After your analysis, provide the recommended chapter structure as a JSON code block:\n' +
            bt +
            'structure-data\n' +
            '{\n' +
            '  "scenes": [\n' +
            '    {"title": "...", "summary": "...", "setting": "...", "charactersPresent": ["character name", ...], "keyEvents": ["event description", ...], "conflict": "...", "duration": "..."}\n' +
            '  ],\n' +
            '  "sequences": [\n' +
            '    {"title": "...", "summary": "...", "sceneIndices": [0, 1]}\n' +
            '  ]\n' +
            '}\n' +
            bt +
            '\n\nRules for scenes and sequences:\n' +
            '- Each scene is a discrete moment with a single location/time\n' +
            '- Sequences group related scenes into narrative units\n' +
            '- Scenes not in any sequence appear at chapter level\n' +
            '- If existing scenes/sequences are provided, use them as reference but create new ones as needed\n' +
            '- sceneIndices refer to the scenes array (0-indexed)\n' +
            '- charactersPresent: array of character name strings present in the scene\n' +
            '- keyEvents: array of brief event description strings',
    };
}

export function buildExtractionPrompt({
    category,
    isUpdate,
    existingContext,
}: {
    category: CompendiumCategory | null;
    isUpdate: boolean;
    existingContext: string;
}): string {
    const categoryFilter = category
        ? `Focus on identifying ${category} entries only.`
        : 'Identify all character, location, organization, item, and lore entries.';
    const actionInstruction = isUpdate
        ? 'For each entity found in the text that matches an existing entry, output an entry-data block with its existing id and any updated field values.'
        : 'For each distinct entity found, output a ```entry-data JSON block.';
    const idField = isUpdate ? ', "id": "existing-entry-id"' : '';

    return (
        "You are analyzing text from the user's novel. " +
        categoryFilter +
        ' ' +
        actionInstruction +
        '\n\n' +
        'Read the text below carefully and output ' +
        (isUpdate
            ? 'updates for matching entries'
            : 'all entities you can identify') +
        '.\n\n' +
        existingContext +
        '\n\n' +
        'Each entry-data block must follow this format:\n' +
        '```entry-data\n' +
        '{"category": "character|location|organization|item|lore", "name": "Entity Name"' +
        idField +
        ', "fields": {"field1": "value1", ...}}\n' +
        '```\n\n' +
        'Be thorough but only include information present in the text.'
    );
}

export function buildCreateEntryPrompt({
    category,
    name,
    description,
}: {
    category: CompendiumCategory;
    name: string;
    description: string;
}): string {
    const prompt = description
        ? `The user wants to create a ${category} entry named "${name}". Description: ${description}. Generate detailed content for this entry.`
        : `The user wants to create a ${category} entry named "${name}". Generate detailed content for this entry.`;
    return `${prompt}\nMake sure the \`\`\`entry-data JSON block at the end uses category "${category}" and name "${name}".`;
}
