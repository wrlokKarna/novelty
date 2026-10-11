import type { FieldDefinition, TemplateLayout, TemplateSpan } from '../types';

// Default width in grid columns per field type. Text-ish inputs and compact
// controls are single column; tall editors get a double-wide row.
const WIDTH_BY_TYPE: Partial<Record<FieldDefinition['type'], TemplateSpan>> = {
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

function clampSpan(width: number, columns: number): TemplateSpan {
    const max = Math.max(1, Math.min(6, Math.floor(columns) || 1));
    return Math.min(Math.max(1, width), max) as TemplateSpan;
}

// Picks a sensible initial layout for the current field list: every field keeps
// its present order and gets a type-appropriate width. "Rows" are implied - the
// grid auto-wraps, and a field too wide for the remaining room simply starts a
// new row. Heights are left unset so each field is measured from its content.
export function autoArrangeLayout(
    fields: FieldDefinition[],
    columns: number
): TemplateLayout {
    const order = fields.map((f) => f.name);
    const spans: Record<string, TemplateSpan> = {};
    for (const f of fields) {
        const span = clampSpan(WIDTH_BY_TYPE[f.type] ?? 1, columns);
        spans[f.name] = span;
    }
    return { order, spans, rows: {}, columns: Math.max(1, columns) };
}
