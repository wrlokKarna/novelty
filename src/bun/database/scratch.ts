import { db } from './index';
import { scratchNotes } from '../schema';
import { eq } from 'drizzle-orm';

export type ScratchNote = {
    id: string;
    projectId: string | null;
    content: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export async function getScratchNote(
    projectId: string
): Promise<ScratchNote | undefined> {
    const result = await db
        .select()
        .from(scratchNotes)
        .where(eq(scratchNotes.projectId, projectId));
    return result[0];
}

export async function saveScratchNote(
    projectId: string,
    content: string
): Promise<ScratchNote> {
    const now = new Date();

    await db
        .insert(scratchNotes)
        .values({
            id: projectId,
            projectId,
            content,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: scratchNotes.id,
            set: { content, updatedAt: now },
        });

    return {
        id: projectId,
        projectId,
        content,
        createdAt: now,
        updatedAt: now,
    };
}
