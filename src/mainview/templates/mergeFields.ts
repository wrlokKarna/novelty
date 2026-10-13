import type { FieldDefinition, GlobalTemplate, SeriesTemplate } from '../types';

export function getInheritedNames(
    globalId: string | null,
    list: GlobalTemplate[]
): Set<string> {
    if (!globalId) return new Set();
    const gt = list.find((g) => g.id === globalId);
    if (!gt?.customFields) return new Set();
    return new Set(gt.customFields.map((f) => f.name));
}

export function getSeriesInheritedNames(
    seriesId: string | null,
    list: SeriesTemplate[]
): Set<string> {
    if (!seriesId) return new Set();
    const st = list.find((s) => s.id === seriesId);
    if (!st?.customFields) return new Set();
    return new Set(st.customFields.map((f) => f.name));
}

export function mergeGlobalFields(
    fields: FieldDefinition[],
    globalId: string | null,
    list: GlobalTemplate[]
): FieldDefinition[] {
    const inherited = getInheritedNames(globalId, list);
    const nonInherited = fields.filter((f) => !inherited.has(f.name));
    if (inherited.size === 0) return nonInherited;

    const globalTpl = list.find((g) => g.id === globalId)!;
    const savedOverrides = new Map(
        fields
            .filter((f) => inherited.has(f.name))
            .map((f) => [f.name, f] as const)
    );

    const inheritedFields = globalTpl.customFields.map((f) => {
        const existing = savedOverrides.get(f.name);
        if (existing)
            return { ...f, ...existing, disabled: existing.disabled ?? false };
        return { ...f, disabled: false };
    });

    return [...inheritedFields, ...nonInherited];
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
    globalId: string | null,
    globalList: GlobalTemplate[],
    seriesId: string | null,
    seriesList: SeriesTemplate[]
): FieldDefinition[] {
    return mergeSeriesFields(
        mergeGlobalFields(fields, globalId, globalList),
        seriesId,
        seriesList
    );
}
