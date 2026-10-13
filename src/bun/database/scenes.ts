import { db } from './index';
import { storyScenes } from '../schema';
import { eq, asc } from 'drizzle-orm';

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
    status: string;
    orderIndex: number;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryScene = Omit<StoryScene, 'createdAt' | 'updatedAt'>;

function parseScene(row: typeof storyScenes.$inferSelect): StoryScene {
    return {
        id: row.id,
        projectId: row.projectId,
        actId: row.actId,
        sequenceId: row.sequenceId,
        chapterId: row.chapterId,
        title: row.title,
        summary: row.summary,
        setting: row.setting,
        charactersPresent: row.charactersPresent,
        keyEvents: row.keyEvents,
        duration: row.duration,
        conflict: row.conflict,
        status: row.status,
        orderIndex: row.orderIndex,
        displayOrder: row.displayOrder,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function getScenesByProject(
    projectId: string
): Promise<StoryScene[]> {
    const rows = await db
        .select()
        .from(storyScenes)
        .where(eq(storyScenes.projectId, projectId))
        .orderBy(asc(storyScenes.orderIndex));
    return rows.map(parseScene);
}

export async function getSceneById(
    id: string
): Promise<StoryScene | undefined> {
    const result = await db
        .select()
        .from(storyScenes)
        .where(eq(storyScenes.id, id));
    if (!result[0]) return undefined;
    return parseScene(result[0]);
}

export async function getScenesBySequence(
    sequenceId: string
): Promise<StoryScene[]> {
    const rows = await db
        .select()
        .from(storyScenes)
        .where(eq(storyScenes.sequenceId, sequenceId))
        .orderBy(asc(storyScenes.orderIndex));
    return rows.map(parseScene);
}

export async function getScenesByChapter(
    chapterId: string
): Promise<StoryScene[]> {
    const rows = await db
        .select()
        .from(storyScenes)
        .where(eq(storyScenes.chapterId, chapterId))
        .orderBy(asc(storyScenes.orderIndex));
    return rows.map(parseScene);
}

export async function createScene(scene: NewStoryScene): Promise<StoryScene> {
    const now = new Date();
    await db
        .insert(storyScenes)
        .values({ ...scene, createdAt: now, updatedAt: now });
    return { ...scene, createdAt: now, updatedAt: now };
}

export async function updateScene(
    id: string,
    data: Partial<NewStoryScene>
): Promise<StoryScene | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.setting !== undefined) updateData.setting = data.setting;
    if (data.charactersPresent !== undefined)
        updateData.charactersPresent = data.charactersPresent;
    if (data.keyEvents !== undefined) updateData.keyEvents = data.keyEvents;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.conflict !== undefined) updateData.conflict = data.conflict;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.displayOrder !== undefined)
        updateData.displayOrder = data.displayOrder;
    if (data.actId !== undefined) updateData.actId = data.actId;
    if (data.sequenceId !== undefined) updateData.sequenceId = data.sequenceId;
    if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    await db.update(storyScenes).set(updateData).where(eq(storyScenes.id, id));
    return getSceneById(id);
}

export async function deleteScene(id: string): Promise<void> {
    await db.delete(storyScenes).where(eq(storyScenes.id, id));
}

export async function reorderScenes(
    updates: { id: string; orderIndex: number; displayOrder?: number }[]
): Promise<void> {
    await db.transaction(async (tx) => {
        for (const update of updates) {
            const data: Record<string, unknown> = {
                orderIndex: update.orderIndex,
                updatedAt: new Date(),
            };
            if (update.displayOrder !== undefined)
                data.displayOrder = update.displayOrder;
            await tx
                .update(storyScenes)
                .set(data)
                .where(eq(storyScenes.id, update.id));
        }
    });
}

export async function moveScene(
    id: string,
    data: {
        sequenceId?: string | null;
        chapterId?: string | null;
        actId?: string | null;
        orderIndex?: number;
        displayOrder?: number;
    }
): Promise<StoryScene | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.sequenceId !== undefined) updateData.sequenceId = data.sequenceId;
    if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
    if (data.actId !== undefined) updateData.actId = data.actId;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.displayOrder !== undefined)
        updateData.displayOrder = data.displayOrder;
    await db.update(storyScenes).set(updateData).where(eq(storyScenes.id, id));
    return getSceneById(id);
}
