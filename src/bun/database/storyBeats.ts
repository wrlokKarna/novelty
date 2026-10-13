import { db } from './index';
import { storyBeats } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type StoryBeat = {
    id: string;
    projectId: string | null;
    chapterId: string | null;
    beatType: string;
    title: string;
    description: string | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryBeat = Omit<StoryBeat, 'createdAt' | 'updatedAt'>;

function parseBeat(row: typeof storyBeats.$inferSelect): StoryBeat {
    return {
        id: row.id,
        projectId: row.projectId,
        chapterId: row.chapterId,
        beatType: row.beatType,
        title: row.title,
        description: row.description,
        orderIndex: row.orderIndex,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function getBeatsByProject(
    projectId: string
): Promise<StoryBeat[]> {
    const rows = await db
        .select()
        .from(storyBeats)
        .where(eq(storyBeats.projectId, projectId))
        .orderBy(asc(storyBeats.orderIndex));
    return rows.map(parseBeat);
}

export async function getBeatById(id: string): Promise<StoryBeat | undefined> {
    const result = await db
        .select()
        .from(storyBeats)
        .where(eq(storyBeats.id, id));
    if (!result[0]) return undefined;
    return parseBeat(result[0]);
}

export async function createBeat(beat: NewStoryBeat): Promise<StoryBeat> {
    const now = new Date();
    await db
        .insert(storyBeats)
        .values({ ...beat, createdAt: now, updatedAt: now });
    return { ...beat, createdAt: now, updatedAt: now };
}

export async function updateBeat(
    id: string,
    data: Partial<NewStoryBeat>
): Promise<StoryBeat | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.beatType !== undefined) updateData.beatType = data.beatType;
    if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    await db.update(storyBeats).set(updateData).where(eq(storyBeats.id, id));
    return getBeatById(id);
}

export async function deleteBeat(id: string): Promise<void> {
    await db.delete(storyBeats).where(eq(storyBeats.id, id));
}
