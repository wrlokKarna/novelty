export const EVENT_COLORS: Record<string, string> = {
    chapter: '#4a9eff',
    character_introduction: '#4ae04a',
    character_death: '#e04a4a',
    character_transformation: '#e0a04a',
    organization_founding: '#d4a853',
    organization_dissolution: '#8b0000',
    battle: '#e04ae0',
    relationship: '#4ae0e0',
    travel: '#a0a0a0',
    milestone: '#e0e04a',
    custom: '#888888',
};

export const EVENT_LABELS: Record<string, string> = {
    chapter: 'Chapter',
    character_introduction: 'Intro',
    character_death: 'Death',
    character_transformation: 'Transform',
    organization_founding: 'Founded',
    organization_dissolution: 'Dissolved',
    battle: 'Battle',
    relationship: 'Relationship',
    travel: 'Travel',
    milestone: 'Milestone',
    custom: 'Custom',
};

export const ENTITY_SECTIONS = [
    'character',
    'location',
    'organization',
    'item',
    'lore',
];

export const COLUMN_WIDTH = 100;
export const ROW_HEIGHT = 64;
export const BUFFER_SIZE = 10;

export const BASE_ORDER_MS = Date.UTC(2000, 0, 1);

export const DAY_MS = 86400000;
