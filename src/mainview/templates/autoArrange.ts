import type {
    FieldDefinition,
    TemplateLayout,
    TemplateSpan,
} from '../../shared/types/project/templates';
import {
    DEFAULT_TEMPLATE_COLUMNS,
    LAYOUT_VERSION,
    MAX_COLUMNS,
} from '../types';
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
// band, onto the thin separator above/below a band (`boundary` is the 1-based
// row the new band is inserted at, so 1 = above the first band; `col` is the
// 1-based column the field is attached to inside that new band), or onto the
// thin separator between columns (`boundary` is the 1-based column a new column
// is inserted before, so 1 = left of the first column; `row` is the 1-based
// band the field lands in).
export type DropTarget =
    | { kind: 'cell'; row: number; col: number }
    | { kind: 'insert'; boundary: number; col: number }
    | { kind: 'insertCol'; boundary: number; row: number };

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

// Rebuilds a layout so the grid stays dense: every field is given a rectangle
// (stored positions are honoured; anything unplaced is packed), then bands no
// field occupies are dropped and columns no field reaches are trimmed from the
// right. Interior column gaps are intentional and preserved.
export function compactLayout(
    fields: FieldDefinition[],
    layout: TemplateLayout
): TemplateLayout {
    const columns = layout.columns ?? DEFAULT_TEMPLATE_COLUMNS;
    const positioned = withBandPositions(
        fields.map((f) => {
            const fullWidth = layout.fullWidth?.[f.name] === true;
            const span = fullWidth
                ? columns
                : clampSpan(
                      layout.spans?.[f.name] ?? WIDTH_BY_TYPE[f.type] ?? 1,
                      columns
                  );
            const rowSpan = clampRowSpan(
                layout.rowSpans?.[f.name] ?? ROW_SPAN_BY_TYPE[f.type] ?? 1
            );
            return {
                name: f.name,
                span,
                rowSpan,
                rowStart: layout.rowStarts?.[f.name],
                colStart: layout.cols?.[f.name],
            };
        }),
        columns
    );

    const compacted = compactPlaced(
        positioned.map((p) => ({
            name: p.name,
            row: p.rowStart,
            col: p.colStart,
            span: p.span,
            rowSpan: p.rowSpan,
        })),
        columns
    );

    return {
        ...layout,
        rowStarts: compacted.rowStarts,
        cols: compacted.cols,
        rowSpans: compacted.rowSpans,
        columns: compacted.columns,
        version: LAYOUT_VERSION,
    };
}

