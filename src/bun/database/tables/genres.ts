import { eq, asc } from 'drizzle-orm';

import { genres } from '../../../shared/schema';
import type { Genre } from '@/shared/types/project';
import type { SQLiteDB } from '@/shared/types/db';

export async function getAllGenres(db: SQLiteDB): Promise<Genre[]> {
    const rows = await db.select().from(genres).orderBy(asc(genres.name));
    return rows;
}

export async function getGenreById(
    db: SQLiteDB,
    id: string
): Promise<Genre | undefined> {
    const result = await db.select().from(genres).where(eq(genres.id, id));
    return result[0];
}

export async function createGenre(
    db: SQLiteDB,
    name: string,
    isGlobal: boolean = false
): Promise<Genre> {
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const genre = {
        id,
        name,
        isGlobal,
        createdAt: new Date(),
    };
    await db.insert(genres).values(genre);
    return genre;
}

export async function deleteGenre(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(genres).where(eq(genres.id, id));
}
