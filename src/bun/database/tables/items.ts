import { eq, asc } from 'drizzle-orm';

import { items } from '../../../shared/schema';
import type { Item, NewItem } from '@/shared/types';
import type { SQLiteDB } from '@/shared/types/db';

function parseItem(row: Record<string, unknown>): Item {
    return {
        ...row,
        templateData: row.templateData
            ? JSON.parse(row.templateData as string)
            : null,
    } as Item;
}

export async function getItemsByProject(
    db: SQLiteDB,
    projectId: string
): Promise<Item[]> {
    const rows = await db
        .select()
        .from(items)
        .where(eq(items.projectId, projectId))
        .orderBy(asc(items.name));
    return rows.map(parseItem);
}

export async function getItemById(
    db: SQLiteDB,
    id: string
): Promise<Item | undefined> {
    const result = await db.select().from(items).where(eq(items.id, id));
    if (!result[0]) return undefined;
    return parseItem(result[0]);
}

export async function createItem(db: SQLiteDB, item: NewItem): Promise<Item> {
    const now = new Date();
    const newItem = {
        ...item,
        templateData: item.templateData
            ? JSON.stringify(item.templateData)
            : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(items).values(newItem);
    return {
        ...newItem,
        templateData: item.templateData || null,
    } as Item;
}

export async function updateItem(
    db: SQLiteDB,
    id: string,
    data: Partial<NewItem>
): Promise<Item | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.filePath !== undefined) updateData.filePath = data.filePath;
    if (data.templateData !== undefined)
        updateData.templateData = data.templateData
            ? JSON.stringify(data.templateData)
            : null;

    await db.update(items).set(updateData).where(eq(items.id, id));
    return getItemById(db, id);
}

export async function deleteItem(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
}
