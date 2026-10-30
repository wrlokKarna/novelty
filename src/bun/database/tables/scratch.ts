import { eq } from 'drizzle-orm';

import { scratchNotes } from '../../../shared/schema';
import type { ScratchNote } from '@/shared/types/project';
import type { SQLiteDB } from '@/shared/types/db';

export async function getScratchNote(
    db: SQLiteDB,
    projectId: string
): Promise<ScratchNote | undefined> {
    const result = await db
        .select()
        .from(scratchNotes)
        .where(eq(scratchNotes.projectId, projectId));
    return result[0];
}

export async function saveScratchNote(
    db: SQLiteDB,
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
