import type { CompendiumCategory } from '../types/index';

export interface ParsedEntry {
    category: CompendiumCategory;
    name: string;
    templateData: Record<string, unknown>;
    existingId?: string;
}

const VALID_CATEGORIES: CompendiumCategory[] = [
    'character',
    'location',
    'organization',
    'item',
    'lore',
];

function extractNameFromText(text: string): string | null {
    // Try first # heading
    const headingMatch = text.match(/^#\s+(.+)/m);
    if (headingMatch) return headingMatch[1].trim();

    // Try first **bold** phrase
    const boldMatch = text.match(/\*\*(.+?)\*\*/);
    if (boldMatch) return boldMatch[1].trim();

    // Try first sentence
    const sentenceMatch = text.match(/^([A-Z][^.!?]*[.!?])/);
    if (sentenceMatch) return sentenceMatch[1].trim();

    return null;
}

function parseSingleEntry(match: string, fullText: string): ParsedEntry | null {
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(match.trim());
    } catch {
        return null;
    }

    const rawCategory = String(parsed.category || '').toLowerCase();
    if (!VALID_CATEGORIES.includes(rawCategory as CompendiumCategory))
        return null;
    const category = rawCategory as CompendiumCategory;

    let name = String(parsed.name || '').trim();
    if (!name) {
        name =
            extractNameFromText(fullText) ||
            `Untitled ${category.charAt(0).toUpperCase() + category.slice(1)}`;
    }

    const existingId = parsed.id ? String(parsed.id) : undefined;

    const fields = (parsed.fields as Record<string, unknown>) || {};
    const templateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
        if (value != null) {
            templateData[key] = value;
        }
    }

    return { category, name, templateData, existingId };
}

export function parseEntryData(text: string): ParsedEntry | null {
    const blockRegex = /```entry-data\s*\n([\s\S]*?)```/g;
    const match = blockRegex.exec(text);
    if (!match) return null;
    return parseSingleEntry(match[1], text);
}

export function parseAllEntryData(text: string): ParsedEntry[] {
    const blockRegex = /```entry-data\s*\n([\s\S]*?)```/g;
    const results: ParsedEntry[] = [];
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
        const entry = parseSingleEntry(match[1], text);
        if (entry) results.push(entry);
    }
    return results;
}
