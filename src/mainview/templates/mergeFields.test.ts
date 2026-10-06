import { describe, expect, test } from 'bun:test';
import type { FieldDefinition } from '../types';
import { fullMerge, getSeriesInheritedNames, sortByOrder } from './mergeFields';

function field(
    name: string,
    extra: Partial<FieldDefinition> = {}
): FieldDefinition {
    return { name, label: name, required: false, type: 'text', ...extra };
}

describe('sortByOrder', () => {
    test('returns a list with no order untouched', () => {
        const legacy = [field('a'), field('b'), field('c')];
        expect(sortByOrder(legacy)).toEqual(legacy);
    });

    test('does not mutate its input', () => {
        const input = [field('a', { order: 2 }), field('b', { order: 1 })];
        sortByOrder(input);
        expect(input.map((f) => f.name)).toEqual(['a', 'b']);
    });

    test('sorts by order, not by array position', () => {
        const result = sortByOrder([
            field('a', { order: 2 }),
            field('b', { order: 0 }),
            field('c', { order: 1 }),
        ]);
        expect(result.map((f) => f.name)).toEqual(['b', 'c', 'a']);
    });

    test('breaks order ties by existing position', () => {
        const result = sortByOrder([
            field('a', { order: 1 }),
            field('b', { order: 1 }),
        ]);
        expect(result.map((f) => f.name)).toEqual(['a', 'b']);
    });

    test('falls back to position for rows that predate order', () => {
        // A partially-ordered list can only arise from a partial write; the
        // legacy row keeps a stable rank rather than sorting to an extreme.
        const result = sortByOrder([
            field('legacy'),
            field('ordered', { order: 5 }),
        ]);
        expect(result.map((f) => f.name)).toEqual(['legacy', 'ordered']);
    });
});

describe('fullMerge with interleaved ordering', () => {
    test('series and project rows interleave instead of series-first', () => {
        const series = [
            field('age', { order: 0 }),
            field('species', { order: 2 }),
        ];
        const project = [field('mood', { order: 1 })];

        const merged = fullMerge(project, series);
        expect(merged.map((f) => f.name)).toEqual(['age', 'mood', 'species']);
    });

    test('a project row can sort ahead of every series row', () => {
        const series = [field('age', { order: 3 })];
        const project = [field('mood', { order: 0 })];

        const merged = fullMerge(project, series);
        expect(merged.map((f) => f.name)).toEqual(['mood', 'age']);
    });

    test('legacy templates keep series-first order', () => {
        const series = [field('age'), field('species')];
        const project = [field('mood')];

        const merged = fullMerge(project, series);
        expect(merged.map((f) => f.name)).toEqual(['age', 'species', 'mood']);
    });

    test('an override cannot move an inherited field', () => {
        const series = [field('age', { order: 4 })];
        // The project row carries a stray order; the series row must still win.
        const project = [field('age', { order: 0, disabled: true })];

        const merged = fullMerge(project, series);
        expect(merged).toHaveLength(1);
        expect(merged[0].order).toBe(4);
        expect(merged[0].disabled).toBe(true);
    });

    test('an override of an unordered series field does not invent an order', () => {
        const series = [field('age')];
        const project = [field('age', { order: 7, disabled: true })];

        const merged = fullMerge(project, series);
        expect(merged[0].order).toBeUndefined();
        expect('order' in merged[0]).toBe(false);
    });

    test('project-only rows are returned in order', () => {
        const merged = fullMerge(
            [field('b', { order: 3 }), field('a', { order: 1 })],
            null
        );
        expect(merged.map((f) => f.name)).toEqual(['a', 'b']);
    });
});

// Older builds stored a whole restated copy of a series field in the project
// template. Those rows must not win over the series definition, or the copy goes
// stale the moment the series field is edited.
describe('stale project overrides', () => {
    const series = [
        field('age', {
            label: 'Age',
            type: 'number',
            required: true,
            order: 0,
        }),
    ];

    test('cannot mask a series label, type or required flag', () => {
        const stale = field('age', {
            label: '',
            type: 'text',
            required: false,
            order: 9,
        });

        const merged = fullMerge([stale], series);
        expect(merged[0].label).toBe('Age');
        expect(merged[0].type).toBe('number');
        expect(merged[0].required).toBe(true);
        expect(merged[0].order).toBe(0);
        expect(merged[0].disabled).toBe(false);
    });

    test('still carry this project on/off choice', () => {
        const merged = fullMerge(
            [field('age', { label: '', disabled: true })],
            series
        );
        expect(merged[0].disabled).toBe(true);
        expect(merged[0].label).toBe('Age');
    });
});

describe('getSeriesInheritedNames', () => {
    test('keys inheritance on name only', () => {
        expect(
            getSeriesInheritedNames([
                field('age'),
                field('species', { disabled: true }),
            ])
        ).toEqual(new Set(['age', 'species']));
    });

    test('tolerates missing input', () => {
        expect(getSeriesInheritedNames(null).size).toBe(0);
    });
});
