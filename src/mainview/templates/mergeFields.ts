import type { FieldDefinition } from '../types';

// Orders a merged field list. Series and project rows share one order space so
// they can interleave freely; `order` is assigned on save and renumbered from
// the list position each time.
//
// Fields saved before `order` existed have none, so they fall back to their
// existing position via `index`. A list where nothing carries an `order` is the
// common case and is returned untouched, which keeps legacy templates in
// exactly the order they were stored in.
export function sortByOrder<T extends { order?: number }>(fields: T[]): T[] {
    if (fields.every((f) => f.order === undefined)) return fields;
    return fields
        .map((f, index) => ({ f, index }))
        .sort((a, b) => {
            const ao = a.f.order ?? a.index;
            const bo = b.f.order ?? b.index;
            return ao === bo ? a.index - b.index : ao - bo;
        })
        .map((x) => x.f);
}

// Series fields are keyed by name, so a project override is recognised purely by
// name collision with the series template for its category. Callers pass the
// series field list directly rather than the template row, so the row's identity
// (id, timestamps) never has to be modelled on the client.
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
    if (!seriesFields || inherited.size === 0) return sortByOrder(nonInherited);

    const savedOverrides = new Map(
        fields
            .filter((f) => inherited.has(f.name))
            .map((f) => [f.name, f] as const)
    );

    const inheritedFields = seriesFields.map((f) => {
        // The series row is the definition of record. A project override only
        // carries this project's on/off choice for it, so the definition and the
        // ordering are always taken from the series - otherwise a later series
        // edit would be masked by the stale copy stored in the project template.
        const merged: FieldDefinition = { ...f, disabled: false };
        if (f.order === undefined) delete merged.order;
        if (savedOverrides.get(f.name)?.disabled) merged.disabled = true;
        return merged;
    });

    return sortByOrder([...inheritedFields, ...nonInherited]);
}

export function fullMerge(
    fields: FieldDefinition[],
    seriesFields: FieldDefinition[] | null | undefined
): FieldDefinition[] {
    return mergeSeriesFields(fields, seriesFields);
}
