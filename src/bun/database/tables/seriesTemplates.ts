import { eq, and } from 'drizzle-orm';

import { projects, seriesTemplates } from '../../../shared/schema';
import { normalizeTreeFields } from '../../../mainview/templates/tree';
import { normalizeLayout } from '../../../mainview/templates/mergeFields';
import type { SeriesTemplate } from '@/shared/types/series';
import type { CompendiumCategory } from '@/shared/types/project/compendium';
import type {
    FieldDefinition,
    TemplateLayout,
} from '@/shared/types/project/templates';
import type { SQLiteDB } from '@/shared/types/db';

function parseLayout(raw: unknown): TemplateLayout | null {
    if (!raw || typeof raw !== 'string') return null;
    try {
        return normalizeLayout(JSON.parse(raw));
    } catch {
        return null;
    }
}

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
        layout: parseLayout(row.layout),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function listSeriesTemplates(
    db: SQLiteDB,
    seriesId: string
): Promise<SeriesTemplate[]> {
    const rows = await db
        .select()
        .from(seriesTemplates)
        .where(eq(seriesTemplates.seriesId, seriesId));
    return rows.map(parseSeriesTemplateRow);
}

export async function getSeriesTemplateBySeriesAndType(
    db: SQLiteDB,
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

export async function upsertSeriesTemplate(
    db: SQLiteDB,
    input: {
        seriesId: string;
        baseType: CompendiumCategory;
        customFields: FieldDefinition[];
        layout?: TemplateLayout | null;
    }
): Promise<SeriesTemplate> {
    const now = new Date();
    const existing = await getSeriesTemplateBySeriesAndType(
        db,
        input.seriesId,
        input.baseType
    );

    if (existing) {
        const layout =
            input.layout !== undefined ? input.layout : existing.layout;
        await db
            .update(seriesTemplates)
            .set({
                customFields: JSON.stringify(input.customFields || []),
                layout: layout ? JSON.stringify(layout) : null,
                updatedAt: now,
            })
            .where(eq(seriesTemplates.id, existing.id));
        return {
            ...existing,
            customFields: input.customFields || [],
            layout: layout ?? null,
            updatedAt: now,
        };
    }

    const id = `stpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const layout = input.layout ?? null;
    await db.insert(seriesTemplates).values({
        id,
        seriesId: input.seriesId,
        baseType: input.baseType,
        customFields: JSON.stringify(input.customFields || []),
        layout: layout ? JSON.stringify(layout) : null,
        createdAt: now,
        updatedAt: now,
    });
    return {
        id,
        seriesId: input.seriesId,
        baseType: input.baseType,
        customFields: input.customFields || [],
        layout,
        createdAt: now,
        updatedAt: now,
    };
}

export async function deleteSeriesTemplate(
    db: SQLiteDB,
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
    db: SQLiteDB,
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
