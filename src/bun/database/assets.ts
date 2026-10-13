import { db } from './index';
import { assets } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export async function getAssetsByProject(projectId: string): Promise<Asset[]> {
    return db
        .select()
        .from(assets)
        .where(eq(assets.projectId, projectId))
        .orderBy(asc(assets.updatedAt));
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
    const result = await db.select().from(assets).where(eq(assets.id, id));
    return result[0];
}

export async function createAsset(asset: NewAsset): Promise<Asset> {
    await db.insert(assets).values(asset);
    return asset as Asset;
}

export async function updateAsset(
    id: string,
    data: Partial<NewAsset>
): Promise<Asset | undefined> {
    await db
        .update(assets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(assets.id, id));
    return getAssetById(id);
}

export async function deleteAsset(id: string): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id));
}
