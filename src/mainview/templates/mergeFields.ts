import type { FieldDefinition } from '../types';

export function getSeriesInheritedNames(
    seriesFields: FieldDefinition[] | null | undefined
): Set<string> {
    if (!seriesFields?.length) return new Set();
    return new Set(seriesFields.map((f) => f.name));
}

export function mergeSeriesFields(
    fields: FieldDefinition[],
    seriesFields: FieldDefinition[] | null | undefined
): FieldDefinition[] {
    const inherited = getSeriesInheritedNames(seriesFields);
    const nonInherited = fields.filter((f) => !inherited.has(f.name));
    if (!seriesFields || inherited.size === 0) return nonInherited;

    const savedOverrides = new Map(
        fields
            .filter((f) => inherited.has(f.name))
            .map((f) => [f.name, f] as const)
    );

    const inheritedFields = seriesFields.map((f) => {
        const existing = savedOverrides.get(f.name);
        if (existing)
            return { ...f, ...existing, disabled: existing.disabled ?? false };
        return { ...f, disabled: false };
    });

    return [...inheritedFields, ...nonInherited];
}

export function fullMerge(
    fields: FieldDefinition[],
    seriesFields: FieldDefinition[] | null | undefined
): FieldDefinition[] {
    return mergeSeriesFields(fields, seriesFields);
}
