import type { FieldDefinition, TemplateLayout, TemplateSpan } from '../types';
import { LAYOUT_VERSION } from '../types';
import {
    ROW_SPAN_BY_TYPE,
    WIDTH_BY_TYPE,
    clampRowSpan,
    clampSpan,
} from './mergeFields';

// A field with its current rectangle in the band grid. `row`/`col` are the
// 1-based start band and column, `span` the number of columns it covers and
// `rowSpan` the number of bands it covers.
export interface PlacedField {
    name: string;
    row: number;
    col: number;
    span: number;
    rowSpan: number;
}

// Where a dragged field was dropped: either onto a specific cell in an existing
// band, or onto the thin separator above/below a band (`boundary` is the 1-based
// row the new band is inserted at, so 1 = above the first band; `col` is the
// 1-based column the field is attached to inside that new band).
export type DropTarget =
    | { kind: 'cell'; row: number; col: number }
    | { kind: 'insert'; boundary: number; col: number };

const cellKey = (row: number, col: number) => `${row},${col}`;

// The set of occupied `row,col` cells for a set of placed rectangles.
function occupy(placed: PlacedField[], columns: number): Set<string> {
    const cols = Math.max(1, columns);
    const occ = new Set<string>();
    for (const p of placed) {
        const span = Math.min(Math.max(1, Math.round(p.span) || 1), cols);
        const rowSpan = Math.max(1, Math.round(p.rowSpan) || 1);
        for (let r = p.row; r < p.row + rowSpan; r++)
            for (let c = p.col; c < p.col + span; c++) occ.add(cellKey(r, c));
    }
    return occ;
}

// True when a `span × rowSpan` rectangle at `(row,col)` is inside the grid and
// does not touch any occupied cell.
function fitsAt(
    occ: Set<string>,
    row: number,
    col: number,
    span: number,
    rowSpan: number,
    columns: number
): boolean {
    if (row < 1 || col < 1 || col + span - 1 > columns) return false;
    for (let r = row; r < row + rowSpan; r++)
        for (let c = col; c < col + span; c++)
            if (occ.has(cellKey(r, c))) return false;
    return true;
}

// Places fields in reading order into the first free rectangle that fits,
// scanning bands top-to-bottom and columns left-to-right. A field that spans
// several bands reserves them, so later fields tuck into the free cells beside
// it (masonry) rather than being pushed to a fresh band.
export function packGridPositions(
    entries: { name: string; span: number; rowSpan?: number }[],
    columns: number
): { rowStarts: Record<string, number>; cols: Record<string, number> } {
    const cols = Math.max(1, columns);
    const rowStarts: Record<string, number> = {};
    const startCols: Record<string, number> = {};
    const occ = new Set<string>();

    for (const e of entries) {
        const span = Math.min(Math.max(1, Math.round(e.span) || 1), cols);
        const rowSpan = Math.max(1, Math.round(e.rowSpan ?? 1) || 1);
        let row = 1;
        let col = 1;
        let found = false;
        for (let r = 1; !found; r++) {
            for (let c = 1; c + span - 1 <= cols; c++) {
                if (fitsAt(occ, r, c, span, rowSpan, cols)) {
                    row = r;
                    col = c;
                    found = true;
                    break;
                }
            }
        }
        for (let r = row; r < row + rowSpan; r++)
            for (let c = col; c < col + span; c++) occ.add(cellKey(r, c));
        rowStarts[e.name] = row;
        startCols[e.name] = col;
    }

    return { rowStarts, cols: startCols };
}

// Repacks the current field list into a dense band grid: every field keeps its
// present order, width and height, packed into the first fitting rectangle.
// Explicit spans, row spans and full-width flags on `base` are honoured;
// otherwise widths/heights fall back to the per-type defaults.
export function autoArrangeLayout(
    fields: FieldDefinition[],
    columns: number,
    base?: TemplateLayout | null
): TemplateLayout {
    const cols = Math.max(1, columns);
    const spans: Record<string, TemplateSpan> = {};
    const rowSpans: Record<string, number> = {};
    const fullWidth: Record<string, true> = {};

    const entries = fields.map((f) => {
        const isFullWidth = base?.fullWidth?.[f.name] === true;
        const span = isFullWidth
            ? cols
            : clampSpan(
                  base?.spans?.[f.name] ?? WIDTH_BY_TYPE[f.type] ?? 1,
                  cols
              );
        const rowSpan = clampRowSpan(
            base?.rowSpans?.[f.name] ?? ROW_SPAN_BY_TYPE[f.type] ?? 1
        );
        spans[f.name] = span as TemplateSpan;
        rowSpans[f.name] = rowSpan;
        if (isFullWidth) fullWidth[f.name] = true;
        return { name: f.name, span, rowSpan };
    });

    const { rowStarts, cols: startCols } = packGridPositions(entries, cols);

    return {
        order: fields.map((f) => f.name),
        spans,
        rowSpans,
        cols: startCols,
        rowStarts,
        fullWidth,
        version: LAYOUT_VERSION,
        columns: cols,
    };
}

