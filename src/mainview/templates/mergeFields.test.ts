import { describe, expect, test } from 'bun:test';
import type { FieldDefinition, TemplateLayout } from '../types';
import { DEFAULT_TEMPLATE_COLUMNS, LAYOUT_VERSION } from '../types';
import {
    applyLayout,
    effectiveLayout,
    fullMerge,
    getSeriesInheritedNames,
    normalizeLayout,
    orderByLayout,
} from './mergeFields';
import {
    applyDrop,
    autoArrangeLayout,
    packGridPositions,
    withBandPositions,
} from './autoArrange';

function field(
    name: string,
    extra: Partial<FieldDefinition> = {}
): FieldDefinition {
    return { name, label: name, required: false, type: 'text', ...extra };
}

function layout(partial: Partial<TemplateLayout> = {}): TemplateLayout {
    return {
        order: [],
        spans: {},
        rowSpans: {},
        cols: {},
        rowStarts: {},
        fullWidth: {},
        version: LAYOUT_VERSION,
        columns: DEFAULT_TEMPLATE_COLUMNS,
        ...partial,
    };
}

describe('orderByLayout', () => {
    test('returns a list with no order untouched', () => {
        const legacy = [field('a'), field('b'), field('c')];
        expect(orderByLayout(legacy, [])).toEqual(legacy);
    });

    test('does not mutate its input', () => {
        const input = [field('a'), field('b')];
        orderByLayout(input, ['b', 'a']);
        expect(input.map((f) => f.name)).toEqual(['a', 'b']);
    });

    test('sorts by the order list, not by array position', () => {
        const result = orderByLayout(
            [field('a'), field('b'), field('c')],
            ['b', 'c', 'a']
        );
        expect(result.map((f) => f.name)).toEqual(['b', 'c', 'a']);
    });

    test('appends names the order list does not mention', () => {
        const result = orderByLayout(
            [field('a'), field('b'), field('c'), field('fresh')],
            ['c', 'a']
        );
        expect(result.map((f) => f.name)).toEqual(['c', 'a', 'b', 'fresh']);
    });
});

describe('fullMerge', () => {
    test('returns series fields first, then project-only rows', () => {
        const series = [field('age'), field('species')];
        const project = [field('mood'), field('age')];

        const merged = fullMerge(project, series);
        expect(merged.map((f) => f.name)).toEqual(['age', 'species', 'mood']);
    });

    test('a project row can never replace a series definition', () => {
        const series = [field('age', { type: 'number' })];
        const project = [field('age', { type: 'text', disabled: true })];

        const merged = fullMerge(project, series);
        expect(merged).toHaveLength(1);
        expect(merged[0].type).toBe('number');
        expect(merged[0].disabled).toBe(true);
    });

    test('project-only rows keep their own shape', () => {
        const merged = fullMerge([field('b'), field('a')], null);
        expect(merged.map((f) => f.name)).toEqual(['b', 'a']);
    });

    test('an override cannot drag a disabled flag into the series', () => {
        const series = [field('age')];
        const merged = fullMerge([field('age', { disabled: true })], series);
        expect(merged).toHaveLength(1);
        expect(merged[0].disabled).toBe(true);
        // The merged label still belongs to the series definition.
        expect(merged[0].label).toBe('age');
    });
});

