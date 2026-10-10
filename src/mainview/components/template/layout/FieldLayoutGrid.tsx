import { useMemo } from 'react';
import type {
    CSSProperties,
    HTMLAttributes,
    ReactNode,
    PointerEvent as ReactPointerEvent,
} from 'react';
import { Reorder, useDragControls } from 'framer-motion';
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
import { applySpans, orderByLayout } from '../../../templates/mergeFields';
import { useSpanResize } from './useSpanResize';
import type { LayoutEngineId } from '../../../hooks/useLayoutEngine';

/* -------------------------------------------------------------------------- */
/*  Shared item furniture                                                     */
/* -------------------------------------------------------------------------- */

const GRID_STYLES = (columns: number): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
    gap: 12,
});

function ResizeHandle({
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

/* -------------------------------------------------------------------------- */
/*  Framer Motion engine                                                      */
/* -------------------------------------------------------------------------- */

function FramerItem({
    field,
    index,
    columns,
    interactive,
    onSpanChange,
    renderItem,
}: {
    field: ResolvedField;
    index: number;
    columns: number;
    interactive: boolean;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    renderItem: LayoutGridProps['renderItem'];
}) {
    const controls = useDragControls();
    const span = Math.min(field.span ?? columns, columns) as TemplateSpan;
    return (
        <Reorder.Item
            value={field}
            dragListener={false}
            dragControls={interactive ? controls : undefined}
            className="field-layout-item"
            style={{ gridColumn: `span ${span}`, position: 'relative' }}
        >
            {interactive && (
                <GripHandle
                    onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) =>
                        controls.start(e)
                    }
                />
            )}
            {renderItem(field, index)}
            {interactive && (
                <ResizeHandle
                    name={field.name}
                    span={span}
                    columns={columns}
                    onSpanChange={onSpanChange}
                />
            )}
        </Reorder.Item>
    );
}

function FramerGrid({
    items,
    columns,
    interactive,
    onReorder,
    onSpanChange,
    renderItem,
    canonicalIndex,
}: {
    items: ResolvedField[];
    columns: number;
    interactive: boolean;
    onReorder: (order: string[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    renderItem: LayoutGridProps['renderItem'];
    canonicalIndex: (name: string) => number;
}) {
    return (
        <Reorder.Group
            as="div"
            axis="y"
            values={items}
            onReorder={(next) => onReorder(next.map((f) => f.name))}
            style={GRID_STYLES(columns)}
        >
            {items.map((field) => (
                <FramerItem
                    key={field.name}
                    field={field}
                    index={canonicalIndex(field.name)}
                    columns={columns}
                    interactive={interactive}
                    onSpanChange={onSpanChange}
                    renderItem={renderItem}
                />
            ))}
        </Reorder.Group>
    );
}

/* -------------------------------------------------------------------------- */
/*  dnd-kit engine                                                            */
/* -------------------------------------------------------------------------- */

function SortableItem({
    field,
    index,
    columns,
    interactive,
    onSpanChange,
    renderItem,
}: {
    field: ResolvedField;
    index: number;
    columns: number;
    interactive: boolean;
    onSpanChange: (name: string, span: TemplateSpan) => void;
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
    const span = Math.min(field.span ?? columns, columns) as TemplateSpan;
    const style: CSSProperties = {
        gridColumn: `span ${span}`,
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.85 : 1,
    };
    return (
        <div
            className="field-layout-item"
            ref={setNodeRef}
            style={style}
            {...attributes}
        >
            {interactive && (
                <GripHandle
                    {...((listeners ?? {}) as HTMLAttributes<HTMLDivElement>)}
                />
            )}
            {renderItem(field, index)}
            {interactive && (
                <ResizeHandle
                    name={field.name}
                    span={span}
                    columns={columns}
                    onSpanChange={onSpanChange}
                />
            )}
        </div>
    );
}

function DndGrid({
    items,
    columns,
    interactive,
    onReorder,
    onSpanChange,
    renderItem,
    canonicalIndex,
}: {
    items: ResolvedField[];
    columns: number;
    interactive: boolean;
    onReorder: (order: string[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
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
                            renderItem={renderItem}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

/* -------------------------------------------------------------------------- */
/*  Grid                                                                      */
/* -------------------------------------------------------------------------- */

export type LayoutGridProps = {
    fields: FieldDefinition[];
    layout: TemplateLayout;
    columns: number;
    interactive: boolean;
    engine: LayoutEngineId;
    onReorder: (order: string[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    renderItem: (field: ResolvedField, index: number) => ReactNode;
};

// Renders the effective template as a grid of width-per-field items. The drag
// engine is swappable at runtime (framer-motion or dnd-kit); both feed the same
// layout state, so switching engines never changes what is persisted.
export function FieldLayoutGrid({
    fields,
    layout,
    columns,
    interactive,
    engine,
    onReorder,
    onSpanChange,
    renderItem,
}: LayoutGridProps) {
    const items = useMemo(
        () => applySpans(orderByLayout(fields, layout.order), layout),
        [fields, layout]
    );
    const canonicalIndex = (name: string) =>
        fields.findIndex((f) => f.name === name);

    const shared = {
        items,
        columns: Math.max(1, columns),
        interactive,
        onReorder,
        onSpanChange,
        renderItem,
        canonicalIndex,
    };

    return engine === 'dnd' ? (
        <DndGrid {...shared} />
    ) : (
        <FramerGrid {...shared} />
    );
}