// Guarantees every field has a rectangle. Fields the layout has placed keep
// theirs; any field without a stored row (a freshly added field, or a series
// field that arrived after the layout was saved) is packed into the first free
// rectangle around the placed fields.
export function withBandPositions<
    T extends {
        name: string;
        span?: number;
        rowSpan?: number;
        rowStart?: number;
        colStart?: number;
    },
>(
    items: T[],
    columns: number
): (T & { rowStart: number; colStart: number; rowSpan: number })[] {
    const cols = Math.max(1, columns);
    const placed: PlacedField[] = [];
    for (const f of items) {
        if (f.rowStart != null && f.rowStart > 0) {
            placed.push({
                name: f.name,
                row: f.rowStart,
                col: f.colStart ?? 1,
                span: Math.min(Math.max(1, Math.round(f.span ?? 1) || 1), cols),
                rowSpan: Math.max(1, Math.round(f.rowSpan ?? 1) || 1),
            });
        }
    }

    const occ = occupy(placed, cols);
    const assigned = new Map<
        string,
        { row: number; col: number; rowSpan: number }
    >();
    for (const f of items) {
        if (f.rowStart != null && f.rowStart > 0) continue;
        const span = Math.min(Math.max(1, Math.round(f.span ?? 1) || 1), cols);
        const rowSpan = Math.max(1, Math.round(f.rowSpan ?? 1) || 1);
        let row = 1;
        let col = 1;
        let found = false;
        for (let r = 1; !found; r++) {
            for (let c = 1; c + span - 1 <= cols; c++) {
                if (fitsAt(occ, r, c, span, rowSpan, cols)) {
                    row = r;
                    col = c;
                    found = true;
                    break;
                }
            }
        }
        for (let r = row; r < row + rowSpan; r++)
            for (let c = col; c < col + span; c++) occ.add(cellKey(r, c));
        assigned.set(f.name, { row, col, rowSpan });
    }

    return items.map((f) => {
        const a = assigned.get(f.name);
        if (a)
            return {
                ...f,
                rowStart: a.row,
                colStart: a.col,
                rowSpan: a.rowSpan,
            };
        return {
            ...f,
            rowStart: f.rowStart!,
            colStart: f.colStart ?? 1,
            rowSpan: Math.max(1, Math.round(f.rowSpan ?? 1) || 1),
        };
    });
}

// The free start column in `row` closest to `desired` whose full `rowSpan`
// rectangle fits, or null when the band has no room.
function nearestFreeCol(
    occ: Set<string>,
    row: number,
    span: number,
    rowSpan: number,
    desired: number,
    columns: number
): number | null {
    const maxStart = columns - span + 1;
    if (maxStart < 1) return null;
    const clamped = Math.min(Math.max(1, desired), maxStart);
    for (let d = 0; d <= columns; d++) {
        const left = clamped - d;
        if (left >= 1 && fitsAt(occ, row, left, span, rowSpan, columns))
            return left;
        const right = clamped + d;
        if (
            d > 0 &&
            right <= maxStart &&
            fitsAt(occ, row, right, span, rowSpan, columns)
        )
            return right;
    }
    return null;
}

// The nearest band above/below `desiredRow` that has a free column for the
// rectangle, or null when no existing band can take it.
function nearestFreeRow(
    occ: Set<string>,
    desiredRow: number,
    desiredCol: number,
    span: number,
    rowSpan: number,
    maxRow: number,
    columns: number
): { row: number; col: number } | null {
    for (let dist = 0; dist <= maxRow; dist++) {
        const down = desiredRow + dist;
        if (down >= 1 && down <= maxRow + 1) {
            const col = nearestFreeCol(
                occ,
                down,
                span,
                rowSpan,
                desiredCol,
                columns
            );
            if (col != null) return { row: down, col };
        }
        if (dist > 0) {
            const up = desiredRow - dist;
            if (up >= 1) {
                const col = nearestFreeCol(
                    occ,
                    up,
                    span,
                    rowSpan,
                    desiredCol,
                    columns
                );
                if (col != null) return { row: up, col };
            }
        }
    }
    return null;
}

