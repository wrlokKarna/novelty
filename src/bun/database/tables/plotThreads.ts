import { eq, asc } from 'drizzle-orm';

import { plotThreads, chapterPlotThreads } from '../../../shared/schema';
import type {
    ChapterPlotThread,
    NewPlotThread,
    PlotThread,
    PlotThreadType,
} from '@/shared/types/project/manuscript';
import type { SQLiteDB } from '@/shared/types/db';

function parseThread(row: typeof plotThreads.$inferSelect): PlotThread {
    return {
        id: row.id,
        projectId: row.projectId,
        name: row.name,
        description: row.description,
        threadType: row.threadType as PlotThreadType,
        color: row.color,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function getThreadsByProject(
    db: SQLiteDB,
    projectId: string
): Promise<PlotThread[]> {
    const rows = await db
        .select()
        .from(plotThreads)
        .where(eq(plotThreads.projectId, projectId))
        .orderBy(asc(plotThreads.name));
    return rows.map(parseThread);
}

export async function getThreadById(
    db: SQLiteDB,
    id: string
): Promise<PlotThread | undefined> {
    const result = await db
        .select()
        .from(plotThreads)
        .where(eq(plotThreads.id, id));
    if (!result[0]) return undefined;
    return parseThread(result[0]);
}

export async function createThread(
    db: SQLiteDB,
    thread: NewPlotThread
): Promise<PlotThread> {
    const now = new Date();
    await db
        .insert(plotThreads)
        .values({ ...thread, createdAt: now, updatedAt: now });
    return { ...thread, createdAt: now, updatedAt: now };
}

export async function updateThread(
    db: SQLiteDB,
    id: string,
    data: Partial<NewPlotThread>
): Promise<PlotThread | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.threadType !== undefined) updateData.threadType = data.threadType;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    await db.update(plotThreads).set(updateData).where(eq(plotThreads.id, id));
    return getThreadById(db, id);
}

export async function deleteThread(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(plotThreads).where(eq(plotThreads.id, id));
}

export async function getChapterThreads(
    db: SQLiteDB,
    chapterId: string
): Promise<ChapterPlotThread[]> {
    const rows = await db
        .select()
        .from(chapterPlotThreads)
        .where(eq(chapterPlotThreads.chapterId, chapterId));
    return rows.map((r) => ({
        chapterId: r.chapterId,
        plotThreadId: r.plotThreadId,
        intensity: r.intensity,
    }));
}

export async function setChapterThreads(
    db: SQLiteDB,
    chapterId: string,
    threads: { plotThreadId: string; intensity: number }[]
): Promise<void> {
    await db
        .delete(chapterPlotThreads)
        .where(eq(chapterPlotThreads.chapterId, chapterId));
    if (threads.length > 0) {
        await db.insert(chapterPlotThreads).values(
            threads.map((t) => ({
                chapterId,
                plotThreadId: t.plotThreadId,
                intensity: t.intensity,
            }))
        );
    }
}
