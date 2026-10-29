import { useMemo } from 'react';

import { DEFAULT_TEMPLATE_COLUMNS } from '../../types';
import { FieldLayoutGrid } from './layout/FieldLayoutGrid';
import TemplateField, { type EntryRef } from './TemplateField';
import type {
    FieldDefinition,
    TemplateLayout,
    TemplateSpan,
    ResolvedField,
} from '../../../shared/types/project/templates';

type Props = {
    tmplFields: FieldDefinition[];
    templateData?: Record<string, unknown> | null;
    columns?: number;
    layout?: TemplateLayout | null;
    onUpdate?: (fieldName: string, value: unknown) => void;
    entry?: { id: string; name: string };
    characters?: EntryRef[];
    locations?: EntryRef[];
    organizations?: EntryRef[];
    items?: EntryRef[];
    loreEntries?: EntryRef[];
};

// Reading view for a template. It shares the exact grid the editors use, so the
// masonry packing and any grown field heights look identical to the author's
// arrangement; it simply renders fields non-interactively.
export default function TemplateTab({
    tmplFields,
    templateData,
    columns = DEFAULT_TEMPLATE_COLUMNS,
    layout,
    onUpdate,
    entry,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
}: Props) {
    // Fields arriving from a resolved template already carry their span/row and
    // order. When no layout is supplied, rebuild one from the field list so the
    // grid has a total layout to work from.
    const effectiveLayout = useMemo<TemplateLayout>(() => {
        if (layout) return layout;
        const spans: Record<string, TemplateSpan> = {};
        const cols: Record<string, number> = {};
        const rowStarts: Record<string, number> = {};
        const rowSpans: Record<string, number> = {};
        const fullWidth: Record<string, true> = {};
        for (const f of tmplFields) {
            const rf = f as ResolvedField;
            if (rf.span != null) spans[f.name] = rf.span;
            if (rf.colStart != null) cols[f.name] = rf.colStart;
            if (rf.rowStart != null) rowStarts[f.name] = rf.rowStart;
            if (rf.rowSpan != null) rowSpans[f.name] = rf.rowSpan;
            if (rf.fullWidth) fullWidth[f.name] = true;
        }
        return {
            order: tmplFields.map((f) => f.name),
            spans,
            rowSpans,
            cols,
            rowStarts,
            fullWidth,
            columns,
        };
    }, [layout, tmplFields, columns]);

    return (
        <FieldLayoutGrid
            fields={tmplFields}
            layout={effectiveLayout}
            columns={columns}
            interactive={false}
            onMove={() => {}}
            onSpanChange={() => {}}
            onRowSpanChange={() => {}}
            renderItem={(field, index) => (
                <TemplateField
                    mode="view"
                    field={field}
                    index={index}
                    value={templateData?.[field.name]}
                    onChange={(value) => onUpdate?.(field.name, value)}
                    entry={entry}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    items={items}
                    loreEntries={loreEntries}
                />
            )}
        />
    );
}
