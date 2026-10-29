export type PlotThreadType =
    'main' | 'subplot' | 'character-arc' | 'mystery' | 'romance' | 'thematic';

export type PlotThread = {
    id: string;
    projectId: string | null;
    name: string;
    description: string | null;
    threadType: PlotThreadType;
    color: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NewPlotThread = Omit<PlotThread, 'createdAt' | 'updatedAt'>;

export type ChapterPlotThread = {
    chapterId: string;
    plotThreadId: string;
    intensity: number;
};
