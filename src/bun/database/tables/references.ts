import { eq, asc } from 'drizzle-orm';

import { projectReferences } from '../../../shared/schema';
import type { NewReference, Reference } from '@/shared/types/project';
import type { SQLiteDB } from '@/shared/types/db';

export async function getReferencesByProject(
    db: SQLiteDB,
    projectId: string
): Promise<Reference[]> {
    const rows = await db
        .select()
        .from(projectReferences)
        .where(eq(projectReferences.projectId, projectId))
        .orderBy(asc(projectReferences.name));
    return rows;
}

export async function getReferencesByCategory(
    db: SQLiteDB,
    projectId: string,
    category: string
): Promise<Reference[]> {
    const rows = await db
        .select()
        .from(projectReferences)
        .where(eq(projectReferences.projectId, projectId))
        .orderBy(asc(projectReferences.name));
    return rows.filter((r) => r.category === category);
}

export async function getReferenceById(
    db: SQLiteDB,
    id: string
): Promise<Reference | undefined> {
    const result = await db
        .select()
        .from(projectReferences)
        .where(eq(projectReferences.id, id));
    return result[0];
}

export async function createReference(
    db: SQLiteDB,
    reference: NewReference
): Promise<Reference> {
    await db.insert(projectReferences).values(reference);
    return reference as Reference;
}

export async function updateReference(
    db: SQLiteDB,
    id: string,
    data: Partial<NewReference>
): Promise<Reference | undefined> {
    const updateData: Record<string, unknown> = {
        ...data,
        updatedAt: new Date(),
    };
    await db
        .update(projectReferences)
        .set(updateData)
        .where(eq(projectReferences.id, id));
    return getReferenceById(db, id);
}

export async function deleteReference(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(projectReferences).where(eq(projectReferences.id, id));
}
