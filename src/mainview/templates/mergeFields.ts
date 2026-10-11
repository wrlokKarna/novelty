import type {
    FieldDefinition,
    ResolvedField,
    TemplateLayout,
    TemplateSpan,
} from '../types';
import { DEFAULT_TEMPLATE_COLUMNS } from '../types';

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

// Merges the definitions only. The series row is the definition of record for an
// inherited name; a project row for that name only carries this project's on/off
// choice. Order and width are layout concerns, applied separately by
// `orderByLayout` / `applyLayout`. The returned list is the fallback order for a
// template that has no saved layout: series fields in their stored order, then
// project-only fields.
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
        const merged: FieldDefinition = { ...f, disabled: false };
        if (savedOverrides.get(f.name)?.disabled) merged.disabled = true;
        return merged;
    });

    return [...inheritedFields, ...nonInherited];
}

export const fullMerge = mergeSeriesFields;

export function emptyLayout(
    columns: number = DEFAULT_TEMPLATE_COLUMNS
): TemplateLayout {
    return { order: [], spans: {}, rows: {}, columns };
}

// Coerces a value read back from storage into a complete layout. Layouts are
// stored as JSON, so older rows can be missing `rows` (or any other key);
// every consumer can then assume the shape is total.
export function normalizeLayout(raw: unknown): TemplateLayout | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Partial<TemplateLayout>;
    return {
        order: Array.isArray(obj.order) ? obj.order : [],
        spans:
            obj.spans && typeof obj.spans === 'object'
                ? (obj.spans as Record<string, TemplateSpan>)
                : {},
        rows:
            obj.rows && typeof obj.rows === 'object'
                ? (obj.rows as Record<string, number>)
                : {},
        columns: typeof obj.columns === 'number' ? obj.columns : null,
    };
}

// Reorders `defs` to match `order` by name. Names the list does not mention (a
// field added after the layout was saved, or a template that predates layouts)
// keep their incoming relative order and are appended, so nothing is dropped.
export function orderByLayout<T extends { name: string }>(
    defs: T[],
    order: string[] | null | undefined
): T[] {
    if (!order?.length) return defs;
    const rank = new Map(order.map((name, i) => [name, i] as const));
    return defs
        .map((def, index) => ({ def, index }))
        .sort((a, b) => {
            const ar = rank.get(a.def.name);
            const br = rank.get(b.def.name);
            if (ar === undefined && br === undefined) return a.index - b.index;
            if (ar === undefined) return 1;
            if (br === undefined) return -1;
            return ar === br ? a.index - b.index : ar - br;
        })
        .map((x) => x.def);
}

// The effective, project-authoritative layout. The project's order, spans and
// rows win; the series only supplies defaults for names the project has not
// placed, and only when the project has no order of its own.
export function effectiveLayout(
    projectLayout: TemplateLayout | null | undefined,
    seriesLayout: TemplateLayout | null | undefined
): TemplateLayout {
    const order = projectLayout?.order?.length
        ? projectLayout.order
        : (seriesLayout?.order ?? []);
    const spans = {
        ...(seriesLayout?.spans ?? {}),
        ...(projectLayout?.spans ?? {}),
    };
    const rows = {
        ...(seriesLayout?.rows ?? {}),
        ...(projectLayout?.rows ?? {}),
    };
    const columns =
        projectLayout?.columns ??
        seriesLayout?.columns ??
        DEFAULT_TEMPLATE_COLUMNS;
    return { order: [...order], spans, rows, columns };
}

// Attaches the width and height the layout assigns to each field. A name with
// no stored span is left `undefined` so the renderer falls back to a full row;
// a name with no stored row span is sized to its own content.
export function applyLayout(
    defs: FieldDefinition[],
    layout: TemplateLayout
): ResolvedField[] {
    return defs.map((def) => {
        const span = layout.spans[def.name];
        const rowSpan = layout.rows?.[def.name];
        if (span && rowSpan) return { ...def, span, rowSpan };
        if (span) return { ...def, span };
        if (rowSpan) return { ...def, rowSpan };
        return { ...def };
    });
}
