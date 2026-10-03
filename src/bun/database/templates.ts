import { db } from './index';
import { entityTemplates, seriesTemplates } from '../schema';
import { eq, and } from 'drizzle-orm';
import type {
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
    ResolvedTemplateInfo,
    SeriesTemplate,
} from '../../mainview/types';
import { normalizeTreeFields } from '../../mainview/templates/tree';
import { parseSeriesTemplateRow } from './seriesTemplates';

export type {
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
    FieldVisibility,
    ResolvedTemplateInfo,
    SeriesTemplate,
    VisibilityCondition,
    VisibilityOperator,
} from '../../mainview/types';

export type NewEntityTemplate = Omit<EntityTemplate, 'createdAt' | 'updatedAt'>;

function parseTemplate(row: Record<string, unknown>): EntityTemplate {
    return {
        ...row,
        customFields: row.customFields
            ? normalizeTreeFields(JSON.parse(row.customFields as string))
            : [],
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
        seriesTemplateId: template.seriesTemplateId || null,
        customFields: JSON.stringify(template.customFields || []),
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(entityTemplates).values(newTemplate);
    return {
        ...newTemplate,
        customFields: template.customFields || [],
    } as unknown as EntityTemplate;
}

export async function updateTemplate(
    id: string,
    data: Partial<NewEntityTemplate>
): Promise<EntityTemplate | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.baseType !== undefined) updateData.baseType = data.baseType;
    if (data.seriesTemplateId !== undefined)
        updateData.seriesTemplateId = data.seriesTemplateId;
    if (data.customFields !== undefined)
        updateData.customFields = JSON.stringify(data.customFields);

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
    customFields: FieldDefinition[],
    seriesTemplateId?: string | null
): Promise<EntityTemplate> {
    const existing = await getTemplateByProjectAndType(projectId, baseType);
    if (existing) {
        const updateData: Partial<NewEntityTemplate> = { customFields };
        if (seriesTemplateId !== undefined)
            updateData.seriesTemplateId = seriesTemplateId;
        return (await updateTemplate(existing.id, updateData))!;
    }
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return createTemplate({
        id,
        projectId,
        baseType,
        seriesTemplateId: seriesTemplateId || null,
        customFields,
    });
}

export async function resolveTemplate(
    projectId: string,
    baseType: CompendiumCategory
): Promise<ResolvedTemplateInfo> {
    const projectTemplate =
        (await getTemplateByProjectAndType(projectId, baseType)) ?? null;
    let seriesTemplate: SeriesTemplate | null = null;

    if (projectTemplate?.seriesTemplateId) {
        const st = await db
            .select()
            .from(seriesTemplates)
            .where(eq(seriesTemplates.id, projectTemplate.seriesTemplateId));
        if (st[0]) {
            seriesTemplate = parseSeriesTemplateRow(st[0]);
        }
    }

    const fieldMap = new Map<string, FieldDefinition>();

    for (const field of seriesTemplate?.customFields || []) {
        if (field.disabled) {
            fieldMap.delete(field.name);
        } else {
            fieldMap.set(field.name, { ...field, disabled: false });
        }
    }

    for (const field of projectTemplate?.customFields || []) {
        if (field.disabled) {
            fieldMap.delete(field.name);
        } else {
            fieldMap.set(field.name, { ...field, disabled: false });
        }
    }

    return {
        fields: normalizeTreeFields(Array.from(fieldMap.values())),
        seriesTemplate,
        projectTemplate,
    };
}
