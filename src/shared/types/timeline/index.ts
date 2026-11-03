export type timelineFilterBtn = {
    cat: 'manuscript' | 'compendium' | 'opened tabs';
    subCat?: {
        key: string;
        hasitem: boolean;
        checked: boolean;
    }[];
    hasitem: boolean;
    checked: boolean;
};

export type PlacedEvent = {
    id: string | number;
    col: number;
    row: number;
    title: string;
};
