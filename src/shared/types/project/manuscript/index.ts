import type { ChapterStatus } from '../..';

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

export type StoryBeatType =
    | 'opening-image'
    | 'theme-stated'
    | 'setup'
    | 'catalyst'
    | 'debate'
    | 'break-into-two'
    | 'b-story'
    | 'fun-and-games'
    | 'midpoint'
    | 'bad-guys-close-in'
    | 'all-is-lost'
    | 'dark-night-of-soul'
    | 'break-into-three'
    | 'climax'
    | 'falling-action'
    | 'finale'
    | 'final-image'
    | 'custom';

export type StoryBeat = {
    id: string;
    projectId: string | null;
    chapterId: string | null;
    beatType: StoryBeatType;
    title: string;
    description: string | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryBeat = Omit<StoryBeat, 'createdAt' | 'updatedAt'>;

export type SceneOutline = {
    id: string;
    title: string;
    summary: string;
    setting: string;
    charactersPresent: string[];
    keyEvents: string[];
    duration: string | null;
    conflict: string | null;
};

export type ChapterOutlineData = {
    summary: string;
    scenes: SceneOutline[];
    keyEvents: string[];
    notes: string;
};