describe('effectiveLayout', () => {
    test('defaults columns when both rows are empty', () => {
        const result = effectiveLayout(null, null);
        expect(result.columns).toBe(DEFAULT_TEMPLATE_COLUMNS);
        expect(result.order).toEqual([]);
        expect(result.spans).toEqual({});
        expect(result.rowSpans).toEqual({});
        expect(result.cols).toEqual({});
        expect(result.rowStarts).toEqual({});
        expect(result.fullWidth).toEqual({});
    });

    test('series supplies order, spans, rowSpans, cols, rowStarts and fullWidth when the project has none', () => {
        const result = effectiveLayout(
            null,
            layout({
                order: ['a', 'b'],
                spans: { a: 2 },
                rowSpans: { a: 3 },
                cols: { b: 4 },
                rowStarts: { a: 3 },
                fullWidth: { a: true },
                columns: 3,
            })
        );
        expect(result.order).toEqual(['a', 'b']);
        expect(result.spans.a).toBe(2);
        expect(result.rowSpans.a).toBe(3);
        expect(result.cols.b).toBe(4);
        expect(result.rowStarts.a).toBe(3);
        expect(result.fullWidth.a).toBe(true);
        expect(result.columns).toBe(3);
    });

    test('project order, spans, rowSpans, cols, rowStarts and fullWidth win over the series', () => {
        const result = effectiveLayout(
            layout({
                order: ['b', 'a'],
                spans: { a: 1 },
                rowSpans: { a: 2 },
                cols: { b: 2 },
                rowStarts: { a: 1 },
                fullWidth: {},
                columns: 5,
            }),
            layout({
                order: ['a', 'b'],
                spans: { a: 2 },
                rowSpans: { a: 9 },
                cols: { b: 4 },
                rowStarts: { a: 9 },
                fullWidth: { a: true },
                columns: 3,
            })
        );
        expect(result.order).toEqual(['b', 'a']);
        expect(result.spans.a).toBe(1);
        expect(result.rowSpans.a).toBe(2);
        expect(result.cols.b).toBe(2);
        expect(result.rowStarts.a).toBe(1);
        expect(result.fullWidth.b).toBeUndefined();
        expect(result.columns).toBe(5);
    });

    test('defaults cols, rowStarts and fullWidth when a legacy layout omits them', () => {
        const result = effectiveLayout(
            { order: ['a'], spans: { a: 2 }, columns: 4 } as never,
            null
        );
        expect(result.rowSpans).toEqual({});
        expect(result.cols).toEqual({});
        expect(result.rowStarts).toEqual({});
        expect(result.fullWidth).toEqual({});
    });
});

describe('normalizeLayout', () => {
    test('keeps a numeric version and defaults everything else to empty', () => {
        expect(normalizeLayout({ version: 4 })?.version).toBe(4);
        expect(normalizeLayout({})?.version).toBeUndefined();
        expect(normalizeLayout({})?.rowSpans).toEqual({});
        expect(normalizeLayout(null)).toBeNull();
    });
});

describe('applyLayout', () => {
    test('attaches an explicit width and clamps it to the column count', () => {
        const defs = [field('a'), field('b')];
        const resolved = applyLayout(
            defs,
            layout({ spans: { a: 2 }, columns: 4 })
        );
        expect(resolved[0].span).toBe(2);
        expect(resolved[1].span).toBe(1);
        expect('span' in resolved[0]).toBe(true);
    });

    test('a field without a span falls back to its type width', () => {
        const textField = field('title');
        const textareaField = field('body', { type: 'textarea' });
        const resolved = applyLayout(
            [textField, textareaField],
            layout({ columns: 4 })
        );
        expect(resolved[0].span).toBe(1);
        expect(resolved[1].span).toBe(2);
    });

    test('a portrait defaults to spanning two rows', () => {
        const resolved = applyLayout(
            [field('portrait', { type: 'portrait' })],
            layout({ columns: 4 })
        );
        expect(resolved[0].rowSpan).toBe(2);
    });

    test('a field without a height falls back to one row', () => {
        const resolved = applyLayout([field('title')], layout({ columns: 4 }));
        expect(resolved[0].rowSpan).toBe(1);
    });

    test('an explicit row span wins and is clamped to the max', () => {
        const resolved = applyLayout(
            [field('a'), field('b')],
            layout({ rowSpans: { a: 3, b: 99 }, columns: 4 })
        );
        expect(resolved[0].rowSpan).toBe(3);
        expect(resolved[1].rowSpan).toBe(6);
    });

    test('a full-width flag resolves to every column', () => {
        const resolved = applyLayout(
            [field('a')],
            layout({ spans: { a: 2 }, fullWidth: { a: true }, columns: 4 })
        );
        expect(resolved[0].span).toBe(4);
        expect(resolved[0].fullWidth).toBe(true);
    });

    test('a start column and row are attached only for names the layout mentions', () => {
        const defs = [field('a'), field('b')];
        const resolved = applyLayout(
            defs,
            layout({ cols: { b: 4 }, rowStarts: { b: 2 }, columns: 4 })
        );
        expect(resolved[0].colStart).toBeUndefined();
        expect(resolved[0].rowStart).toBeUndefined();
        expect(resolved[1].colStart).toBe(4);
        expect(resolved[1].rowStart).toBe(2);
        expect('rowStart' in resolved[0]).toBe(false);
    });
});

