import type { FieldDefinition, SeriesTemplate } from '../types';

export function getSeriesInheritedNames(
    seriesId: string | null,
    list: SeriesTemplate[]
): Set<string> {
    if (!seriesId) return new Set();
    const st = list.find((s) => s.id === seriesId);
    if (!st?.customFields) return new Set();
    return new Set(st.customFields.map((f) => f.name));
}

export function mergeSeriesFields(
    fields: FieldDefinition[],
    seriesId: string | null,
    list: SeriesTemplate[]
): FieldDefinition[] {
    const inherited = getSeriesInheritedNames(seriesId, list);
    const nonInherited = fields.filter((f) => !inherited.has(f.name));
    if (inherited.size === 0) return nonInherited;

    const seriesTpl = list.find((s) => s.id === seriesId)!;
    const savedOverrides = new Map(
        fields
            .filter((f) => inherited.has(f.name))
            .map((f) => [f.name, f] as const)
    );

    const inheritedFields = seriesTpl.customFields.map((f) => {
        const existing = savedOverrides.get(f.name);
        if (existing)
            return { ...f, ...existing, disabled: existing.disabled ?? false };
        return { ...f, disabled: false };
    });

    return [...inheritedFields, ...nonInherited];
}

export function fullMerge(
    fields: FieldDefinition[],
    seriesId: string | null,
    seriesList: SeriesTemplate[]
): FieldDefinition[] {
    return mergeSeriesFields(fields, seriesId, seriesList);
}