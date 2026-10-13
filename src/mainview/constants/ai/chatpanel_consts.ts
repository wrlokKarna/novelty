import { CompendiumCategory, MentionTarget } from '../../types';

export const COMMAND_MAP: Record<string, CompendiumCategory> = {
    createcharacter: 'character',
    createlocation: 'location',
    createorganization: 'organization',
    createitem: 'item',
    createlore: 'lore',
};

export const EXTRACT_COMMANDS = new Set([
    'extractcharacters',
    'extractlocations',
    'extractorganizations',
    'extractitems',
    'extractlore',
    'extractall',
    'updatecompendium',
]);

export const EXTRACT_CATEGORY_MAP: Record<string, CompendiumCategory | null> = {
    extractcharacters: 'character',
    extractlocations: 'location',
    extractorganizations: 'organization',
    extractitems: 'item',
    extractlore: 'lore',
    extractall: null,
    updatecompendium: null,
};

export const ANALYSIS_COMMANDS = new Set([
    'analyzestructure',
    'generatestructure',
    'extractstructure',
    'modifystructure',
    'rewritestructure',
]);

export const typeLabels: Record<MentionTarget['type'], string> = {
    chapter: 'Chapters',
    character: 'Characters',
    location: 'Locations',
    organization: 'Organizations',
    item: 'Items',
    lore: 'Lore',
    scene: 'Scenes',
    sequence: 'Sequences',
};

export const SLASH_COMMANDS = [
    {
        command: '/continue',
        description: 'Continue writing from cursor',
        type: 'instant' as const,
    },
    {
        command: '/rewrite',
        description: 'Rewrite selected text',
        type: 'instant' as const,
    },
    {
        command: '/expand',
        description: 'Expand on selected text',
        type: 'instant' as const,
    },
    {
        command: '/summarize',
        description: 'Summarize selected text',
        type: 'instant' as const,
    },
    {
        command: '/tone:',
        description: 'Change tone (formal, casual, poetic...)',
        type: 'context' as const,
    },
    {
        command: '/createcharacter',
        description: 'Create a new character entry',
        type: 'context' as const,
    },
    {
        command: '/createlocation',
        description: 'Create a new location entry',
        type: 'context' as const,
    },
    {
        command: '/createorganization',
        description: 'Create a new organization entry',
        type: 'context' as const,
    },
    {
        command: '/createitem',
        description: 'Create a new item entry',
        type: 'context' as const,
    },
    {
        command: '/createlore',
        description: 'Create a new lore entry',
        type: 'context' as const,
    },
    {
        command: '/extractcharacters',
        description: 'Extract character entries from text',
        type: 'context' as const,
    },
    {
        command: '/extractlocations',
        description: 'Extract location entries from text',
        type: 'context' as const,
    },
    {
        command: '/extractorganizations',
        description: 'Extract organization entries from text',
        type: 'context' as const,
    },
    {
        command: '/extractitems',
        description: 'Extract item entries from text',
        type: 'context' as const,
    },
    {
        command: '/extractlore',
        description: 'Extract lore entries from text',
        type: 'context' as const,
    },
    {
        command: '/extractall',
        description: 'Extract all entity types from text',
        type: 'context' as const,
    },
    {
        command: '/updatecompendium',
        description: 'Update existing entries from text',
        type: 'context' as const,
    },
    {
        command: '/analyzestructure',
        description: 'Analyze chapter and extract structure',
        type: 'context' as const,
        requiresChapter: true,
        chapterState: 'hasText' as const,
    },
    {
        command: '/generatestructure',
        description: 'Generate chapter structure from a pitch',
        type: 'context' as const,
        requiresChapter: true,
        chapterState: 'empty' as const,
    },
    {
        command: '/extractstructure',
        description: 'Extract structure from chapter text',
        type: 'context' as const,
        requiresChapter: true,
        chapterState: 'hasText' as const,
    },
    {
        command: '/modifystructure',
        description: 'Modify existing chapter structure',
        type: 'context' as const,
        requiresChapter: true,
        chapterState: 'hasStructure' as const,
    },
    {
        command: '/rewritestructure',
        description: 'Replace chapter structure entirely',
        type: 'context' as const,
        requiresChapter: true,
        chapterState: 'hasStructure' as const,
    },
];
