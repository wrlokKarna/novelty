import { ChapterStatus } from '../..';

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

export type StoryScene = {
    id: string;
    projectId: string | null;
    actId: string | null;
    sequenceId: string | null;
    chapterId: string | null;
    title: string;
    summary: string | null;
    setting: string | null;
    charactersPresent: string | null;
    keyEvents: string | null;
    duration: string | null;
    conflict: string | null;
    status: ChapterStatus;
    orderIndex: number;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryScene = Omit<StoryScene, 'createdAt' | 'updatedAt'>;
