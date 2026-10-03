import { db } from './index';
import { seriesTemplates } from '../schema';
import { eq, and, asc } from 'drizzle-orm';
import type {
    CompendiumCategory,
    NewSeriesTemplate,
    SeriesTemplate,
} from '../../mainview/types';
import { normalizeTreeFields } from '../../mainview/templates/tree';

// Canonical definitions live in mainview/types. Re-exported here because this
// module is the public surface for series template reads/writes.
export type {
    CompendiumCategory,
    FieldDefinition,
    FieldVisibility,
    NewSeriesTemplate,
    SeriesTemplate,
    VisibilityCondition,
    VisibilityOperator,
} from '../../mainview/types';

export function parseSeriesTemplateRow(
    row: typeof seriesTemplates.$inferSelect
): SeriesTemplate {
    return {
        id: row.id,
        seriesId: row.seriesId,
        name: row.name,
        description: row.description,
        baseType: row.baseType as CompendiumCategory,
        customFields: normalizeTreeFields(
            row.customFields ? JSON.parse(row.customFields) : []
        ),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function listSeriesTemplates(
    seriesId: string,
    baseType?: CompendiumCategory
): Promise<SeriesTemplate[]> {
    const conditions = [eq(seriesTemplates.seriesId, seriesId)];
    if (baseType) {
        conditions.push(eq(seriesTemplates.baseType, baseType));
    }
    const rows = await db
        .select()
        .from(seriesTemplates)
        .where(and(...conditions))
        .orderBy(asc(seriesTemplates.name));
    return rows.map(parseSeriesTemplateRow);
}

export async function getSeriesTemplateById(
    id: string
): Promise<SeriesTemplate | undefined> {
    const result = await db
        .select()
        .from(seriesTemplates)
        .where(eq(seriesTemplates.id, id));
    if (!result[0]) return undefined;
    return parseSeriesTemplateRow(result[0]);
}

export async function createSeriesTemplate(
    data: NewSeriesTemplate
): Promise<SeriesTemplate> {
    const now = new Date();
    const insertData = {
        ...data,
        customFields: JSON.stringify(data.customFields || []),
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(seriesTemplates).values(insertData);
    return {
        ...data,
        customFields: data.customFields || [],
        createdAt: now,
        updatedAt: now,
    };
}

export async function updateSeriesTemplate(
    id: string,
    data: Partial<NewSeriesTemplate>
): Promise<SeriesTemplate | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.baseType !== undefined) updateData.baseType = data.baseType;
    if (data.customFields !== undefined)
        updateData.customFields = JSON.stringify(data.customFields);

    await db
        .update(seriesTemplates)
        .set(updateData)
        .where(eq(seriesTemplates.id, id));
    return getSeriesTemplateById(id);
}

export async function deleteSeriesTemplate(id: string): Promise<void> {
    await db.delete(seriesTemplates).where(eq(seriesTemplates.id, id));
}
