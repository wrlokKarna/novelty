import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import {
    DndContext,
    PointerSensor,
    useDraggable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type {
    FieldDefinition,
    ResolvedField,
    TemplateLayout,
    TemplateSpan,
} from '../../../types';
import {
    MAX_ROW_SPAN,
    ROW_SPAN_BY_TYPE,
    applyLayout,
    clampColStart,
    clampRowSpan,
    orderByLayout,
} from '../../../templates/mergeFields';
import type { DropTarget } from '../../../templates/autoArrange';
import { withBandPositions } from '../../../templates/autoArrange';
import { useRowSpanResize, useSpanResize } from './useSpanResize';

/* -------------------------------------------------------------------------- */
/*  Grid metrics                                                              */
/* -------------------------------------------------------------------------- */

export const TEMPLATE_GRID_GAP = 12;

// The vertical window around a band boundary that counts as "insert a row here".
// The zone is centred on the line and split across both neighbours; when a band
// is shorter than the zone, the reach on that side is clamped to half the band
// so adjacent zones can never overlap.
export const TEMPLATE_INSERT_ZONE = 24;
const INSERT_HALF = TEMPLATE_INSERT_ZONE / 2;

const GRID_STYLES = (columns: number, rows: number): CSSProperties => {
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
        // Bands are content-sized. Explicit tracks (rather than grid-auto-rows)
        // keep the resolved pixel sizes readable for the drop geometry.
        gridTemplateRows: rows > 0 ? `repeat(${rows}, auto)` : undefined,
        gap: TEMPLATE_GRID_GAP,
        position: 'relative',
    };
};

/* -------------------------------------------------------------------------- */
/*  Item furniture                                                            */
/* -------------------------------------------------------------------------- */

function SpanResizeHandle({
    name,
    span,
    columns,
    onSpanChange,
}: {
    name: string;
    span: TemplateSpan | undefined;
    columns: number;
    onSpanChange: (name: string, span: TemplateSpan) => void;
}) {
    const resize = useSpanResize(name, span, columns, onSpanChange);
    return (
        <div
            className="field-resize"
            style={{
                position: 'absolute',
                right: -2,
                top: 0,
                bottom: 0,
                width: 7,
                cursor: 'ew-resize',
                zIndex: 4,
                touchAction: 'none',
                borderRight: '2px solid transparent',
                borderRadius: '0 6px 6px 0',
            }}
            onPointerDown={resize.onPointerDown}
            onPointerMove={resize.onPointerMove}
            onPointerUp={resize.onPointerUp}
            title="Drag to resize width"
        />
    );
}

function RowSpanHandle({
    name,
    rowSpan,
    defaultRowSpan,
    onRowSpanChange,
}: {
    name: string;
    rowSpan: number;
    defaultRowSpan: number;
    onRowSpanChange: (name: string, rowSpan: number) => void;
}) {
    const resize = useRowSpanResize(
        name,
        rowSpan,
        MAX_ROW_SPAN,
        TEMPLATE_GRID_GAP,
        onRowSpanChange
    );
    return (
        <div
            className="field-resize-row"
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: -2,
                height: 7,
                cursor: 'ns-resize',
                zIndex: 4,
                touchAction: 'none',
                borderBottom: '2px solid transparent',
                borderRadius: '0 0 6px 6px',
            }}
            onPointerDown={resize.onPointerDown}
            onPointerMove={resize.onPointerMove}
            onPointerUp={resize.onPointerUp}
            onDoubleClick={() => onRowSpanChange(name, defaultRowSpan)}
            title="Drag to change how many rows the field spans (double-click to reset)"
        />
    );
}

/* -------------------------------------------------------------------------- */
/*  Draggable item                                                            */
/* -------------------------------------------------------------------------- */

