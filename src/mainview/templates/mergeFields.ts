import type {
    FieldDefinition,
    ResolvedField,
    TemplateLayout,
    TemplateSpan,
} from '../../shared/types/project/templates';
import {
    DEFAULT_TEMPLATE_COLUMNS,
    LAYOUT_VERSION,
    MAX_COLUMNS,
} from '../types';

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
    return {
        order: [],
        spans: {},
        rowSpans: {},
        cols: {},
        rowStarts: {},
        fullWidth: {},
        version: LAYOUT_VERSION,
        columns,
    };
}

// Coerces a value read back from storage into a complete layout. Layouts are
// stored as JSON, so older rows can be missing `spans`/`rowSpans`/`cols`/
// `rowStarts`/`fullWidth` (or any other key); every consumer can then assume
// the shape is total.
export function normalizeLayout(raw: unknown): TemplateLayout | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Partial<TemplateLayout>;
    return {
        order: Array.isArray(obj.order) ? obj.order : [],
        spans:
            obj.spans && typeof obj.spans === 'object'
                ? (obj.spans as Record<string, TemplateSpan>)
                : {},
        rowSpans:
            obj.rowSpans && typeof obj.rowSpans === 'object'
                ? (obj.rowSpans as Record<string, number>)
                : {},
        cols:
            obj.cols && typeof obj.cols === 'object'
                ? (obj.cols as Record<string, number>)
                : {},
        rowStarts:
            obj.rowStarts && typeof obj.rowStarts === 'object'
                ? (obj.rowStarts as Record<string, number>)
                : {},
        fullWidth:
            obj.fullWidth && typeof obj.fullWidth === 'object'
                ? (obj.fullWidth as Record<string, true>)
                : {},
        version: typeof obj.version === 'number' ? obj.version : undefined,
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

// The effective, project-authoritative layout. The project's order, spans,
// rows, columns and full-width flags win; the series only supplies defaults for
// names the project has not placed, and only when the project has no order of
// its own.
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
    const cols = {
        ...(seriesLayout?.cols ?? {}),
        ...(projectLayout?.cols ?? {}),
    };
    const rowStarts = {
        ...(seriesLayout?.rowStarts ?? {}),
        ...(projectLayout?.rowStarts ?? {}),
    };
    const rowSpans = {
        ...(seriesLayout?.rowSpans ?? {}),
        ...(projectLayout?.rowSpans ?? {}),
    };
    const fullWidth = {
        ...(seriesLayout?.fullWidth ?? {}),
        ...(projectLayout?.fullWidth ?? {}),
    };
    const columns =
        projectLayout?.columns ??
        seriesLayout?.columns ??
        DEFAULT_TEMPLATE_COLUMNS;
    return {
        order: [...order],
        spans,
        rowSpans,
        cols,
        rowStarts,
        fullWidth,
        version: projectLayout?.version ?? seriesLayout?.version,
        columns,
    };
}

// Default width in grid columns per field type, used when a field has no span
// of its own. Text-ish inputs and compact controls are single column; tall
// editors get a double-wide row.
export const WIDTH_BY_TYPE: Partial<
    Record<FieldDefinition['type'], TemplateSpan>
> = {
    text: 1,
    number: 1,
    date: 1,
    color: 1,
    toggle: 1,
    checkbox: 1,
    select: 1,
    range: 1,
    file: 1,
    portrait: 1,
    entitylink: 1,
    textarea: 2,
    richtext: 2,
    images: 2,
    tree: 2,
};

// Default height in grid bands per field type, used when a field has no row
// span of its own. Most fields sit in a single band; fields whose widgets
// exceed one band of the uniform unit (portrait, gallery, long text, rich
// text, tree) default to spanning two so the grid stays on whole bands.
export const ROW_SPAN_BY_TYPE: Partial<
    Record<FieldDefinition['type'], number>
> = {
    textarea: 2,
    richtext: 2,
    portrait: 2,
    images: 2,
    tree: 2,
};

// Upper bound on how many bands a single field may span. Kept in step with the
// column-span cap so both handles feel consistent.
export const MAX_ROW_SPAN = 6;

export function clampRowSpan(span: number): number {
    return Math.min(Math.max(1, Math.round(span) || 1), MAX_ROW_SPAN);
}

export function clampSpan(width: number, columns: number): TemplateSpan {
    const max = Math.max(1, Math.min(MAX_COLUMNS, Math.floor(columns) || 1));
    return Math.min(Math.max(1, Math.round(width) || 1), max) as TemplateSpan;
}

// Clamps a field's 1-based start column so its full span stays inside the grid.
export function clampColStart(
    start: number,
    colSpan: number,
    columns: number
): number {
    const cols = Math.max(1, Math.floor(columns) || 1);
    const maxStart = Math.max(1, cols - Math.max(1, colSpan) + 1);
    return Math.min(Math.max(1, Math.round(start) || 1), maxStart);
}

// Attaches the presentation the layout assigns to each field: its width (an
// explicit span, else a full-width flag, else the type default), its height in
// bands (an explicit row span, else the type default), and optional starting
// column/row. `span`/`rowSpan` are always present so the renderer never has to
// guess a size; `colStart`/`rowStart`/`fullWidth` are attached only for names
// the layout actually mentions.
export function applyLayout(
    defs: FieldDefinition[],
    layout: TemplateLayout
): ResolvedField[] {
    const columns = layout.columns ?? DEFAULT_TEMPLATE_COLUMNS;
    return defs.map((def) => {
        const fullWidth = layout.fullWidth?.[def.name] === true;
        const span = fullWidth
            ? clampSpan(columns, columns)
            : (layout.spans?.[def.name] ??
              clampSpan(WIDTH_BY_TYPE[def.type] ?? 1, columns));
        const rowSpan = clampRowSpan(
            layout.rowSpans?.[def.name] ?? ROW_SPAN_BY_TYPE[def.type] ?? 1
        );
        const colStart = layout.cols?.[def.name];
        const rowStart = layout.rowStarts?.[def.name];
        const out: ResolvedField = { ...def, span, rowSpan };
        if (colStart) out.colStart = colStart;
        if (rowStart) out.rowStart = rowStart;
        if (fullWidth) out.fullWidth = true;
        return out;
    });
}
