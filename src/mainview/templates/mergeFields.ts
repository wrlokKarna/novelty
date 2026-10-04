import type { FieldDefinition, SeriesTemplate } from '../types';

// Series fields are keyed by name, so a project override is recognised purely by
// name collision with the series template for its category.
export function getSeriesInheritedNames(
    seriesTemplate: SeriesTemplate | null | undefined
): Set<string> {
    if (!seriesTemplate?.customFields) return new Set();
    return new Set(seriesTemplate.customFields.map((f) => f.name));
}

export function mergeSeriesFields(
    fields: FieldDefinition[],
    seriesTemplate: SeriesTemplate | null | undefined
): FieldDefinition[] {
    const inherited = getSeriesInheritedNames(seriesTemplate);
    const nonInherited = fields.filter((f) => !inherited.has(f.name));
    if (!seriesTemplate || inherited.size === 0) return nonInherited;

    const savedOverrides = new Map(
        fields
            .filter((f) => inherited.has(f.name))
            .map((f) => [f.name, f] as const)
    );

    const inheritedFields = seriesTemplate.customFields.map((f) => {
        const existing = savedOverrides.get(f.name);
        if (existing)
            return { ...f, ...existing, disabled: existing.disabled ?? false };
        return { ...f, disabled: false };
    });

    return [...inheritedFields, ...nonInherited];
}

export function fullMerge(
    fields: FieldDefinition[],
    seriesTemplate: SeriesTemplate | null | undefined
): FieldDefinition[] {
    return mergeSeriesFields(fields, seriesTemplate);
}
