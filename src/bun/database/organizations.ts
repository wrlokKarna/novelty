import { db } from './index';
import { organizations } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Organization = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewOrganization = Omit<Organization, 'createdAt' | 'updatedAt'>;

function parseOrganization(row: Record<string, unknown>): Organization {
    return {
        ...row,
        templateData: row.templateData
            ? JSON.parse(row.templateData as string)
            : null,
    } as Organization;
}

export async function getOrganizationsByProject(
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
    return getOrganizationById(id);
}

export async function deleteOrganization(id: string): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
}
