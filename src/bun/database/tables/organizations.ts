import { eq, asc } from 'drizzle-orm';

import { organizations } from '../../../shared/schema';
import type {
    Organization,
    NewOrganization,
} from '@/shared/types/project/compendium';
import type { SQLiteDB } from '@/shared/types/db';

function parseOrganization(row: Record<string, unknown>): Organization {
    return {
        ...row,
        templateData: row.templateData
            ? JSON.parse(row.templateData as string)
            : null,
    } as Organization;
}

export async function getOrganizationsByProject(
    db: SQLiteDB,
    projectId: string
): Promise<Organization[]> {
    const rows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.projectId, projectId))
        .orderBy(asc(organizations.name));
    return rows.map(parseOrganization);
}

export async function getOrganizationById(
    db: SQLiteDB,
    id: string
): Promise<Organization | undefined> {
    const result = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, id));
    if (!result[0]) return undefined;
    return parseOrganization(result[0]);
}

export async function createOrganization(
    db: SQLiteDB,
    organization: NewOrganization
): Promise<Organization> {
    const now = new Date();
    const newOrg = {
        ...organization,
        templateData: organization.templateData
            ? JSON.stringify(organization.templateData)
            : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(organizations).values(newOrg);
    return {
        ...newOrg,
        templateData: organization.templateData || null,
    } as Organization;
}

export async function updateOrganization(
    db: SQLiteDB,
    id: string,
    data: Partial<NewOrganization>
): Promise<Organization | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.filePath !== undefined) updateData.filePath = data.filePath;
    if (data.templateData !== undefined)
        updateData.templateData = data.templateData
            ? JSON.stringify(data.templateData)
            : null;

    await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, id));
    return getOrganizationById(db, id);
}

export async function deleteOrganization(
    db: SQLiteDB,
    id: string
): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
}
