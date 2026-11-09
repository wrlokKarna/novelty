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

// A lane ("row") in the new timeline grid. One lane per data item the user
// selected in the timeline dock; columns are date periods.
export type TimelineLane = {
    key: string; // `${section}::${id}` — matches the dock's selectedItems keys
    section: string;
    id: string;
    label: string;
};

// An event the user added but has not placed on the grid yet. Kept in
// localStorage per project so the unassigned tray survives closing the dialog.
export type TimelineEventDraft = {
    id: string;
    title: string;
    description: string | null;
    inStoryDate: string | null;
    dateOrder: number;
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    chapterId: string | null;
};

// Item shown in the dock's unassigned tray.
export type TimelineTrayItem = {
    id: string;
    label: string;
};
