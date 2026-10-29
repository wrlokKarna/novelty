import type { ChapterStatus } from '..';

export type Chapter = {
    id: string;
    projectId: string | null;
    title: string;
    content: string | null;
    filePath: string | null;
    orderIndex: number;
    status: ChapterStatus;
    outline: string | null;
    povCharacterId: string | null;
    wordCountTarget: number | null;
    actId: string | null;
    sequenceId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewChapter = Omit<Chapter, 'createdAt' | 'updatedAt'>;

export type Genre = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export type SourceType =
    | 'book'
    | 'movie'
    | 'tv_show'
    | 'game'
    | 'anime'
    | 'manga'
    | 'web_novel'
    | 'web_series'
    | 'comic'
    | 'mythology'
    | 'history'
    | 'other';

export const PREDEFINED_ASPECTS = [
    'atmosphere',
    'characters',
    'story_arc',
    'worldbuilding',
    'themes',
    'prose_style',
    'magic_system',
    'dialogue',
    'pacing',
    'aesthetic',
] as const;

export type InspiredAspect = (typeof PREDEFINED_ASPECTS)[number] | string;

export type Inspiration = {
    id: string;
    projectId: string;
    sourceName: string;
    sourceType: SourceType;
    sourceYear: number | null;
    inspiredAspects: string[];
    inspiredNotes: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NewInspiration = Omit<Inspiration, 'createdAt' | 'updatedAt'>;

export type Reference = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    category: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewReference = Omit<Reference, 'createdAt' | 'updatedAt'>;

export type ScratchNote = {
    id: string;
    projectId: string | null;
    content: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type Tag = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export type Theme = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};
