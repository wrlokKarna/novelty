import type { FieldDefinition, TemplateLayout, TemplateSpan } from '../types';
import { WIDTH_BY_TYPE, clampSpan } from './mergeFields';

// Picks a sensible initial layout for the current field list: every field keeps
// its present order and gets a type-appropriate width. "Rows" and start columns
// are cleared so the grid auto-wraps, and full-width flags are dropped so the
// type widths actually take effect. Heights are left unset so each field is
// measured from its content.
export function autoArrangeLayout(
    fields: FieldDefinition[],
    columns: number
): TemplateLayout {
    const order = fields.map((f) => f.name);
    const spans: Record<string, TemplateSpan> = {};
    for (const f of fields) {
        spans[f.name] = clampSpan(WIDTH_BY_TYPE[f.type] ?? 1, columns);
    }
    return {
        order,
        spans,
        rows: {},
        cols: {},
        fullWidth: {},
        columns: Math.max(1, columns),
    };
}