// Compacts a placed field set into a dense layout: bands that no field occupies
// are dropped so row indices stay contiguous, and columns no field reaches are
// trimmed from the right. Interior column gaps are kept, and a field that spans
// the full width pins every column. An empty set keeps the given column count so
// a template can be sized before it has any fields.
export function compactPlaced(
    placed: PlacedField[],
    columns: number
): {
    rowStarts: Record<string, number>;
    cols: Record<string, number>;
    rowSpans: Record<string, number>;
    columns: number;
} {
    const cols = Math.max(1, Math.round(columns) || 1);
    const usedBands = new Set<number>();
    let rightmost = 0;
    for (const p of placed) {
        const rowSpan = Math.max(1, Math.round(p.rowSpan) || 1);
        for (let r = p.row; r < p.row + rowSpan; r++) usedBands.add(r);
        const span = Math.min(Math.max(1, Math.round(p.span) || 1), cols);
        rightmost = Math.max(rightmost, p.col + span - 1);
    }

    const sorted = [...usedBands].sort((a, b) => a - b);
    const remap = new Map<number, number>();
    sorted.forEach((r, i) => remap.set(r, i + 1));

    const rowStarts: Record<string, number> = {};
    const startCols: Record<string, number> = {};
    const rowSpans: Record<string, number> = {};
    for (const p of placed) {
        rowStarts[p.name] = remap.get(p.row)!;
        startCols[p.name] = p.col;
        rowSpans[p.name] = Math.max(1, Math.round(p.rowSpan) || 1);
    }

    return {
        rowStarts,
        cols: startCols,
        rowSpans,
        columns: rightmost > 0 ? Math.min(cols, rightmost) : cols,
    };
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

function toMaps(
    placed: PlacedField[],
    columns: number
): {
    rowStarts: Record<string, number>;
    cols: Record<string, number>;
    rowSpans: Record<string, number>;
    columns: number;
} {
    const rowStarts: Record<string, number> = {};
    const cols: Record<string, number> = {};
    const rowSpans: Record<string, number> = {};
    for (const p of placed) {
        rowStarts[p.name] = p.row;
        cols[p.name] = p.col;
        rowSpans[p.name] = p.rowSpan;
    }
    return { rowStarts, cols, rowSpans, columns };
}

// Applies a drop to the band grid and returns the resulting positions. Dropping
// onto a cell places the field there (sliding to the nearest free column/band if
// taken, inserting a band if none fits); dropping on a separator inserts a new
// band at the boundary with the field in the chosen column, shifting the bands
// below it down. Dropping on a vertical separator inserts a new column at the
// boundary, shifting fields whose right edge reaches the line one column right,
// then places the field in the new column. Empty bands left behind by a move are
// compacted so row indices stay contiguous. `columns` reflects the post-drop
// column count (only column insertion changes it).
export function applyDrop(
    placed: PlacedField[],
    name: string,
    target: DropTarget,
    columns: number
): {
    rowStarts: Record<string, number>;
    cols: Record<string, number>;
    rowSpans: Record<string, number>;
    columns: number;
} {
    const cols = Math.max(1, columns);
    const moving = placed.find((p) => p.name === name);
    if (!moving) return toMaps(placed, cols);

    const span = Math.min(Math.max(1, Math.round(moving.span) || 1), cols);
    const rowSpan = Math.max(1, Math.round(moving.rowSpan) || 1);
    const others = placed.filter((p) => p.name !== name).map((p) => ({ ...p }));
    const moved: PlacedField = { name, row: 1, col: 1, span, rowSpan };

    const maxRowEnd = others.reduce(
        (m, o) => Math.max(m, o.row + o.rowSpan - 1),
        0
    );

    if (target.kind === 'insertCol') {
        if (cols >= MAX_COLUMNS) return toMaps(placed, cols);
        const boundary = Math.min(
            Math.max(1, Math.round(target.boundary) || 1),
            cols + 1
        );
        const desiredRow = Math.max(1, Math.round(target.row) || 1);
        // Shift every field whose right edge touches (or crosses) the boundary
        // line one column right, so the new column sits at `boundary`.
        for (const o of others) if (o.col + o.span - 1 >= boundary) o.col += 1;
        const nextCols = cols + 1;
        const occ2 = occupy(others, nextCols);
        if (fitsAt(occ2, desiredRow, boundary, span, rowSpan, nextCols)) {
            moved.row = desiredRow;
            moved.col = boundary;
        } else {
            const spot = nearestFreeRow(
                occ2,
                desiredRow,
                boundary,
                span,
                rowSpan,
                maxRowEnd,
                nextCols
            );
            if (spot) {
                moved.row = spot.row;
                moved.col = spot.col;
            } else {
                for (const o of others)
                    if (o.row + o.rowSpan - 1 >= desiredRow) o.row += 1;
                moved.row = desiredRow;
                moved.col = boundary;
            }
        }
        const allCols = [...others, moved];
        return compactRows(allCols, nextCols);
    }

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

    return compactRows([...others, moved], cols);
}

// Compacts the band indices of a placed set back to contiguous 1..N rows and
// returns the layout maps, keeping `columns` as given. Column trimming is left
// to `compactPlaced`/`compactLayout` so an explicit column insert can still grow
// the grid before anything is trimmed away.
function compactRows(
    all: PlacedField[],
    columns: number
): {
    rowStarts: Record<string, number>;
    cols: Record<string, number>;
    rowSpans: Record<string, number>;
    columns: number;
} {
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
    return { rowStarts, cols: startCols, rowSpans, columns };
}
