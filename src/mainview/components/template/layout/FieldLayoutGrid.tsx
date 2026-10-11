import { useEffect, useMemo, useRef, useState } from 'react';
import type {
    CSSProperties,
    HTMLAttributes,
    ReactNode,
    RefObject,
} from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
    FieldDefinition,
    ResolvedField,
    TemplateLayout,
    TemplateSpan,
} from '../../../types';
import { applyLayout, orderByLayout } from '../../../templates/mergeFields';
import { useRowResize, useSpanResize } from './useSpanResize';

/* -------------------------------------------------------------------------- */
/*  Grid metrics                                                              */
/* -------------------------------------------------------------------------- */

// Every field's height is expressed as a whole number of these base row units.
// The grid uses exactly this track height, so heights snap to it and no row is
// ever dictated by the tallest field in it.
export const TEMPLATE_ROW_UNIT = 8;
export const TEMPLATE_GRID_GAP = 12;

// Field types whose height is worth growing by hand. Single-line inputs have no
// height to speak of, and portrait derives its height from its width, so none
// of those get a bottom handle.
const ROW_RESIZABLE_TYPES: ReadonlySet<FieldDefinition['type']> = new Set([
    'textarea',
    'richtext',
    'images',
    'tree',
]);

const GRID_STYLES = (columns: number): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
    gridAutoRows: `${TEMPLATE_ROW_UNIT}px`,
    // Dense flow lets a short field backfill the vertical space left beside a
    // tall neighbour, which is the whole point of the masonry packing.
    gridAutoFlow: 'dense',
    alignItems: 'start',
    gap: TEMPLATE_GRID_GAP,
});

/* -------------------------------------------------------------------------- */
/*  Auto height                                                               */
/* -------------------------------------------------------------------------- */

// Measures a field's natural content height and converts it to whole row units.
// The measured node is the content wrapper, whose height is driven by the field
// itself and never by the row span we apply, so growing a field can't feed back
// into its own measurement.
function useAutoRowSpan(
    ref: RefObject<HTMLDivElement | null>,
    unit: number,
    gap: number
): number {
    const [rows, setRows] = useState(1);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const measure = () => {
            const h = node.getBoundingClientRect().height;
            const next = Math.max(1, Math.ceil((h + gap) / (unit + gap)));
            setRows((prev) => (prev === next ? prev : next));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, unit, gap]);
    return rows;
}

/* -------------------------------------------------------------------------- */
/*  Item furniture                                                            */
/* -------------------------------------------------------------------------- */

function GripHandle(props: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            {...props}
            className="field-grip"
            style={{
                position: 'absolute',
                top: 4,
                left: 4,
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                color: '#888',
                cursor: 'grab',
                zIndex: 5,
                fontSize: 13,
                letterSpacing: -2,
                opacity: 0,
                transition: 'opacity 0.15s',
            }}
            title="Drag to reorder"
        >
            ⋮⋮
        </div>
    );
}

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

function RowResizeHandle({
    name,
    rows,
    minRows,
    onRowChange,
}: {
    name: string;
    rows: number;
    minRows: number;
    onRowChange: (name: string, rows: number) => void;
}) {
    const resize = useRowResize(
        name,
        rows,
        TEMPLATE_ROW_UNIT,
        TEMPLATE_GRID_GAP,
        minRows,
        onRowChange
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
            onDoubleClick={() => onRowChange(name, minRows)}
            title="Drag to resize height (double-click for auto)"
        />
    );
}

/* -------------------------------------------------------------------------- */
/*  Sortable item                                                             */
/* -------------------------------------------------------------------------- */

function SortableItem({
    field,
    index,
    columns,
    interactive,
    onSpanChange,
    onRowChange,
    renderItem,
}: {
    field: ResolvedField;
    index: number;
    columns: number;
    interactive: boolean;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowChange: (name: string, rows: number) => void;
    renderItem: LayoutGridProps['renderItem'];
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.name });

    const contentRef = useRef<HTMLDivElement>(null);
    const naturalRows = useAutoRowSpan(
        contentRef,
        TEMPLATE_ROW_UNIT,
        TEMPLATE_GRID_GAP
    );
    const manualRows = field.rowSpan;
    const rowSpan = Math.max(manualRows ?? 0, naturalRows);
    const colSpan = Math.min(field.span ?? columns, columns) as TemplateSpan;
    const canResizeRows = ROW_RESIZABLE_TYPES.has(field.type);

    const style: CSSProperties = {
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        alignSelf: 'start',
        minWidth: 0,
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.85 : 1,
    };

    return (
        <div className="field-layout-item" ref={setNodeRef} style={style}>
            {interactive && (
                <GripHandle
                    {...attributes}
                    {...((listeners ?? {}) as HTMLAttributes<HTMLDivElement>)}
                />
            )}
            <div
                className="field-layout-content"
                ref={contentRef}
                style={{ minWidth: 0 }}
            >
                {renderItem(field, index)}
            </div>
            {interactive && (
                <SpanResizeHandle
                    name={field.name}
                    span={field.span}
                    columns={columns}
                    onSpanChange={onSpanChange}
                />
            )}
            {interactive && canResizeRows && (
                <RowResizeHandle
                    name={field.name}
                    rows={manualRows ?? naturalRows}
                    minRows={naturalRows}
                    onRowChange={onRowChange}
                />
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Grid                                                                      */
/* -------------------------------------------------------------------------- */

function DndGrid({
    items,
    columns,
    interactive,
    onReorder,
    onSpanChange,
    onRowChange,
    renderItem,
    canonicalIndex,
}: {
    items: ResolvedField[];
    columns: number;
    interactive: boolean;
    onReorder: (order: string[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowChange: (name: string, rows: number) => void;
    renderItem: LayoutGridProps['renderItem'];
    canonicalIndex: (name: string) => number;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        })
    );

    function handleDragEnd(e: DragEndEvent) {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const ids = items.map((f) => f.name);
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from < 0 || to < 0) return;
        const next = [...ids];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map((f) => f.name)}
                strategy={rectSortingStrategy}
            >
                <div style={GRID_STYLES(columns)}>
                    {items.map((field) => (
                        <SortableItem
                            key={field.name}
                            field={field}
                            index={canonicalIndex(field.name)}
                            columns={columns}
                            interactive={interactive}
                            onSpanChange={onSpanChange}
                            onRowChange={onRowChange}
                            renderItem={renderItem}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

export type LayoutGridProps = {
    fields: FieldDefinition[];
    layout: TemplateLayout;
    columns: number;
    interactive: boolean;
    onReorder: (order: string[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowChange: (name: string, rows: number) => void;
    renderItem: (field: ResolvedField, index: number) => ReactNode;
};

// Renders the effective template as a dense grid of width/height spans. Rows
// are content-measured unless the user has grown a field, so a tall field never
// forces its neighbours' row to be tall.
export function FieldLayoutGrid({
    fields,
    layout,
    columns,
    interactive,
    onReorder,
    onSpanChange,
    onRowChange,
    renderItem,
}: LayoutGridProps) {
    const items = useMemo(
        () => applyLayout(orderByLayout(fields, layout.order), layout),
        [fields, layout]
    );
    const canonicalIndex = (name: string) =>
        fields.findIndex((f) => f.name === name);

    return (
        <DndGrid
            items={items}
            columns={Math.max(1, columns)}
            interactive={interactive}
            onReorder={onReorder}
            onSpanChange={onSpanChange}
            onRowChange={onRowChange}
            renderItem={renderItem}
            canonicalIndex={canonicalIndex}
        />
    );
}
