import { eq, asc } from 'drizzle-orm';

import { tags } from '../../../shared/schema';
import type { Tag } from '@/shared/types/project';
import type { SQLiteDB } from '@/shared/types/db';

export async function getAllTags(db: SQLiteDB): Promise<Tag[]> {
    const rows = await db.select().from(tags).orderBy(asc(tags.name));
    return rows;
}

export async function getTagById(
    db: SQLiteDB,
    id: string
): Promise<Tag | undefined> {
    const result = await db.select().from(tags).where(eq(tags.id, id));
    return result[0];
}

export async function createTag(
    db: SQLiteDB,
    name: string,
    isGlobal: boolean = false
): Promise<Tag> {
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const tag = {
        id,
        name,
        isGlobal,
        createdAt: new Date(),
    };
    await db.insert(tags).values(tag);
    return tag;
}

export async function deleteTag(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
}
