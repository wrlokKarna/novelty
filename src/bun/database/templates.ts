import { db } from './index';
import { entityTemplates, globalTemplates, seriesTemplates } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { CompendiumCategory } from '../../mainview/types';
import { normalizeTreeFields } from '../../mainview/templates/tree';

export type VisibilityOperator =
    | 'isTrue'
    | 'isFalse'
    | 'isEmpty'
    | 'notEmpty'
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'in'
    | 'notIn'
    | 'greaterThan'
    | 'lessThan';

export type VisibilityCondition = {
    field: string;
    operator: VisibilityOperator;
    value?: string | number | boolean | string[];
};

export type FieldVisibility = {
    mode: 'all' | 'any';
    conditions: VisibilityCondition[];
};

export type FieldDefinition = {
    name: string;
    type:
        | 'text'
        | 'number'
        | 'textarea'
        | 'select'
        | 'checkbox'
        | 'date'
        | 'file'
        | 'multiselect'
        | 'entitylink'
        | 'richtext'
        | 'color'
        | 'toggle'
        | 'range'
        | 'portrait'
        | 'images'
        | 'tree';
    label: string;
    required: boolean;
    disabled?: boolean;
    span?: 1 | 2 | 3 | 4;
    options?: string[];
    rangeMin?: number;
    rangeMax?: number;
    rangeStep?: number;
    entitylinkCategories?: CompendiumCategory[];
    treeRelations?: { relation: string; inverse: string }[];
    visibleWhen?: FieldVisibility;
};

export type EntityTemplate = {
    id: string;
    projectId: string | null;
    baseType: CompendiumCategory;
    globalTemplateId: string | null;
    seriesTemplateId: string | null;
    customFields: FieldDefinition[];
    createdAt: Date;
    updatedAt: Date;
};

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
        globalTemplateId: template.globalTemplateId || null,
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
    if (data.globalTemplateId !== undefined)
        updateData.globalTemplateId = data.globalTemplateId;
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
    globalTemplateId?: string | null,
    seriesTemplateId?: string | null
): Promise<EntityTemplate> {
    const existing = await getTemplateByProjectAndType(projectId, baseType);
    if (existing) {
        const updateData: Partial<NewEntityTemplate> = { customFields };
        if (globalTemplateId !== undefined)
            updateData.globalTemplateId = globalTemplateId;
        if (seriesTemplateId !== undefined)
            updateData.seriesTemplateId = seriesTemplateId;
        return (await updateTemplate(existing.id, updateData))!;
    }
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return createTemplate({
        id,
        projectId,
        baseType,
        globalTemplateId: globalTemplateId || null,
        seriesTemplateId: seriesTemplateId || null,
        customFields,
    });
}

export async function resolveTemplate(
    projectId: string,
    baseType: CompendiumCategory
): Promise<{
    fields: FieldDefinition[];
    globalTemplate: Record<string, unknown> | null;
    seriesTemplate: Record<string, unknown> | null;
    projectTemplate: EntityTemplate | null;
}> {
    const projectTemplate =
        (await getTemplateByProjectAndType(projectId, baseType)) ?? null;
    let globalTemplateData = null;
    let seriesTemplateData = null;

    if (projectTemplate?.globalTemplateId) {
        const gt = await db
            .select()
            .from(globalTemplates)
            .where(eq(globalTemplates.id, projectTemplate.globalTemplateId));
        if (gt[0]) {
            globalTemplateData = {
                ...gt[0],
                customFields: gt[0].customFields
                    ? normalizeTreeFields(JSON.parse(gt[0].customFields))
                    : [],
            };
        }
    }

    if (projectTemplate?.seriesTemplateId) {
        const st = await db
            .select()
            .from(seriesTemplates)
            .where(eq(seriesTemplates.id, projectTemplate.seriesTemplateId));
        if (st[0]) {
            seriesTemplateData = {
                ...st[0],
                customFields: st[0].customFields
                    ? normalizeTreeFields(JSON.parse(st[0].customFields))
                    : [],
            };
        }
    }

    const fieldMap = new Map<string, FieldDefinition>();

    for (const field of (globalTemplateData?.customFields as FieldDefinition[]) ||
        []) {
        fieldMap.set(field.name, { ...field, disabled: false });
    }

    for (const field of (seriesTemplateData?.customFields as FieldDefinition[]) ||
        []) {
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
        globalTemplate: globalTemplateData as any,
        seriesTemplate: seriesTemplateData as any,
        projectTemplate,
    };
}
