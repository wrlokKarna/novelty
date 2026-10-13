import { db } from './index';
import { plotThreads, chapterPlotThreads } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type PlotThread = {
    id: string;
    projectId: string | null;
    name: string;
    description: string | null;
    threadType: string;
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

function parseThread(row: typeof plotThreads.$inferSelect): PlotThread {
    return {
        id: row.id,
        projectId: row.projectId,
        name: row.name,
        description: row.description,
        threadType: row.threadType,
        color: row.color,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function getThreadsByProject(
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
    id: string
): Promise<PlotThread | undefined> {
    const result = await db
        .select()
        .from(plotThreads)
        .where(eq(plotThreads.id, id));
    if (!result[0]) return undefined;
    return parseThread(result[0]);
}

export async function createThread(thread: NewPlotThread): Promise<PlotThread> {
    const now = new Date();
    await db
        .insert(plotThreads)
        .values({ ...thread, createdAt: now, updatedAt: now });
    return { ...thread, createdAt: now, updatedAt: now };
}

export async function updateThread(
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
    return getThreadById(id);
}

export async function deleteThread(id: string): Promise<void> {
    await db.delete(plotThreads).where(eq(plotThreads.id, id));
}

export async function getChapterThreads(
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
