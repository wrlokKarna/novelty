import { db } from './index';
import { tags } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Tag = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export async function getAllTags(): Promise<Tag[]> {
    const rows = await db.select().from(tags).orderBy(asc(tags.name));
    return rows;
}

export async function getTagById(id: string): Promise<Tag | undefined> {
    const result = await db.select().from(tags).where(eq(tags.id, id));
    return result[0];
}

export async function createTag(
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

export async function deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
}
