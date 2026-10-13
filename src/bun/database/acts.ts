import { db } from './index';
import { storyActs, storySequences, storyScenes } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type StoryAct = {
    id: string;
    projectId: string | null;
    title: string;
    summary: string | null;
    orderIndex: number;
    actNumber: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryAct = Omit<StoryAct, 'createdAt' | 'updatedAt'>;

export type StorySequence = {
    id: string;
    actId: string | null;
    chapterId: string | null;
    projectId: string | null;
    title: string;
    summary: string | null;
    orderIndex: number;
    displayOrder: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStorySequence = Omit<StorySequence, 'createdAt' | 'updatedAt'>;

function parseAct(row: typeof storyActs.$inferSelect): StoryAct {
    return {
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        summary: row.summary,
        orderIndex: row.orderIndex,
        actNumber: row.actNumber,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

function parseSequence(row: typeof storySequences.$inferSelect): StorySequence {
    return {
        id: row.id,
        actId: row.actId,
        chapterId: row.chapterId,
        projectId: row.projectId,
        title: row.title,
        summary: row.summary,
        orderIndex: row.orderIndex,
        displayOrder: row.displayOrder,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function getActsByProject(projectId: string): Promise<StoryAct[]> {
    const rows = await db
        .select()
        .from(storyActs)
        .where(eq(storyActs.projectId, projectId))
        .orderBy(asc(storyActs.orderIndex));
    return rows.map(parseAct);
}

export async function getActById(id: string): Promise<StoryAct | undefined> {
    const result = await db
        .select()
        .from(storyActs)
        .where(eq(storyActs.id, id));
    if (!result[0]) return undefined;
    return parseAct(result[0]);
}

export async function createAct(act: NewStoryAct): Promise<StoryAct> {
    const now = new Date();
    await db
        .insert(storyActs)
        .values({ ...act, createdAt: now, updatedAt: now });
    return { ...act, createdAt: now, updatedAt: now };
}

export async function updateAct(
    id: string,
    data: Partial<NewStoryAct>
): Promise<StoryAct | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.actNumber !== undefined) updateData.actNumber = data.actNumber;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    await db.update(storyActs).set(updateData).where(eq(storyActs.id, id));
    return getActById(id);
}

export async function deleteAct(id: string): Promise<void> {
    await db.delete(storyScenes).where(eq(storyScenes.actId, id));
    await db.delete(storySequences).where(eq(storySequences.actId, id));
    await db.delete(storyActs).where(eq(storyActs.id, id));
}

export async function getSequencesByProject(
    projectId: string
): Promise<StorySequence[]> {
    const rows = await db
        .select()
        .from(storySequences)
        .where(eq(storySequences.projectId, projectId))
        .orderBy(asc(storySequences.orderIndex));
    return rows.map(parseSequence);
}

export async function getSequencesByAct(
    actId: string
): Promise<StorySequence[]> {
    const rows = await db
        .select()
        .from(storySequences)
        .where(eq(storySequences.actId, actId))
        .orderBy(asc(storySequences.orderIndex));
    return rows.map(parseSequence);
}

export async function getSequencesByChapter(
    chapterId: string
): Promise<StorySequence[]> {
    const rows = await db
        .select()
        .from(storySequences)
        .where(eq(storySequences.chapterId, chapterId))
        .orderBy(asc(storySequences.orderIndex));
    return rows.map(parseSequence);
}

export async function getSequenceById(
    id: string
): Promise<StorySequence | undefined> {
    const result = await db
        .select()
        .from(storySequences)
        .where(eq(storySequences.id, id));
    if (!result[0]) return undefined;
    return parseSequence(result[0]);
}

export async function createSequence(
    seq: NewStorySequence
): Promise<StorySequence> {
    const now = new Date();
    await db
        .insert(storySequences)
        .values({ ...seq, createdAt: now, updatedAt: now });
    return { ...seq, createdAt: now, updatedAt: now };
}

export async function updateSequence(
    id: string,
    data: Partial<NewStorySequence>
): Promise<StorySequence | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.displayOrder !== undefined)
        updateData.displayOrder = data.displayOrder;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.actId !== undefined) updateData.actId = data.actId;
    if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    await db
        .update(storySequences)
        .set(updateData)
        .where(eq(storySequences.id, id));
    return getSequenceById(id);
}

export async function deleteSequence(id: string): Promise<void> {
    await db.delete(storyScenes).where(eq(storyScenes.sequenceId, id));
    await db.delete(storySequences).where(eq(storySequences.id, id));
}

export async function reorderActs(
    updates: { id: string; orderIndex: number }[]
): Promise<void> {
    await db.transaction(async (tx) => {
        for (const update of updates) {
            await tx
                .update(storyActs)
                .set({ orderIndex: update.orderIndex, updatedAt: new Date() })
                .where(eq(storyActs.id, update.id));
        }
    });
}

export async function reorderSequences(
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
                .update(storySequences)
                .set(data)
                .where(eq(storySequences.id, update.id));
        }
    });
}
