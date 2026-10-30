import { eq, asc } from 'drizzle-orm';

import { series, projects } from '../../../shared/schema';
import type {
    NewSeries,
    Series,
    SeriesArchitecture,
} from '@/shared/types/series';
import type { SQLiteDB } from '@/shared/types/db';
import type { Project } from '@/shared/types';

function parseSeries(row: typeof series.$inferSelect): Series {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        seriesArch: (row.seriesArch || null) as SeriesArchitecture | null,
        coverImageId: row.coverImageId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function listSeries(db: SQLiteDB): Promise<Series[]> {
    const rows = await db.select().from(series).orderBy(asc(series.updatedAt));
    const result: Series[] = [];
    for (const row of rows) {
        const s = parseSeries(row);
        const countResult = await db
            .select({ count: projects.id })
            .from(projects)
            .where(eq(projects.seriesId, row.id));
        s.projectCount = countResult.length;
        result.push(s);
    }
    return result;
}

export async function getSeriesById(
    db: SQLiteDB,
    id: string
): Promise<Series | undefined> {
    const result = await db.select().from(series).where(eq(series.id, id));
    if (!result[0]) return undefined;
    const s = parseSeries(result[0]);
    const countResult = await db
        .select({ count: projects.id })
        .from(projects)
        .where(eq(projects.seriesId, id));
    s.projectCount = countResult.length;
    return s;
}

export async function createSeries(
    db: SQLiteDB,
    data: NewSeries
): Promise<Series> {
    const now = new Date();
    await db.insert(series).values({
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return {
        ...data,
        createdAt: now,
        updatedAt: now,
        projectCount: 0,
    };
}

export async function updateSeries(
    db: SQLiteDB,
    id: string,
    data: Partial<NewSeries>
): Promise<Series | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.seriesArch !== undefined) updateData.seriesArch = data.seriesArch;
    if (data.coverImageId !== undefined)
        updateData.coverImageId = data.coverImageId;

    await db.update(series).set(updateData).where(eq(series.id, id));
    return getSeriesById(db, id);
}

export async function deleteSeries(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(series).where(eq(series.id, id));
}

export async function getSeriesProjects(db: SQLiteDB, seriesId: string) {
    const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.seriesId, seriesId))
        .orderBy(asc(projects.name));
    return rows as Omit<
        Project,
        | 'coverImagesArray'
        | 'primaryGenre'
        | 'primaryTheme'
        | 'genres'
        | 'tags'
        | 'themes'
    >[];
}
