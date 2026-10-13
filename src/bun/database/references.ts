import { db } from './index';
import { projectReferences } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Reference = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    category: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewReference = Omit<Reference, 'createdAt' | 'updatedAt'>;

export async function getReferencesByProject(
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
    id: string
): Promise<Reference | undefined> {
    const result = await db
        .select()
        .from(projectReferences)
        .where(eq(projectReferences.id, id));
    return result[0];
}

export async function createReference(
    reference: NewReference
): Promise<Reference> {
    await db.insert(projectReferences).values(reference);
    return reference as Reference;
}

export async function updateReference(
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
    return getReferenceById(id);
}

export async function deleteReference(id: string): Promise<void> {
    await db.delete(projectReferences).where(eq(projectReferences.id, id));
}
