import { db } from './index';
import { loreEntries } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type LoreEntry = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewLoreEntry = Omit<LoreEntry, 'createdAt' | 'updatedAt'>;

export async function getLoreEntriesByProject(
    projectId: string
): Promise<LoreEntry[]> {
    const rows = await db
        .select()
        .from(loreEntries)
        .where(eq(loreEntries.projectId, projectId))
        .orderBy(asc(loreEntries.name));
    return rows.map((r) => ({
        ...r,
        templateData: r.templateData ? JSON.parse(r.templateData) : null,
    }));
}

export async function getLoreEntryById(
    id: string
): Promise<LoreEntry | undefined> {
    const result = await db
        .select()
        .from(loreEntries)
        .where(eq(loreEntries.id, id));
    if (!result[0]) return undefined;
    const r = result[0];
    return {
        ...r,
        templateData: r.templateData ? JSON.parse(r.templateData) : null,
    };
}

export async function createLoreEntry(entry: NewLoreEntry): Promise<LoreEntry> {
    const now = new Date();
    const newEntry = {
        ...entry,
        templateData: entry.templateData
            ? JSON.stringify(entry.templateData)
            : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(loreEntries).values(newEntry);
    return {
        ...newEntry,
        templateData: entry.templateData || null,
    };
}

export async function updateLoreEntry(
    id: string,
    data: Partial<NewLoreEntry>
): Promise<LoreEntry | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.filePath !== undefined) updateData.filePath = data.filePath;
    if (data.templateData !== undefined)
        updateData.templateData = data.templateData
            ? JSON.stringify(data.templateData)
            : null;

    await db.update(loreEntries).set(updateData).where(eq(loreEntries.id, id));
    return getLoreEntryById(id);
}

export async function deleteLoreEntry(id: string): Promise<void> {
    await db.delete(loreEntries).where(eq(loreEntries.id, id));
}