describe('autoArrangeLayout', () => {
    test('packs fields left to right and wraps to the next band when full', () => {
        const result = autoArrangeLayout(
            [field('a'), field('b'), field('c'), field('d')],
            2
        );
        expect(result.order).toEqual(['a', 'b', 'c', 'd']);
        expect(result.cols).toEqual({ a: 1, b: 2, c: 1, d: 2 });
        expect(result.rowStarts).toEqual({ a: 1, b: 1, c: 2, d: 2 });
        expect(result.rowSpans).toEqual({ a: 1, b: 1, c: 1, d: 1 });
        expect(result.version).toBe(LAYOUT_VERSION);
    });

    test('a full-width field owns its own band', () => {
        const result = autoArrangeLayout(
            [field('a'), field('b', { type: 'textarea' })],
            2,
            layout({ fullWidth: { b: true } })
        );
        expect(result.fullWidth.b).toBe(true);
        expect(result.spans.b).toBe(2);
        expect(result.rowStarts.a).toBe(1);
        expect(result.rowStarts.b).toBe(2);
    });

    test('a taller field reserves its bands so later fields fill beside it', () => {
        const result = autoArrangeLayout(
            [field('p', { type: 'portrait' }), field('b')],
            2
        );
        expect(result.rowSpans.p).toBe(2);
        expect(result.rowStarts.p).toBe(1);
        expect(result.cols.p).toBe(1);
        // b tucks into the free cell beside the two-band portrait.
        expect(result.rowStarts.b).toBe(1);
        expect(result.cols.b).toBe(2);
    });

    test('reuses explicit spans from the base layout', () => {
        const result = autoArrangeLayout(
            [field('a'), field('b')],
            4,
            layout({ spans: { a: 3 } })
        );
        expect(result.spans.a).toBe(3);
        expect(result.cols.a).toBe(1);
        expect(result.cols.b).toBe(4);
    });

    test('drops previous positioning and renumbers bands from one', () => {
        const result = autoArrangeLayout([field('a')], 3);
        expect(result.fullWidth).toEqual({});
        expect(result.cols.a).toBe(1);
        expect(result.rowStarts.a).toBe(1);
    });
});

describe('packGridPositions', () => {
    test('places each field in the next free cell, wrapping when full', () => {
        const { rowStarts, cols } = packGridPositions(
            [
                { name: 'a', span: 1 },
                { name: 'b', span: 1 },
                { name: 'c', span: 2 },
            ],
            2
        );
        expect(rowStarts.a).toBe(1);
        expect(cols.a).toBe(1);
        expect(rowStarts.b).toBe(1);
        expect(cols.b).toBe(2);
        // c needs two columns, so it starts a new band.
        expect(rowStarts.c).toBe(2);
        expect(cols.c).toBe(1);
    });

    test('fills the free cell beside a multi-band field (masonry)', () => {
        const { rowStarts, cols } = packGridPositions(
            [
                { name: 'p', span: 1, rowSpan: 2 },
                { name: 'b', span: 1 },
                { name: 'c', span: 1 },
            ],
            2
        );
        expect(rowStarts.p).toBe(1);
        expect(cols.p).toBe(1);
        expect(rowStarts.b).toBe(1);
        expect(cols.b).toBe(2);
        // p still owns row 2 col 1, so c drops into the free cell beneath b.
        expect(rowStarts.c).toBe(2);
        expect(cols.c).toBe(2);
    });

    test('clamps a span that exceeds the column count', () => {
        const { rowStarts, cols } = packGridPositions(
            [{ name: 'wide', span: 5 }],
            3
        );
        expect(rowStarts.wide).toBe(1);
        expect(cols.wide).toBe(1);
    });

    test('reserves every band a tall field spans', () => {
        const { rowStarts, cols } = packGridPositions(
            [
                { name: 'tall', span: 1, rowSpan: 3 },
                { name: 'a', span: 1 },
            ],
            1
        );
        expect(rowStarts.tall).toBe(1);
        expect(cols.tall).toBe(1);
        // tall owns rows 1-3, so a starts on row 4.
        expect(rowStarts.a).toBe(4);
    });
});

