import { db } from './index';
import { locations } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Location = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewLocation = Omit<Location, 'createdAt' | 'updatedAt'>;

function parseLocation(row: Record<string, unknown>): Location {
    return {
        ...row,
        templateData: row.templateData
            ? JSON.parse(row.templateData as string)
            : null,
    } as Location;
}

export async function getLocationsByProject(
    projectId: string
): Promise<Location[]> {
    const rows = await db
        .select()
        .from(locations)
        .where(eq(locations.projectId, projectId))
        .orderBy(asc(locations.name));
    return rows.map(parseLocation);
}

export async function getLocationById(
    id: string
): Promise<Location | undefined> {
    const result = await db
        .select()
        .from(locations)
        .where(eq(locations.id, id));
    if (!result[0]) return undefined;
    return parseLocation(result[0]);
}

export async function createLocation(location: NewLocation): Promise<Location> {
    const now = new Date();
    const newLoc = {
        ...location,
        templateData: location.templateData
            ? JSON.stringify(location.templateData)
            : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(locations).values(newLoc);
    return {
        ...newLoc,
        templateData: location.templateData || null,
    } as Location;
}

export async function updateLocation(
    id: string,
    data: Partial<NewLocation>
): Promise<Location | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.filePath !== undefined) updateData.filePath = data.filePath;
    if (data.templateData !== undefined)
        updateData.templateData = data.templateData
            ? JSON.stringify(data.templateData)
            : null;

    await db.update(locations).set(updateData).where(eq(locations.id, id));
    return getLocationById(id);
}

export async function deleteLocation(id: string): Promise<void> {
    await db.delete(locations).where(eq(locations.id, id));
}
