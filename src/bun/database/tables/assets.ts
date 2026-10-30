import { eq, asc } from 'drizzle-orm';

import { assets } from '../../../shared/schema';
import type { SQLiteDB } from '@/shared/types/db';

type Asset = typeof assets.$inferSelect;
type NewAsset = typeof assets.$inferInsert;

export async function getAssetsByProject(
    db: SQLiteDB,
    projectId: string
): Promise<Asset[]> {
    return db
        .select()
        .from(assets)
        .where(eq(assets.projectId, projectId))
        .orderBy(asc(assets.updatedAt));
}

export async function getAssetById(
    db: SQLiteDB,
    id: string
): Promise<Asset | undefined> {
    const result = await db.select().from(assets).where(eq(assets.id, id));
    return result[0];
}

export async function createAsset(
    db: SQLiteDB,
    asset: NewAsset
): Promise<Asset> {
    await db.insert(assets).values(asset);
    return asset as Asset;
}

export async function updateAsset(
    db: SQLiteDB,
    id: string,
    data: Partial<NewAsset>
): Promise<Asset | undefined> {
    await db
        .update(assets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(assets.id, id));
    return getAssetById(db, id);
}

export async function deleteAsset(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id));
}
