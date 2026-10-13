import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TemplateSpan } from '../../../types';
import { MAX_COLUMNS } from '../../../types';

// A span is only meaningful up to the active column count; anything wider would
// overflow the grid. Clamps to 1..columns (bounded by the 1..MAX_COLUMNS range
// of the persisted type).
export function clampSpanFor(columns: number) {
    const max = Math.max(1, Math.min(MAX_COLUMNS, Math.floor(columns) || 1));
    return (span: number): TemplateSpan =>
        Math.min(Math.max(1, Math.round(span)), max) as TemplateSpan;
}

// Drag-the-right-edge width resize. The handle carries pointer handlers that
// derive the next width from the pointer delta against the column width
// measured when the drag started. `onChange(name, span)` fires on every move so
// the grid reflows live; callers are expected to debounce the persistence.
export function useSpanResize(
    name: string,
    span: TemplateSpan | undefined,
    columns: number,
    onChange: (name: string, span: TemplateSpan) => void
) {
    const session = useRef<{
        startX: number;
        colWidth: number;
        startSpan: number;
    } | null>(null);

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const item = (e.currentTarget as HTMLElement).parentElement;
        if (!item) return;
        const rect = item.getBoundingClientRect();
        const startSpan = span ?? columns;
        session.current = {
            startX: e.clientX,
            colWidth: Math.max(1, rect.width / Math.max(1, startSpan)),
            startSpan,
        };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const s = session.current;
        if (!s) return;
        const width = s.colWidth * s.startSpan + (e.clientX - s.startX);
        onChange(name, clampSpanFor(columns)(width / s.colWidth));
    }

    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        session.current = null;
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    }

    return { onPointerDown, onPointerMove, onPointerUp };
}

// Drag-the-bottom-edge row-span resize. The handle changes how many bands the
// field covers, one band per step: the pointer delta is divided by the field's
// current per-band pitch (its rendered height plus the grid gap over its
// current span) and rounded, so the field snaps to whole bands. `maxSpan` caps
// it so a field can never grow past the persisted span range.
export function useRowSpanResize(
    name: string,
    rowSpan: number | undefined,
    maxSpan: number,
    gap: number,
    onChange: (name: string, rowSpan: number) => void
) {
    const session = useRef<{
        startY: number;
        pitch: number;
        startSpan: number;
    } | null>(null);

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const item = (e.currentTarget as HTMLElement).parentElement;
        if (!item) return;
        const rect = item.getBoundingClientRect();
        const startSpan = Math.max(1, rowSpan ?? 1);
        const pitch = Math.max(1, (rect.height + gap) / startSpan);
        session.current = { startY: e.clientY, pitch, startSpan };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
        const s = session.current;
        if (!s) return;
        const delta = Math.round((e.clientY - s.startY) / s.pitch);
        const next = Math.min(Math.max(1, s.startSpan + delta), maxSpan);
        onChange(name, next);
    }

    function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
        session.current = null;
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    }

    return { onPointerDown, onPointerMove, onPointerUp };
}