function toMaps(placed: PlacedField[]): {
    rowStarts: Record<string, number>;
    cols: Record<string, number>;
    rowSpans: Record<string, number>;
} {
    const rowStarts: Record<string, number> = {};
    const cols: Record<string, number> = {};
    const rowSpans: Record<string, number> = {};
    for (const p of placed) {
        rowStarts[p.name] = p.row;
        cols[p.name] = p.col;
        rowSpans[p.name] = p.rowSpan;
    }
    return { rowStarts, cols, rowSpans };
}

// Applies a drop to the band grid and returns the resulting positions. Dropping
// onto a cell places the field there (sliding to the nearest free column/band if
// taken, inserting a band if none fits); dropping on a separator inserts a new
// band at the boundary with the field in the chosen column, shifting the bands
// below it down. Empty bands left behind by a move are compacted so row indices
// stay contiguous.
export function applyDrop(
    placed: PlacedField[],
    name: string,
    target: DropTarget,
    columns: number
): {
    rowStarts: Record<string, number>;
    cols: Record<string, number>;
    rowSpans: Record<string, number>;
} {
    const cols = Math.max(1, columns);
    const moving = placed.find((p) => p.name === name);
    if (!moving) return toMaps(placed);

    const span = Math.min(Math.max(1, Math.round(moving.span) || 1), cols);
    const rowSpan = Math.max(1, Math.round(moving.rowSpan) || 1);
    const others = placed.filter((p) => p.name !== name).map((p) => ({ ...p }));
    const moved: PlacedField = { name, row: 1, col: 1, span, rowSpan };

    const maxRowEnd = others.reduce(
        (m, o) => Math.max(m, o.row + o.rowSpan - 1),
        0
    );

    if (target.kind === 'insert') {
        const boundary = Math.min(
            Math.max(1, Math.round(target.boundary) || 1),
            maxRowEnd + 1
        );
        // Push down every field whose bands reach the boundary, so a spanning
        // field straddling it moves too and the new band stays free.
        for (const o of others)
            if (o.row + o.rowSpan - 1 >= boundary) o.row += 1;
        moved.row = boundary;
        moved.col = Math.min(
            Math.max(1, Math.round(target.col) || 1),
            Math.max(1, cols - span + 1)
        );
    } else {
        const desiredRow = Math.max(1, Math.round(target.row) || 1);
        const desiredCol = Math.max(1, Math.round(target.col) || 1);
        const occ = occupy(others, cols);
        if (fitsAt(occ, desiredRow, desiredCol, span, rowSpan, cols)) {
            moved.row = desiredRow;
            moved.col = desiredCol;
        } else {
            const spot = nearestFreeRow(
                occ,
                desiredRow,
                desiredCol,
                span,
                rowSpan,
                maxRowEnd,
                cols
            );
            if (spot) {
                moved.row = spot.row;
                moved.col = spot.col;
            } else {
                const insertAt = desiredRow;
                for (const o of others)
                    if (o.row + o.rowSpan - 1 >= insertAt) o.row += 1;
                moved.row = insertAt;
                moved.col = Math.min(
                    Math.max(1, desiredCol),
                    Math.max(1, cols - span + 1)
                );
            }
        }
    }

    const all = [...others, moved];

    // Compact: keep only the bands a field actually covers, renumbered 1..N.
    const usedBands = new Set<number>();
    for (const p of all)
        for (let r = p.row; r < p.row + p.rowSpan; r++) usedBands.add(r);
    const sorted = [...usedBands].sort((a, b) => a - b);
    const remap = new Map<number, number>();
    sorted.forEach((r, i) => remap.set(r, i + 1));

    const rowStarts: Record<string, number> = {};
    const startCols: Record<string, number> = {};
    const rowSpans: Record<string, number> = {};
    for (const p of all) {
        rowStarts[p.name] = remap.get(p.row)!;
        startCols[p.name] = p.col;
        rowSpans[p.name] = p.rowSpan;
    }
    return { rowStarts, cols: startCols, rowSpans };
}
