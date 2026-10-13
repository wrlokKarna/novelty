import { db } from './index';
import { globalTemplates } from '../schema';
import { eq, and, asc } from 'drizzle-orm';
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

export type GlobalTemplate = {
    id: string;
    name: string;
    description: string | null;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
    createdAt: Date;
    updatedAt: Date;
};

export type NewGlobalTemplate = Omit<GlobalTemplate, 'createdAt' | 'updatedAt'>;

function parseTemplate(
    row: typeof globalTemplates.$inferSelect
): GlobalTemplate {
    return {
        id: row.id,
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

export async function listGlobalTemplates(
    baseType?: CompendiumCategory
): Promise<GlobalTemplate[]> {
    const conditions = [];
    if (baseType) {
        conditions.push(eq(globalTemplates.baseType, baseType));
    }
    const rows =
        conditions.length > 0
            ? await db
                  .select()
                  .from(globalTemplates)
                  .where(and(...conditions))
                  .orderBy(asc(globalTemplates.name))
            : await db
                  .select()
                  .from(globalTemplates)
                  .orderBy(asc(globalTemplates.name));
    return rows.map(parseTemplate);
}

export async function getGlobalTemplateById(
    id: string
): Promise<GlobalTemplate | undefined> {
    const result = await db
        .select()
        .from(globalTemplates)
        .where(eq(globalTemplates.id, id));
    if (!result[0]) return undefined;
    return parseTemplate(result[0]);
}

export async function createGlobalTemplate(
    data: NewGlobalTemplate
): Promise<GlobalTemplate> {
    const now = new Date();
    const insertData = {
        ...data,
        customFields: JSON.stringify(data.customFields || []),
        createdAt: now,
        updatedAt: now,
    };
    await db.insert(globalTemplates).values(insertData);
    return {
        ...data,
        customFields: data.customFields || [],
        createdAt: now,
        updatedAt: now,
    };
}

export async function updateGlobalTemplate(
    id: string,
    data: Partial<NewGlobalTemplate>
): Promise<GlobalTemplate | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.baseType !== undefined) updateData.baseType = data.baseType;
    if (data.customFields !== undefined)
        updateData.customFields = JSON.stringify(data.customFields);

    await db
        .update(globalTemplates)
        .set(updateData)
        .where(eq(globalTemplates.id, id));
    return getGlobalTemplateById(id);
}

export async function deleteGlobalTemplate(id: string): Promise<void> {
    await db.delete(globalTemplates).where(eq(globalTemplates.id, id));
}
