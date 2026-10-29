import type { SeriesArchitecture } from './series';

export type ProjectScope = 'fast_paced' | 'standard' | 'epic';

export type PointOfView = 'single' | 'multiple' | 'omniscient';

export type PacingType = 'fast_paced' | 'balanced' | 'deep_dive';

export type WorkType =
    | 'original'
    | 'fanfiction'
    | 'adaptation'
    | 'derivative'
    | 'parody'
    | 'translation'
    | 'transformative';

export type ProjectStructure =
    | 'oneshot'
    | 'standalone'
    | 'serials'
    | 'episodic'
    | 'anthology'
    | 'series'
    | 'seasonal';

export type TargetAgeGroup =
    'children' | 'middle_grade' | 'young_adult' | 'new_adult' | 'adult';

export type ProjectStatus =
    'planning' | 'drafting' | 'revising' | 'completed' | 'hiatus' | 'published';

export type Project = {
    id: string;
    name: string;
    path: string | null;
    metadata: string | null;
    description: string | null;
    systemPrompt: string | null;
    coverImageId: string | null;
    coverImagesArray: string[];
    projectScope: ProjectScope | null;
    seriesArch: SeriesArchitecture | null;
    seriesId: string | null;
    pov: PointOfView | null;
    pacing: PacingType | null;
    workType: WorkType | null;
    projectStructure: ProjectStructure | null;
    targetAge: TargetAgeGroup | null;
    projectStatus: ProjectStatus;
    tonalType: string | null;
    contentRating: string;
    primaryGenre: string | null;
    primaryTheme: string | null;
    genres: string[];
    tags: string[];
    themes: string[];
    createdAt: Date;
    updatedAt: Date;
};

export type TemplateFieldRecord = {
    name: string;
    type: string;
    treeRelations?: { relation: string; inverse: string }[];
    disabled?: boolean;
    [key: string]: unknown;
};

export type NewProject = Omit<Project, 'createdAt' | 'updatedAt'>;

export type ChapterStatus = 'outline' | 'draft' | 'revision' | 'done';

export type StoryAct = {
    id: string;
    projectId: string | null;
    title: string;
    summary: string | null;
    orderIndex: number;
    actNumber: number;
    status: ChapterStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryAct = Omit<StoryAct, 'createdAt' | 'updatedAt'>;

export type StorySequence = {
    id: string;
    actId: string | null;
    chapterId: string | null;
    projectId: string | null;
    title: string;
    summary: string | null;
    orderIndex: number;
    displayOrder: number;
    status: ChapterStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStorySequence = Omit<StorySequence, 'createdAt' | 'updatedAt'>;

export type Asset = {
    id: string;
    projectId: string | null;
    name: string;
    type: string;
    path: string | null;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewAsset = Omit<Asset, 'createdAt' | 'updatedAt'>;

export type Location = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewLocation = Omit<Location, 'createdAt' | 'updatedAt'>;

export type Item = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewItem = Omit<Item, 'createdAt' | 'updatedAt'>;

export type WordCountTarget = {
    min: number | null;
    max: number | null;
    label: string;
};
