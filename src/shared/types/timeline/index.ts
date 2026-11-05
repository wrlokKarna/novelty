import type { CompendiumCategory } from '../project/compendium';

export type TimeLineChip =
    | CompendiumCategory
    | 'chapters'
    | 'acts'
    | 'plot threads'
    | 'story beats'
    | 'key events'
    | 'plot points';
export type timelineFilterBtn = {
    cat: 'manuscript' | 'compendium' | 'opened tabs';
    subCat?: {
        key: TimeLineChip;
        hasitem: boolean;
        checked: boolean;
    }[];
    hasitem: boolean;
    checked: boolean;
};

export type TimelineDataItem = {
    id: string;
    label: string;
};

export type PlacedEvent = {
    id: string | number;
    col: number;
    row: number;
    title: string;
    entityKeys?: string[];
};
