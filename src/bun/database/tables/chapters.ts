import { eq, asc } from 'drizzle-orm';

import { chapters, storyScenes, storySequences } from '../../../shared/schema';
import type { Chapter, NewChapter } from '@/shared/types/project';
import type { ChapterStatus } from '@/shared/types';
import type { SQLiteDB } from '@/shared/types/db';

function parseChapter(row: Record<string, unknown>): Chapter {
    return {
        id: row.id as string,
        projectId: row.projectId as string | null,
        title: row.title as string,
        content: row.content as string | null,
        filePath: row.filePath as string | null,
        orderIndex: row.orderIndex as number,
        status: (row.status as ChapterStatus) || 'outline',
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
    db: SQLiteDB,
    projectId: string
): Promise<Chapter[]> {
    const rows = await db
        .select()
        .from(chapters)
        .where(eq(chapters.projectId, projectId))
        .orderBy(asc(chapters.orderIndex));
    return rows.map(parseChapter);
}

export async function getChapterById(
    db: SQLiteDB,
    id: string
): Promise<Chapter | undefined> {
    const result = await db.select().from(chapters).where(eq(chapters.id, id));
    if (!result[0]) return undefined;
    return parseChapter(result[0]);
}

export async function createChapter(
    db: SQLiteDB,
    chapter: NewChapter
): Promise<Chapter> {
    const now = new Date();
    const vals: Chapter = {
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
    await db.insert(chapters).values(vals);
    return parseChapter({
        ...chapter,
        createdAt: now,
        updatedAt: now,
        status: chapter.status || 'outline',
    });
}

export async function updateChapter(
    db: SQLiteDB,
    id: string,
    data: Partial<NewChapter>
): Promise<Chapter | undefined> {
    const updateData: Partial<Chapter> = { updatedAt: new Date() };

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

    await db.update(chapters).set(updateData).where(eq(chapters.id, id));

    return getChapterById(db, id);
}

export async function deleteChapter(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(storyScenes).where(eq(storyScenes.chapterId, id));
    await db.delete(storySequences).where(eq(storySequences.chapterId, id));
    await db.delete(chapters).where(eq(chapters.id, id));
}
