import { eq, asc } from 'drizzle-orm';

import { themes } from '../../../shared/schema';
import type { Theme } from '@/shared/types/project';
import type { SQLiteDB } from '@/shared/types/db';

export async function getAllThemes(db: SQLiteDB): Promise<Theme[]> {
    const rows = await db.select().from(themes).orderBy(asc(themes.name));
    return rows;
}

export async function getThemeById(
    db: SQLiteDB,
    id: string
): Promise<Theme | undefined> {
    const result = await db.select().from(themes).where(eq(themes.id, id));
    return result[0];
}

export async function createTheme(
    db: SQLiteDB,
    name: string,
    isGlobal: boolean = false
): Promise<Theme> {
    const id = name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
    const theme = {
        id,
        name,
        isGlobal,
        createdAt: new Date(),
    };
    await db.insert(themes).values(theme);
    return theme;
}

export async function deleteTheme(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(themes).where(eq(themes.id, id));
}
