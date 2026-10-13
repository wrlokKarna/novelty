import { db } from './index';
import { chapters, storyScenes, storySequences } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Chapter = {
    id: string;
    projectId: string | null;
    title: string;
    content: string | null;
    filePath: string | null;
    orderIndex: number;
    status: string;
    outline: string | null;
    povCharacterId: string | null;
    wordCountTarget: number | null;
    actId: string | null;
    sequenceId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewChapter = Omit<Chapter, 'createdAt' | 'updatedAt'>;

function parseChapter(row: Record<string, unknown>): Chapter {
    return {
        id: row.id as string,
        projectId: row.projectId as string | null,
        title: row.title as string,
        content: row.content as string | null,
        filePath: row.filePath as string | null,
        orderIndex: row.orderIndex as number,
        status: (row.status as string) || 'outline',
        outline: row.outline as string | null,
        povCharacterId: row.povCharacterId as string | null,
        wordCountTarget: row.wordCountTarget as number | null,
        actId: row.actId as string | null,
        sequenceId: row.sequenceId as string | null,
        createdAt: row.createdAt as Date,
        updatedAt: row.updatedAt as Date,
    };
}

export async function getChaptersByProject(
    projectId: string
): Promise<Chapter[]> {
    const rows = await db
        .select()
        .from(chapters)
        .where(eq(chapters.projectId, projectId))
        .orderBy(asc(chapters.orderIndex));
    return rows.map(parseChapter);
}

export async function getChapterById(id: string): Promise<Chapter | undefined> {
    const result = await db.select().from(chapters).where(eq(chapters.id, id));
    if (!result[0]) return undefined;
    return parseChapter(result[0]);
}

export async function createChapter(chapter: NewChapter): Promise<Chapter> {
    const now = new Date();
    const vals: Record<string, unknown> = {
        id: chapter.id,
        projectId: chapter.projectId,
        title: chapter.title,
        content: chapter.content,
        filePath: chapter.filePath,
        orderIndex: chapter.orderIndex,
        status: chapter.status || 'outline',
        outline: chapter.outline,
        povCharacterId: chapter.povCharacterId,
        wordCountTarget: chapter.wordCountTarget,
        actId: chapter.actId,
        sequenceId: chapter.sequenceId,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(chapters).values(vals as any);
    return parseChapter({
        ...chapter,
        createdAt: now,
        updatedAt: now,
        status: chapter.status || 'outline',
    });
}

export async function updateChapter(
    id: string,
    data: Partial<NewChapter>
): Promise<Chapter | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.filePath !== undefined) updateData.filePath = data.filePath;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.outline !== undefined) updateData.outline = data.outline;
    if (data.povCharacterId !== undefined)
        updateData.povCharacterId = data.povCharacterId;
    if (data.wordCountTarget !== undefined)
        updateData.wordCountTarget = data.wordCountTarget;
    if (data.actId !== undefined) updateData.actId = data.actId;
    if (data.sequenceId !== undefined) updateData.sequenceId = data.sequenceId;
    await db
        .update(chapters)
        .set(updateData as any)
        .where(eq(chapters.id, id));
    return getChapterById(id);
}

export async function deleteChapter(id: string): Promise<void> {
    await db.delete(storyScenes).where(eq(storyScenes.chapterId, id));
    await db.delete(storySequences).where(eq(storySequences.chapterId, id));
    await db.delete(chapters).where(eq(chapters.id, id));
}