describe('applyDrop', () => {
    test('places a field into a free cell', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 1 },
            ],
            'b',
            { kind: 'cell', row: 1, col: 2 },
            2
        );
        expect(result.rowStarts).toEqual({ a: 1, b: 1 });
        expect(result.cols).toEqual({ a: 1, b: 2 });
    });

    test('slides to the nearest free band when the target cell is taken', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 1, col: 2, span: 1, rowSpan: 1 },
                { name: 'c', row: 2, col: 1, span: 1, rowSpan: 1 },
            ],
            'c',
            { kind: 'cell', row: 1, col: 1 },
            2
        );
        // Row 1 is full, so c lands beside the free band below it.
        expect(result.rowStarts.c).toBe(2);
        expect(result.cols.c).toBe(1);
    });

    test('inserting on a separator shifts the bands below it down', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 1 },
                { name: 'c', row: 3, col: 1, span: 1, rowSpan: 1 },
            ],
            'c',
            { kind: 'insert', boundary: 2, col: 1 },
            2
        );
        expect(result.rowStarts).toEqual({ a: 1, b: 3, c: 2 });
    });

    test('inserting attaches the field to the chosen column', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 1 },
                { name: 'c', row: 3, col: 1, span: 1, rowSpan: 1 },
            ],
            'c',
            { kind: 'insert', boundary: 2, col: 2 },
            2
        );
        expect(result.rowStarts.c).toBe(2);
        expect(result.cols.c).toBe(2);
    });

    test('a spanning field straddling the boundary is pushed clear', () => {
        const result = applyDrop(
            [
                { name: 'tall', row: 1, col: 1, span: 1, rowSpan: 2 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 2 },
            ],
            'b',
            { kind: 'insert', boundary: 2, col: 2 },
            2
        );
        // tall covers bands 1-2, so it moves down a band; the now-empty top band
        // is compacted away, leaving tall and b sharing the top two bands.
        expect(result.rowStarts.tall).toBe(1);
        expect(result.rowStarts.b).toBe(1);
        expect(result.cols.tall).toBe(1);
        expect(result.cols.b).toBe(2);
        expect(result.rowSpans.b).toBe(2);
    });

    test('compacts a band left empty by a move', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 1 },
                { name: 'c', row: 3, col: 1, span: 1, rowSpan: 1 },
            ],
            'c',
            { kind: 'cell', row: 1, col: 2 },
            2
        );
        expect(result.rowStarts).toEqual({ a: 1, c: 1, b: 2 });
        expect(result.cols.c).toBe(2);
    });

    test('inserting a column shifts reaching fields right and grows the grid', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 2, rowSpan: 1 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 1 },
            ],
            'b',
            { kind: 'insertCol', boundary: 2, row: 2 },
            2
        );
        // a spans up to the old col 2, so it moves to cols 2-3; b lands in the
        // new col 2 on its own band; the grid now has three columns.
        expect(result.columns).toBe(3);
        expect(result.cols.a).toBe(2);
        expect(result.rowStarts.b).toBe(2);
        expect(result.cols.b).toBe(2);
    });

    test('inserting at the left edge pushes everything right', () => {
        const result = applyDrop(
            [
                { name: 'a', row: 1, col: 1, span: 2, rowSpan: 1 },
                { name: 'b', row: 2, col: 1, span: 1, rowSpan: 1 },
            ],
            'a',
            { kind: 'insertCol', boundary: 1, row: 1 },
            2
        );
        expect(result.columns).toBe(3);
        expect(result.cols.a).toBe(1);
        expect(result.cols.b).toBe(2);
    });

    test('a column drop keeps the width when the grid is at the cap', () => {
        const spanning = Array.from({ length: 2 }, (_, i) => ({
            name: `f${i + 1}`,
            row: i + 1,
            col: 1,
            span: 12,
            rowSpan: 1,
        }));
        const result = applyDrop(
            spanning,
            'f2',
            { kind: 'insertCol', boundary: 2, row: 1 },
            12
        );
        expect(result.columns).toBe(12);
        expect(result.cols.f2).toBe(1);
    });
});

describe('withBandPositions', () => {
    test('packs fields that have no stored row into the first free cell', () => {
        const result = withBandPositions(
            [
                { name: 'a', span: 1, rowStart: 1, colStart: 1 },
                { name: 'b', span: 1 },
                { name: 'c', span: 2 },
            ],
            2
        );
        expect(result[0].rowStart).toBe(1);
        // b fills the free cell beside a.
        expect(result[1].rowStart).toBe(1);
        expect(result[1].colStart).toBe(2);
        // c needs two columns, so it wraps to its own band.
        expect(result[2].rowStart).toBe(2);
        expect(result[2].colStart).toBe(1);
    });

    test('fills beside a placed multi-band field', () => {
        const result = withBandPositions(
            [
                { name: 'p', span: 1, rowSpan: 2, rowStart: 1, colStart: 1 },
                { name: 'b', span: 1 },
            ],
            2
        );
        expect(result[1].rowStart).toBe(1);
        expect(result[1].colStart).toBe(2);
        expect(result[1].rowSpan).toBe(1);
    });
});

describe('getSeriesInheritedNames', () => {
    test('keys inheritance on name only', () => {
        expect(
            getSeriesInheritedNames([field('age'), field('species')])
        ).toEqual(new Set(['age', 'species']));
    });

    test('tolerates missing input', () => {
        expect(getSeriesInheritedNames(null).size).toBe(0);
    });
});
