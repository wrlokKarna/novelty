import { db } from './index';
import { projects, seriesTemplates } from '../schema';
import { eq, and } from 'drizzle-orm';
import type {
    CompendiumCategory,
    FieldDefinition,
    SeriesTemplate,
} from '../../mainview/types';
import { normalizeTreeFields } from '../../mainview/templates/tree';

// Canonical definitions live in mainview/types. Re-exported here because this
// module is the public surface for series template reads/writes.
export type {
    CompendiumCategory,
    FieldDefinition,
    FieldVisibility,
    SeriesTemplate,
    SeriesTemplateInput,
    VisibilityCondition,
    VisibilityOperator,
} from '../../mainview/types';

export function parseSeriesTemplateRow(
    row: typeof seriesTemplates.$inferSelect
): SeriesTemplate {
    return {
        id: row.id,
        seriesId: row.seriesId,
        baseType: row.baseType as CompendiumCategory,
        customFields: normalizeTreeFields(
            row.customFields ? JSON.parse(row.customFields) : []
        ),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function listSeriesTemplates(
    seriesId: string
): Promise<SeriesTemplate[]> {
    const rows = await db
        .select()
        .from(seriesTemplates)
        .where(eq(seriesTemplates.seriesId, seriesId));
    return rows.map(parseSeriesTemplateRow);
}

export async function getSeriesTemplateBySeriesAndType(
    seriesId: string,
    baseType: CompendiumCategory
): Promise<SeriesTemplate | undefined> {
    const result = await db
        .select()
        .from(seriesTemplates)
        .where(
            and(
                eq(seriesTemplates.seriesId, seriesId),
                eq(seriesTemplates.baseType, baseType)
            )
        );
    if (!result[0]) return undefined;
    return parseSeriesTemplateRow(result[0]);
}

export async function upsertSeriesTemplate(input: {
    seriesId: string;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
}): Promise<SeriesTemplate> {
    const now = new Date();
    const existing = await getSeriesTemplateBySeriesAndType(
        input.seriesId,
        input.baseType
    );

    if (existing) {
        await db
            .update(seriesTemplates)
            .set({
                customFields: JSON.stringify(input.customFields || []),
                updatedAt: now,
            })
            .where(eq(seriesTemplates.id, existing.id));
        return {
            ...existing,
            customFields: input.customFields || [],
            updatedAt: now,
        };
    }

    const id = `stpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(seriesTemplates).values({
        id,
        seriesId: input.seriesId,
        baseType: input.baseType,
        customFields: JSON.stringify(input.customFields || []),
        createdAt: now,
        updatedAt: now,
    });
    return {
        id,
        seriesId: input.seriesId,
        baseType: input.baseType,
        customFields: input.customFields || [],
        createdAt: now,
        updatedAt: now,
    };
}

export async function deleteSeriesTemplate(
    seriesId: string,
    baseType: CompendiumCategory
): Promise<void> {
    await db
        .delete(seriesTemplates)
        .where(
            and(
                eq(seriesTemplates.seriesId, seriesId),
                eq(seriesTemplates.baseType, baseType)
            )
        );
}

// Walks project -> series -> the single template for that category, which is
// how every read resolves a project's series template.
export async function getSeriesTemplateForProject(
    projectId: string,
    baseType: CompendiumCategory
): Promise<SeriesTemplate | undefined> {
    const rows = await db
        .select()
        .from(seriesTemplates)
        .innerJoin(projects, eq(projects.seriesId, seriesTemplates.seriesId))
        .where(
            and(
                eq(projects.id, projectId),
                eq(seriesTemplates.baseType, baseType)
            )
        )
        .limit(1);
    if (!rows[0]) return undefined;
    return parseSeriesTemplateRow(rows[0].series_templates);
}
