import { db } from './index';
import { entityTemplates } from '../schema';
import { eq, and } from 'drizzle-orm';
import type {
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
    ResolvedTemplateInfo,
    TemplateLayout,
} from '../../mainview/types';
import { DEFAULT_TEMPLATE_COLUMNS } from '../../mainview/types';
import { normalizeTreeFields } from '../../mainview/templates/tree';
// Shared so the server's resolved order and the editor's merged order can never
// disagree - both call sites use these exact helpers.
import {
    applyLayout,
    effectiveLayout,
    mergeSeriesFields,
    normalizeLayout,
    orderByLayout,
} from '../../mainview/templates/mergeFields';
import { getSeriesTemplateForProject } from './seriesTemplates';

export type {
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
    FieldVisibility,
    ResolvedTemplateInfo,
    SeriesTemplate,
    TemplateLayout,
    VisibilityCondition,
    VisibilityOperator,
} from '../../mainview/types';

export type NewEntityTemplate = Omit<EntityTemplate, 'createdAt' | 'updatedAt'>;

function parseLayout(raw: unknown): TemplateLayout | null {
    if (!raw || typeof raw !== 'string') return null;
    try {
        return normalizeLayout(JSON.parse(raw));
    } catch {
        return null;
    }
}

function parseTemplate(row: Record<string, unknown>): EntityTemplate {
    return {
        ...row,
        customFields: row.customFields
            ? normalizeTreeFields(JSON.parse(row.customFields as string))
            : [],
        layout: parseLayout(row.layout),
    } as EntityTemplate;
}

export async function getTemplateByProjectAndType(
    projectId: string,
    baseType: CompendiumCategory
): Promise<EntityTemplate | undefined> {
    const result = await db
        .select()
        .from(entityTemplates)
        .where(
            and(
                eq(entityTemplates.projectId, projectId),
                eq(entityTemplates.baseType, baseType)
            )
        );
    if (!result[0]) return undefined;
    return parseTemplate(result[0]);
}

export async function getTemplatesByProject(
    projectId: string
): Promise<EntityTemplate[]> {
    const rows = await db
        .select()
        .from(entityTemplates)
        .where(eq(entityTemplates.projectId, projectId));
    return rows.map(parseTemplate);
}

export async function createTemplate(
    template: NewEntityTemplate
): Promise<EntityTemplate> {
    const now = new Date();
    const newTemplate = {
        id: template.id,
        projectId: template.projectId,
        baseType: template.baseType,
        customFields: JSON.stringify(template.customFields || []),
        layout: template.layout ? JSON.stringify(template.layout) : null,
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(entityTemplates).values(newTemplate);
    return {
        ...newTemplate,
        customFields: template.customFields || [],
        layout: template.layout ?? null,
    } as unknown as EntityTemplate;
}

export async function updateTemplate(
    id: string,
    data: Partial<NewEntityTemplate>
): Promise<EntityTemplate | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.baseType !== undefined) updateData.baseType = data.baseType;
    if (data.customFields !== undefined)
        updateData.customFields = JSON.stringify(data.customFields);
    if (data.layout !== undefined)
        updateData.layout = data.layout ? JSON.stringify(data.layout) : null;

    await db
        .update(entityTemplates)
        .set(updateData)
        .where(eq(entityTemplates.id, id));

    const result = await db
        .select()
        .from(entityTemplates)
        .where(eq(entityTemplates.id, id));
    if (!result[0]) return undefined;
    return parseTemplate(result[0]);
}

export async function deleteTemplate(id: string): Promise<void> {
    await db.delete(entityTemplates).where(eq(entityTemplates.id, id));
}

export async function upsertTemplate(
    projectId: string,
    baseType: CompendiumCategory,
    customFields?: FieldDefinition[],
    layout?: TemplateLayout | null
): Promise<EntityTemplate> {
    const existing = await getTemplateByProjectAndType(projectId, baseType);
    if (existing) {
        const data: Partial<NewEntityTemplate> = {};
        if (customFields !== undefined) data.customFields = customFields;
        if (layout !== undefined) data.layout = layout;
        return (await updateTemplate(existing.id, data))!;
    }
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return createTemplate({
        id,
        projectId,
        baseType,
        customFields: customFields ?? [],
        layout: layout ?? null,
    });
}

export async function resolveTemplate(
    projectId: string,
    baseType: CompendiumCategory
): Promise<ResolvedTemplateInfo> {
    const projectTemplate =
        (await getTemplateByProjectAndType(projectId, baseType)) ?? null;
    const seriesTemplate =
        (await getSeriesTemplateForProject(projectId, baseType)) ?? null;

    const merged = mergeSeriesFields(
        projectTemplate?.customFields ?? [],
        seriesTemplate?.customFields ?? null
    );
    const layout = effectiveLayout(
        projectTemplate?.layout,
        seriesTemplate?.layout
    );
    const ordered = orderByLayout(normalizeTreeFields(merged), layout.order);

    return {
        fields: applyLayout(ordered, layout),
        columns: layout.columns ?? DEFAULT_TEMPLATE_COLUMNS,
        layout,
        seriesTemplate,
        projectTemplate,
    };
}
