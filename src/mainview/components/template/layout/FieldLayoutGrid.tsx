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

import { MAX_COLUMNS } from '../../../types';
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
import type {
    TemplateSpan,
    ResolvedField,
    FieldDefinition,
    TemplateLayout,
} from '../../../../shared/types/project/templates';

export const TEMPLATE_GRID_GAP = 12;

export const TEMPLATE_INSERT_ZONE = 24;
const INSERT_HALF = TEMPLATE_INSERT_ZONE / 2;

const GRID_STYLES = (columns: number, rows: number): CSSProperties => {
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
        gridTemplateRows:
            rows > 0
                ? `repeat(${rows}, minmax(var(--band-unit, 96px), auto))`
                : undefined,
        gap: TEMPLATE_GRID_GAP,
        position: 'relative',
    };
};

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

function GridItem({
    field,
    index,
    columns,
    interactive,
    activeField,
    onHoverField,
    onSpanChange,
    onRowSpanChange,
    renderItem,
}: {
    field: ResolvedField;
    index: number;
    columns: number;
    interactive: boolean;
    activeField: string | null;
    onHoverField?: (name: string | null) => void;
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
        : `1 / span ${colSpan}`;

    const dragHandleProps = interactive
        ? ({
              ...attributes,
              ...(listeners ?? {}),
          } as unknown as DragHandleProps)
        : undefined;

    const style: CSSProperties = {
        gridColumn,
        gridRow: `${row} / span ${rowSpan}`,
        alignSelf: 'stretch',
        minWidth: 0,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        position: 'relative',
        zIndex: isDragging ? 5 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            className={
                'field-layout-item' +
                (activeField === field.name ? ' field-linked' : '')
            }
            ref={setNodeRef}
            style={style}
            data-field={field.name}
            onMouseEnter={
                interactive && onHoverField
                    ? () => onHoverField(field.name)
                    : undefined
            }
            onMouseLeave={
                interactive && onHoverField
                    ? () => onHoverField(null)
                    : undefined
            }
        >
            <div
                className="field-layout-content"
                style={{ minWidth: 0, height: '100%' }}
            >
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

function GridGuide({ columns, rows }: { columns: number; rows: number }) {
    if (rows <= 0) return null;
    const cells = [];
    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= columns; c++) {
            cells.push(
                <div
                    key={`${r},${c}`}
                    className="field-grid-guide-cell"
                    style={{ gridColumn: `${c}`, gridRow: `${r}` }}
                    aria-hidden
                />
            );
        }
    }
    return <>{cells}</>;
}

function GridGuideLabels({ columns, rows }: { columns: number; rows: number }) {
    if (rows <= 0) return null;
    const cells = [];
    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= columns; c++) {
            cells.push(
                <div
                    key={`${r},${c}`}
                    className="field-grid-guide-label"
                    style={{ gridColumn: `${c}`, gridRow: `${r}` }}
                    aria-hidden
                >
                    <span className="field-grid-guide-col">{c}</span>
                    <span className="field-grid-guide-row">{r}</span>
                </div>
            );
        }
    }
    return <>{cells}</>;
}

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
      }
    | {
          kind: 'insertCol';
          boundary: number;
          col: number;
          row: number;
          colSpan: number;
          rowSpan: number;
          x: number;
          y: number;
          h: number;
      };

