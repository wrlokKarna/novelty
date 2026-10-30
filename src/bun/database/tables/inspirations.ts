import { eq, asc } from 'drizzle-orm';

import { inspirations } from '../../../shared/schema';
import type { Inspiration, NewInspiration } from '@/shared/types/project';
import type { SQLiteDB } from '@/shared/types/db';

function parseInspiration(row: Record<string, unknown>): Inspiration {
    return {
        ...row,
        inspiredAspects: row.inspiredAspects
            ? JSON.parse(row.inspiredAspects as string)
            : [],
        sourceYear: row.sourceYear ?? null,
    } as Inspiration;
}

export async function getInspirations(
    db: SQLiteDB,
    projectId: string
): Promise<Inspiration[]> {
    const rows = await db
        .select()
        .from(inspirations)
        .where(eq(inspirations.projectId, projectId))
        .orderBy(asc(inspirations.createdAt));
    return rows.map(parseInspiration);
}

export async function getInspirationById(
    db: SQLiteDB,
    id: string
): Promise<Inspiration | undefined> {
    const result = await db
        .select()
        .from(inspirations)
        .where(eq(inspirations.id, id));
    if (!result[0]) return undefined;
    return parseInspiration(result[0]);
}

export async function createInspiration(
    db: SQLiteDB,
    data: NewInspiration
): Promise<Inspiration> {
    const now = new Date();
    const row = {
        ...data,
        inspiredAspects: data.inspiredAspects.length
            ? JSON.stringify(data.inspiredAspects)
            : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(inspirations).values(row);
    return {
        ...row,
        inspiredAspects: data.inspiredAspects,
    } as Inspiration;
}

export async function updateInspiration(
    db: SQLiteDB,
    id: string,
    data: Partial<NewInspiration>
): Promise<Inspiration | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.sourceName !== undefined) updateData.sourceName = data.sourceName;
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
    if (data.sourceYear !== undefined) updateData.sourceYear = data.sourceYear;
    if (data.inspiredAspects !== undefined)
        updateData.inspiredAspects = data.inspiredAspects.length
            ? JSON.stringify(data.inspiredAspects)
            : null;
    if (data.inspiredNotes !== undefined)
        updateData.inspiredNotes = data.inspiredNotes;

    await db
        .update(inspirations)
        .set(updateData)
        .where(eq(inspirations.id, id));
    return getInspirationById(db, id);
}

export async function deleteInspiration(
    db: SQLiteDB,
    id: string
): Promise<void> {
    await db.delete(inspirations).where(eq(inspirations.id, id));
}