function GridItem({
    field,
    index,
    columns,
    interactive,
    onSpanChange,
    onRowSpanChange,
    renderItem,
}: {
    field: ResolvedField;
    index: number;
    columns: number;
    interactive: boolean;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowSpanChange: (name: string, rowSpan: number) => void;
    renderItem: LayoutGridProps['renderItem'];
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({ id: field.name, disabled: !interactive });

    const row = field.rowStart ?? 1;
    const rowSpan = clampRowSpan(field.rowSpan ?? 1);
    const colSpan = Math.min(field.span ?? columns, columns) as TemplateSpan;
    const colStart =
        !field.fullWidth && field.colStart
            ? clampColStart(field.colStart, colSpan, columns)
            : null;
    const gridColumn = colStart
        ? `${colStart} / span ${colSpan}`
        : `span ${colSpan}`;

    const dragHandleProps = interactive
        ? ({
              ...attributes,
              ...(listeners ?? {}),
          } as unknown as DragHandleProps)
        : undefined;

    const style: CSSProperties = {
        gridColumn,
        gridRow: `${row} / span ${rowSpan}`,
        alignSelf: interactive ? 'stretch' : 'start',
        minWidth: 0,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        position: 'relative',
        zIndex: isDragging ? 5 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div className="field-layout-item" ref={setNodeRef} style={style}>
            <div className="field-layout-content" style={{ minWidth: 0 }}>
                {renderItem(field, index, dragHandleProps)}
            </div>
            {interactive && (
                <>
                    <SpanResizeHandle
                        name={field.name}
                        span={field.span}
                        columns={columns}
                        onSpanChange={onSpanChange}
                    />
                    <RowSpanHandle
                        name={field.name}
                        rowSpan={rowSpan}
                        defaultRowSpan={ROW_SPAN_BY_TYPE[field.type] ?? 1}
                        onRowSpanChange={onRowSpanChange}
                    />
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Positioning                                                               */
/* -------------------------------------------------------------------------- */

type PreviewTarget =
    | {
          kind: 'cell';
          row: number;
          col: number;
          colSpan: number;
          rowSpan: number;
      }
    | {
          kind: 'insert';
          boundary: number;
          col: number;
          colSpan: number;
          rowSpan: number;
          y: number;
          x: number;
          w: number;
      };

/* -------------------------------------------------------------------------- */
/*  Grid                                                                      */
/* -------------------------------------------------------------------------- */

function DndGrid({
    items,
    columns,
    interactive,
    onMove,
    onSpanChange,
    onRowSpanChange,
    renderItem,
    canonicalIndex,
}: {
    items: ResolvedField[];
    columns: number;
    interactive: boolean;
    onMove: (name: string, target: DropTarget) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowSpanChange: (name: string, rowSpan: number) => void;
    renderItem: LayoutGridProps['renderItem'];
    canonicalIndex: (name: string) => number;
}) {
    const gridRef = useRef<HTMLDivElement>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<PreviewTarget | null>(null);

    const positioned = useMemo(
        () => withBandPositions(items, columns),
        [items, columns]
    );

    const rowCount = positioned.reduce(
        (m, f) => Math.max(m, f.rowStart + f.rowSpan - 1),
        0
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        })
    );

    // Resolves the dragged card's rectangle to a drop target. A pointer within
    // the thin insert zone around a band boundary targets a new band in the
    // column under the pointer; otherwise it targets the band it is over. Band
    // pixel sizes are read from the grid's resolved tracks so the math matches
    // what is on screen.
    function targetFor(
        rect: { left: number; top: number; height: number },
        field: ResolvedField
    ): PreviewTarget | null {
        const grid = gridRef.current;
        if (!grid) return null;
        const gridRect = grid.getBoundingClientRect();
        const colSpan = Math.min(
            field.span ?? columns,
            columns
        ) as TemplateSpan;
        const rowSpan = clampRowSpan(field.rowSpan ?? 1);
        const relX = rect.left - gridRect.left;
        const relY = rect.top - gridRect.top;

        const colWidth =
            (gridRect.width - TEMPLATE_GRID_GAP * (columns - 1)) / columns;
        const colStep = colWidth + TEMPLATE_GRID_GAP;
        const col = clampColStart(
            Math.floor(Math.max(0, relX) / colStep) + 1,
            colSpan,
            columns
        );

        const sizes = getComputedStyle(grid)
            .gridTemplateRows.split(' ')
            .map((s) => parseFloat(s))
            .filter((n) => Number.isFinite(n));
        const topOf = (r: number) => {
            let y = 0;
            for (let i = 0; i < r - 1 && i < sizes.length; i++)
                y += sizes[i] + TEMPLATE_GRID_GAP;
            return y;
        };
        const bottomOf = (r: number) => topOf(r) + (sizes[r - 1] ?? 0);
        const boundaryY = (b: number) => {
            if (b <= 1) return -TEMPLATE_GRID_GAP / 2;
            if (b > rowCount) return bottomOf(rowCount) + TEMPLATE_GRID_GAP / 2;
            return bottomOf(b - 1) + TEMPLATE_GRID_GAP / 2;
        };

        if (rowCount === 0) {
            return {
                kind: 'insert',
                boundary: 1,
                col,
                colSpan,
                rowSpan,
                y: 0,
                x: (col - 1) * colStep,
                w: colSpan * colWidth + (colSpan - 1) * TEMPLATE_GRID_GAP,
            };
        }

        // Pick the nearest boundary whose clamped zone contains the pointer.
        let insertAt: number | null = null;
        let insertDist = Infinity;
        for (let b = 1; b <= rowCount + 1; b++) {
            const y = boundaryY(b);
            const above = b > 1 ? (sizes[b - 2] ?? 0) / 2 : INSERT_HALF;
            const below = b <= rowCount ? (sizes[b - 1] ?? 0) / 2 : INSERT_HALF;
            const halfAbove = Math.min(INSERT_HALF, above);
            const halfBelow = Math.min(INSERT_HALF, below);
            if (relY >= y - halfAbove && relY <= y + halfBelow) {
                const d = Math.abs(relY - y);
                if (d < insertDist) {
                    insertDist = d;
                    insertAt = b;
                }
            }
        }

        const columnX = (col - 1) * colStep;
        const columnW = colSpan * colWidth + (colSpan - 1) * TEMPLATE_GRID_GAP;

        if (insertAt != null) {
            return {
                kind: 'insert',
                boundary: insertAt,
                col,
                colSpan,
                rowSpan,
                y: boundaryY(insertAt),
                x: columnX,
                w: columnW,
            };
        }

        let row = rowCount;
        for (let r = 1; r <= rowCount; r++) {
            if (relY <= bottomOf(r) + TEMPLATE_GRID_GAP / 2) {
                row = r;
                break;
            }
        }
        return { kind: 'cell', row, col, colSpan, rowSpan };
    }

    function handleDragStart(e: DragStartEvent) {
        setActiveId(String(e.active.id));
    }

    function handleDragMove(e: DragMoveEvent) {
        const field = items.find((f) => f.name === String(e.active.id));
        const rect = e.active.rect.current.translated;
        if (!field || !rect) return;
        setDropTarget(
            targetFor(
                { left: rect.left, top: rect.top, height: rect.height },
                field
            )
        );
    }

    function handleDragEnd(e: DragEndEvent) {
        const name = String(e.active.id);
        const target = dropTarget;
        setActiveId(null);
        setDropTarget(null);
        if (target) {
            onMove(
                name,
                target.kind === 'insert'
                    ? {
                          kind: 'insert',
                          boundary: target.boundary,
                          col: target.col,
                      }
                    : { kind: 'cell', row: target.row, col: target.col }
            );
        }
    }

    function handleDragCancel() {
        setActiveId(null);
        setDropTarget(null);
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div
                ref={gridRef}
                className="field-layout-grid"
                style={GRID_STYLES(columns, rowCount)}
            >
                {positioned.map((field) => (
                    <GridItem
                        key={field.name}
                        field={field}
                        index={canonicalIndex(field.name)}
                        columns={columns}
                        interactive={interactive}
                        onSpanChange={onSpanChange}
                        onRowSpanChange={onRowSpanChange}
                        renderItem={renderItem}
                    />
                ))}
                {interactive && activeId && dropTarget && (
                    <DropPreview target={dropTarget} />
                )}
            </div>
        </DndContext>
    );
}

function DropPreview({ target }: { target: PreviewTarget }) {
    if (target.kind === 'cell') {
        return (
            <div
                className="field-drop-preview"
                style={{
                    gridColumn: `${target.col} / span ${target.colSpan}`,
                    gridRow: `${target.row} / span ${target.rowSpan}`,
                }}
            />
        );
    }
    return (
        <div
            className="field-drop-insert"
            style={{ top: target.y - 1 }}
            aria-hidden
        >
            <div
                className="field-drop-insert-col"
                style={{ left: target.x, width: target.w }}
            />
        </div>
    );
}

// Props the grid hands back to `renderItem` so the field card can make its own
// drag icon the handle, rather than the grid drawing a separate grip.
export type DragHandleProps = HTMLAttributes<HTMLElement>;

export type LayoutGridProps = {
    fields: FieldDefinition[];
    layout: TemplateLayout;
    columns: number;
    interactive: boolean;
    onMove: (name: string, target: DropTarget) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowSpanChange: (name: string, rowSpan: number) => void;
    renderItem: (
        field: ResolvedField,
        index: number,
        dragHandleProps?: DragHandleProps
    ) => ReactNode;
};

// Renders the effective template as a table of content-height bands. A field
// can span several bands and/or columns; the grid reserves the rectangle and
// later fields fill the free cells beside it. Thin insert lines between bands
// are shown only while dragging, as column-aware targets for a new band.
export function FieldLayoutGrid({
    fields,
    layout,
    columns,
    interactive,
    onMove,
    onSpanChange,
    onRowSpanChange,
    renderItem,
}: LayoutGridProps) {
    const items = useMemo(
        () => applyLayout(orderByLayout(fields, layout.order), layout),
        [fields, layout]
    );
    const canonicalIndex = useCallback(
        (name: string) => fields.findIndex((f) => f.name === name),
        [fields]
    );

    return (
        <DndGrid
            items={items}
            columns={Math.max(1, columns)}
            interactive={interactive}
            onMove={onMove}
            onSpanChange={onSpanChange}
            onRowSpanChange={onRowSpanChange}
            renderItem={renderItem}
            canonicalIndex={canonicalIndex}
        />
    );
}
