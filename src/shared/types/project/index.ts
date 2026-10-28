import { ChapterStatus } from '..';

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
