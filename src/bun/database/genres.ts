import { db } from './index';
import { genres } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Genre = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export async function getAllGenres(): Promise<Genre[]> {
    const rows = await db.select().from(genres).orderBy(asc(genres.name));
    return rows;
}

export async function getGenreById(id: string): Promise<Genre | undefined> {
    const result = await db.select().from(genres).where(eq(genres.id, id));
    return result[0];
}

export async function createGenre(
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

export async function deleteGenre(id: string): Promise<void> {
    await db.delete(genres).where(eq(genres.id, id));
}
