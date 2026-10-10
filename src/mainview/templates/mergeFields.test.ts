import { describe, expect, test } from 'bun:test';
import type { FieldDefinition } from '../types';
import { DEFAULT_TEMPLATE_COLUMNS } from '../types';
import {
    applySpans,
    effectiveLayout,
    fullMerge,
    getSeriesInheritedNames,
    orderByLayout,
} from './mergeFields';

function field(
    name: string,
    extra: Partial<FieldDefinition> = {}
): FieldDefinition {
    return { name, label: name, required: false, type: 'text', ...extra };
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
        const layout = effectiveLayout(null, null);
        expect(layout.columns).toBe(DEFAULT_TEMPLATE_COLUMNS);
        expect(layout.order).toEqual([]);
        expect(layout.spans).toEqual({});
    });

    test('series supplies order and spans when the project has none', () => {
        const layout = effectiveLayout(null, {
            order: ['a', 'b'],
            spans: { a: 2 },
            columns: 3,
        });
        expect(layout.order).toEqual(['a', 'b']);
        expect(layout.spans.a).toBe(2);
        expect(layout.columns).toBe(3);
    });

    test('project order and spans win over the series', () => {
        const layout = effectiveLayout(
            { order: ['b', 'a'], spans: { a: 1 }, columns: 5 },
            { order: ['a', 'b'], spans: { a: 2 }, columns: 3 }
        );
        expect(layout.order).toEqual(['b', 'a']);
        expect(layout.spans.a).toBe(1);
        expect(layout.columns).toBe(5);
    });
});

describe('applySpans', () => {
    test('attaches a width only for names the layout mentions', () => {
        const defs = [field('a'), field('b')];
        const resolved = applySpans(defs, {
            order: ['a', 'b'],
            spans: { a: 2 },
            columns: 4,
        });
        expect(resolved[0].span).toBe(2);
        expect(resolved[1].span).toBeUndefined();
        expect('span' in resolved[1]).toBe(false);
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
