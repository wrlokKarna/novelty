import {
    ProjectScope,
    SeriesArchitecture,
    PointOfView,
    PacingType,
    WorkType,
    ProjectStructure,
    TargetAgeGroup,
    ProjectStatus,
} from '../types';

export const projectScopes: { value: ProjectScope; label: string }[] = [
    { value: 'fast_paced', label: 'Fast-Paced / Pulp' },
    { value: 'standard', label: 'Standard Novel' },
    { value: 'epic', label: 'Epic / Sprawling' },
];

export const seriesOptions: { value: SeriesArchitecture; label: string }[] = [
    { value: 'standalone', label: 'Standalone' },
    { value: 'duology', label: 'Duology' },
    { value: 'trilogy', label: 'Trilogy' },
    { value: 'ongoing', label: 'Ongoing' },
];

export const povOptions: { value: PointOfView; label: string }[] = [
    { value: 'single', label: 'Single POV' },
    { value: 'multiple', label: 'Multiple POV' },
    { value: 'omniscient', label: 'Omniscient' },
];

export const pacingOptions: { value: PacingType; label: string }[] = [
    { value: 'fast_paced', label: 'Fast Paced' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'deep_dive', label: 'Deep Dive' },
];

export const workTypeOptions: { value: WorkType; label: string }[] = [
    { value: 'original', label: 'Original Work' },
    { value: 'fanfiction', label: 'Fan Fiction' },
    { value: 'adaptation', label: 'Adaptation' },
    { value: 'derivative', label: 'Derivative' },
    { value: 'parody', label: 'Parody' },
    { value: 'translation', label: 'Translation' },
    { value: 'transformative', label: 'Transformative' },
];

export const projectStructureOptions: {
    value: ProjectStructure;
    label: string;
}[] = [
    { value: 'oneshot', label: 'One-shot' },
    { value: 'standalone', label: 'Standalone' },
    { value: 'serials', label: 'Serials' },
    { value: 'episodic', label: 'Episodic' },
    { value: 'anthology', label: 'Anthology' },
    { value: 'series', label: 'Series' },
    { value: 'seasonal', label: 'Seasonal' },
];

export const targetAgeOptions: { value: TargetAgeGroup; label: string }[] = [
    { value: 'children', label: 'Children' },
    { value: 'middle_grade', label: 'Middle Grade' },
    { value: 'young_adult', label: 'Young Adult (YA)' },
    { value: 'new_adult', label: 'New Adult (NA)' },
    { value: 'adult', label: 'Adult' },
];

export const projectStatusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'planning', label: 'Planning' },
    { value: 'drafting', label: 'Drafting' },
    { value: 'revising', label: 'Revising' },
    { value: 'completed', label: 'Completed' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'published', label: 'Published' },
];

export const contentRatingOptions: { value: string; label: string }[] = [
    { value: 'G', label: 'G — General Audiences' },
    { value: 'PG', label: 'PG — Parental Guidance' },
    { value: 'PG-13', label: 'PG-13 — Teens 13+' },
    { value: 'R', label: 'R — Restricted' },
    { value: 'NC-17', label: 'NC-17 — Adults Only' },
    { value: 'Unrated', label: 'Unrated' },
];

export const sourceTypeOptions = [
    { value: 'book', label: 'Book' },
    { value: 'movie', label: 'Movie' },
    { value: 'tv_show', label: 'TV Show' },
    { value: 'game', label: 'Game' },
    { value: 'anime', label: 'Anime' },
    { value: 'manga', label: 'Manga' },
    { value: 'web_novel', label: 'Web Novel' },
    { value: 'web_series', label: 'Web Series' },
    { value: 'comic', label: 'Comic' },
    { value: 'mythology', label: 'Mythology' },
    { value: 'history', label: 'History' },
    { value: 'other', label: 'Other' },
];
