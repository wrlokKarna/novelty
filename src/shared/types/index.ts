export type ProjectScope = 'fast_paced' | 'standard' | 'epic';

export type SeriesArchitecture =
    'standalone' | 'duology' | 'trilogy' | 'ongoing';

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
