// A field definition resolved against a layout: identical to what is stored,
// plus the display position the layout assigns it. `span`/`rowSpan`/

import type { SeriesTemplate } from '../../series';
import type { CompendiumCategory } from '../compendium';

// `rowStart`/`colStart` are derived, never persisted inside `customFields`.
export type ResolvedField = FieldDefinition & {
    span?: TemplateSpan;
    rowSpan?: number;
    colStart?: number;
    rowStart?: number;
    fullWidth?: boolean;
};

export type ResolvedTemplateInfo = {
    fields: ResolvedField[];
    columns: number;
    layout: TemplateLayout;
    seriesTemplate: SeriesTemplate | null;
    projectTemplate: EntityTemplate | null;
};

export type VisibilityOperator =
    | 'isTrue'
    | 'isFalse'
    | 'isEmpty'
    | 'notEmpty'
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'in'
    | 'notIn'
    | 'greaterThan'
    | 'lessThan';

export type VisibilityCondition = {
    field: string;
    operator: VisibilityOperator;
    value?: string | number | boolean | string[];
};

export type FieldVisibility = {
    mode: 'all' | 'any';
    conditions: VisibilityCondition[];
};

export type FieldDefinition = {
    name: string;
    type:
        | 'text'
        | 'number'
        | 'textarea'
        | 'select'
        | 'checkbox'
        | 'date'
        | 'file'
        | 'multiselect'
        | 'entitylink'
        | 'richtext'
        | 'color'
        | 'toggle'
        | 'range'
        | 'portrait'
        | 'images'
        | 'tree';
    label: string;
    required: boolean;
    disabled?: boolean;
    options?: string[];
    rangeMin?: number;
    rangeMax?: number;
    rangeStep?: number;
    entitylinkCategories?: CompendiumCategory[];
    treeRelations?: { relation: string; inverse: string }[];
    visibleWhen?: FieldVisibility;
};

// A field may span up to MAX_COLUMNS columns, keeping step with the column
// count a layout can reach (spans can never exceed the grid width).
export type TemplateSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// Presentation state for a template, stored separately from the field
// definitions it lays out. The grid is a real table: `columns` controls how
// many columns wide it is, and every populated row is a content-height band.
// A field occupies a `rowSpan × colSpan` rectangle of bands/cells, so a tall
// field (a portrait) can span several rows. `order` is the canonical display
// order as field names (name is the identity key used everywhere fields are
// merged), `spans` maps a field name to how many grid columns it occupies,
// `rowSpans` maps a field name to how many bands it spans, `cols` pins a
// field's starting column (1-based) so empty columns can be left between
// fields, and `rowStarts` maps a field name to the band (row) it starts in.
// `fullWidth` marks a field that always spans every column regardless of the
// column count.
export type TemplateLayout = {
    order: string[];
    spans: Record<string, TemplateSpan>;
    rowSpans: Record<string, number>;
    cols: Record<string, number>;
    rowStarts: Record<string, number>;
    fullWidth: Record<string, true>;
    // Layout model version. Absent/older means the position keys predate the
    // band model, so the editor re-packs the layout before showing it.
    version?: number;
    // Grid column count. Null/absent falls back to DEFAULT_TEMPLATE_COLUMNS.
    columns: number | null;
};

export type EntityTemplate = {
    id: string;
    projectId: string | null;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
    layout: TemplateLayout | null;
    createdAt: Date;
    updatedAt: Date;
};

export type FileTab = {
    id: string;
    name: string;
    type:
        | 'file'
        | 'chapter'
        | CompendiumCategory
        | 'compendium-new'
        | 'plot-architecture';
    filePath: string;
    isModified: boolean;
    category?: CompendiumCategory;
};
