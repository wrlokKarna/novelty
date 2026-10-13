import { db } from './index';
import { themes } from '../schema';
import { eq, asc } from 'drizzle-orm';
import type { Theme } from '../../mainview/types';

export async function getAllThemes(): Promise<Theme[]> {
    const rows = await db.select().from(themes).orderBy(asc(themes.name));
    return rows;
}

export async function getThemeById(id: string): Promise<Theme | undefined> {
    const result = await db.select().from(themes).where(eq(themes.id, id));
    return result[0];
}

export async function createTheme(
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

export async function deleteTheme(id: string): Promise<void> {
    await db.delete(themes).where(eq(themes.id, id));
}