function DndGrid({
    items,
    columns,
    interactive,
    activeField,
    onHoverField,
    onMove,
    onSpanChange,
    onRowSpanChange,
    renderItem,
    canonicalIndex,
}: {
    items: ResolvedField[];
    columns: number;
    interactive: boolean;
    activeField: string | null;
    onHoverField?: (name: string | null) => void;
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
        const colLeftX = (c: number) => (c - 1) * colStep;
        const colRightX = (c: number) => colLeftX(c) + colWidth;
        const boundaryX = (b: number) => {
            if (b <= 1) return -TEMPLATE_GRID_GAP / 2;
            if (b > columns) return colRightX(columns) + TEMPLATE_GRID_GAP / 2;
            return colRightX(b - 1) + TEMPLATE_GRID_GAP / 2;
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

        let insertColAt: number | null = null;
        let insertColDist = Infinity;
        if (columns < MAX_COLUMNS) {
            for (let b = 1; b <= columns + 1; b++) {
                const x = boundaryX(b);
                const left = b > 1 ? colWidth / 2 : INSERT_HALF;
                const right = b <= columns ? colWidth / 2 : INSERT_HALF;
                const halfLeft = Math.min(INSERT_HALF, left);
                const halfRight = Math.min(INSERT_HALF, right);
                if (relX >= x - halfLeft && relX <= x + halfRight) {
                    const d = Math.abs(relX - x);
                    if (d < insertColDist) {
                        insertColDist = d;
                        insertColAt = b;
                    }
                }
            }
        }

        let row = rowCount;
        for (let r = 1; r <= rowCount; r++) {
            if (relY <= bottomOf(r) + TEMPLATE_GRID_GAP / 2) {
                row = r;
                break;
            }
        }

        const columnX = (col - 1) * colStep;
        const columnW = colSpan * colWidth + (colSpan - 1) * TEMPLATE_GRID_GAP;

        if (
            insertColAt != null &&
            (insertAt == null || insertColDist < insertDist)
        ) {
            return {
                kind: 'insertCol',
                boundary: insertColAt,
                col: insertColAt,
                row,
                colSpan,
                rowSpan,
                x: boundaryX(insertColAt),
                y: topOf(row),
                h: bottomOf(Math.min(row + rowSpan - 1, rowCount)) - topOf(row),
            };
        }

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
            if (target.kind === 'insert')
                onMove(name, {
                    kind: 'insert',
                    boundary: target.boundary,
                    col: target.col,
                });
            else if (target.kind === 'insertCol')
                onMove(name, {
                    kind: 'insertCol',
                    boundary: target.boundary,
                    row: target.row,
                });
            else
                onMove(name, {
                    kind: 'cell',
                    row: target.row,
                    col: target.col,
                });
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
                {interactive && <GridGuide columns={columns} rows={rowCount} />}
                {positioned.map((field) => (
                    <GridItem
                        key={field.name}
                        field={field}
                        index={canonicalIndex(field.name)}
                        columns={columns}
                        interactive={interactive}
                        activeField={activeField}
                        onHoverField={onHoverField}
                        onSpanChange={onSpanChange}
                        onRowSpanChange={onRowSpanChange}
                        renderItem={renderItem}
                    />
                ))}
                {interactive && activeId && dropTarget && (
                    <DropPreview target={dropTarget} />
                )}
                {interactive && (
                    <GridGuideLabels columns={columns} rows={rowCount} />
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
    if (target.kind === 'insertCol') {
        return (
            <div
                className="field-drop-insert-v"
                style={{ left: target.x - 1 }}
                aria-hidden
            >
                <div
                    className="field-drop-insert-v-col"
                    style={{ top: target.y, height: target.h }}
                />
            </div>
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

export type DragHandleProps = HTMLAttributes<HTMLElement>;

export type LayoutGridProps = {
    fields: FieldDefinition[];
    layout: TemplateLayout;
    columns: number;
    interactive: boolean;
    activeField?: string | null;
    onHoverField?: (name: string | null) => void;
    onMove: (name: string, target: DropTarget) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowSpanChange: (name: string, rowSpan: number) => void;
    renderItem: (
        field: ResolvedField,
        index: number,
        dragHandleProps?: DragHandleProps
    ) => ReactNode;
};

export function FieldLayoutGrid({
    fields,
    layout,
    columns,
    interactive,
    activeField = null,
    onHoverField,
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
            activeField={activeField}
            onHoverField={onHoverField}
            onMove={onMove}
            onSpanChange={onSpanChange}
            onRowSpanChange={onRowSpanChange}
            renderItem={renderItem}
            canonicalIndex={canonicalIndex}
        />
    );
}
