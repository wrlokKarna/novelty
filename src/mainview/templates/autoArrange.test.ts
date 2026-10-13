import { describe, expect, test } from 'bun:test';
import type { FieldDefinition, TemplateLayout } from '../types';
import { DEFAULT_TEMPLATE_COLUMNS, LAYOUT_VERSION } from '../types';
import { compactLayout, compactPlaced } from './autoArrange';

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

function field(
    name: string,
    type: FieldDefinition['type'] = 'text'
): FieldDefinition {
    return { name, type, label: name, required: false };
}

describe('compactPlaced', () => {
    test('drops bands that no field occupies', () => {
        const result = compactPlaced(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 3, col: 1, span: 1, rowSpan: 1 },
            ],
            2
        );
        expect(result.rowStarts).toEqual({ a: 1, b: 2 });
    });

    test('trims trailing columns no field reaches', () => {
        const result = compactPlaced(
            [{ name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 }],
            4
        );
        expect(result.columns).toBe(1);
    });

    test('preserves interior column gaps', () => {
        const result = compactPlaced(
            [
                { name: 'a', row: 1, col: 1, span: 1, rowSpan: 1 },
                { name: 'b', row: 1, col: 3, span: 1, rowSpan: 1 },
            ],
            4
        );
        expect(result.cols).toEqual({ a: 1, b: 3 });
        expect(result.columns).toBe(3);
    });

    test('keeps the column count when nothing is placed', () => {
        expect(compactPlaced([], 4).columns).toBe(4);
    });
});

describe('compactLayout', () => {
    test('removes an empty band between two fields', () => {
        const result = compactLayout(
            [field('a'), field('b')],
            layout({
                rowStarts: { a: 1, b: 3 },
                cols: { a: 1, b: 2 },
                columns: 2,
            })
        );
        expect(result.rowStarts).toEqual({ a: 1, b: 2 });
        expect(result.columns).toBe(2);
    });

    test('trims trailing empty columns', () => {
        const result = compactLayout(
            [field('a')],
            layout({ rowStarts: { a: 1 }, cols: { a: 1 }, columns: 4 })
        );
        expect(result.columns).toBe(1);
    });

    test('a full-width field pins every column', () => {
        const result = compactLayout(
            [field('a')],
            layout({
                rowStarts: { a: 1 },
                cols: { a: 1 },
                fullWidth: { a: true },
                columns: 4,
            })
        );
        expect(result.columns).toBe(4);
    });

    test('keeps the column count for an empty field list', () => {
        const result = compactLayout([], layout({ columns: 3 }));
        expect(result.columns).toBe(3);
    });

    test('is idempotent', () => {
        const once = compactLayout(
            [field('a'), field('b')],
            layout({
                rowStarts: { a: 1, b: 3 },
                cols: { a: 1, b: 1 },
                columns: 4,
            })
        );
        const twice = compactLayout([field('a'), field('b')], once);
        expect(twice).toEqual(once);
    });
});
