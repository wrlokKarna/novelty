import { db } from './index';
import { tokenUsage } from '../schema';
import { sql } from 'drizzle-orm';

export type NewTokenUsage = typeof tokenUsage.$inferInsert;

export async function logUsage(record: NewTokenUsage): Promise<void> {
    await db.insert(tokenUsage).values(record);
}

export async function getUsageStats(
    period: 'today' | 'month',
    projectId: string | null
): Promise<{ tokensConsumed: number; requestCount: number }> {
    const now = new Date();
    let startDate: Date;

    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filter = projectId
        ? sql`${tokenUsage.createdAt} >= ${startDate.getTime()} AND ${tokenUsage.projectId} = ${projectId}`
        : sql`${tokenUsage.createdAt} >= ${startDate.getTime()}`;

    const results = await db
        .select({
            tokensConsumed: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)`,
            requestCount: sql<number>`COUNT(*)`,
        })
        .from(tokenUsage)
        .where(filter);

    return {
        tokensConsumed: Number(results[0]?.tokensConsumed || 0),
        requestCount: Number(results[0]?.requestCount || 0),
    };
}
