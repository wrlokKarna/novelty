import type {
    FieldDefinition,
    FieldVisibility,
    VisibilityCondition,
    VisibilityOperator,
} from '../types/index';

export function isFieldVisible(
    field: FieldDefinition,
    data: Record<string, unknown>
): boolean {
    const visibility = field.visibleWhen;
    if (!visibility || visibility.conditions.length === 0) return true;
    const results = visibility.conditions.map((c) =>
        evaluateCondition(c, data)
    );
    return visibility.mode === 'all'
        ? results.every(Boolean)
        : results.some(Boolean);
}

export function evaluateCondition(
    condition: VisibilityCondition,
    data: Record<string, unknown>
): boolean {
    const actual = data[condition.field];
    const value = condition.value;
    switch (condition.operator) {
        case 'isTrue':
            return toBoolean(actual);
        case 'isFalse':
            return !toBoolean(actual);
        case 'isEmpty':
            return isEmptyValue(actual);
        case 'notEmpty':
            return !isEmptyValue(actual);
        case 'equals':
            return looseEquals(actual, value);
        case 'notEquals':
            return !looseEquals(actual, value);
        case 'contains':
            return containsValue(actual, value);
        case 'notContains':
            return !containsValue(actual, value);
        case 'in':
            return (
                Array.isArray(value) &&
                value.some((v) => looseEquals(actual, v))
            );
        case 'notIn':
            return !(
                Array.isArray(value) &&
                value.some((v) => looseEquals(actual, v))
            );
        case 'greaterThan':
            return (
                toNumber(actual) !== null &&
                toNumber(value) !== null &&
                toNumber(actual)! > toNumber(value)!
            );
        case 'lessThan':
            return (
                toNumber(actual) !== null &&
                toNumber(value) !== null &&
                toNumber(actual)! < toNumber(value)!
            );
        default:
            return true;
    }
}

export function getOperatorsForFieldType(
    type: FieldDefinition['type']
): VisibilityOperator[] {
    switch (type) {
        case 'checkbox':
        case 'toggle':
            return ['isTrue', 'isFalse'];
        case 'number':
        case 'range':
            return [
                'equals',
                'notEquals',
                'greaterThan',
                'lessThan',
                'isEmpty',
                'notEmpty',
            ];
        case 'select':
            return ['equals', 'notEquals', 'isEmpty', 'notEmpty'];
        case 'multiselect':
            return [
                'in',
                'notIn',
                'contains',
                'notContains',
                'isEmpty',
                'notEmpty',
            ];
        case 'entitylink':
        case 'date':
            return ['isEmpty', 'notEmpty', 'equals', 'notEquals'];
        default:
            return [
                'isEmpty',
                'notEmpty',
                'equals',
                'notEquals',
                'contains',
                'notContains',
            ];
    }
}

export function describeVisibility(
    visibility: FieldVisibility | undefined,
    labelFor: (fieldName: string) => string
): string | null {
    if (!visibility || visibility.conditions.length === 0) return null;
    const parts = visibility.conditions.map((c) => {
        const fieldLabel = labelFor(c.field) || c.field;
        const operator = OPERATOR_LABELS[c.operator];
        const valueLabel = formatValueLabel(c.value);
        return `${fieldLabel} ${operator}${valueLabel}`;
    });
    const mode = visibility.mode === 'all' ? 'all' : 'any';
    return `Shown when ${mode} of: ${parts.join('; ')}`;
}

const OPERATOR_LABELS: Record<VisibilityOperator, string> = {
    isTrue: 'is true',
    isFalse: 'is false',
    isEmpty: 'is empty',
    notEmpty: 'is not empty',
    equals: '=',
    notEquals: '≠',
    contains: 'contains',
    notContains: 'does not contain',
    in: 'is one of',
    notIn: 'is none of',
    greaterThan: '>',
    lessThan: '<',
};

function formatValueLabel(value: unknown): string {
    if (Array.isArray(value)) return ` [${value.join(', ')}]`;
    if (value === undefined) return '';
    return ` [${String(value)}]`;
}

function toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (value == null) return false;
    if (typeof value === 'string')
        return value !== '' && value !== 'false' && value !== '0';
    if (typeof value === 'number') return value !== 0;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
}

function isEmptyValue(value: unknown): boolean {
    return (
        value == null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
    );
}

function looseEquals(a: unknown, b: unknown): boolean {
    if (a == null || b == null) return a == null && b == null;
    if (typeof a === 'boolean' || typeof b === 'boolean')
        return Boolean(a) === Boolean(b);
    if (typeof a === 'number' || typeof b === 'number')
        return toNumber(a) === toNumber(b);
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((v, i) => looseEquals(v, b[i]));
    }
    return String(a) === String(b);
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number') return Number.isNaN(value) ? null : value;
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number(value);
        return Number.isNaN(n) ? null : n;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return null;
}

function containsValue(actual: unknown, value: unknown): boolean {
    if (Array.isArray(actual)) {
        return actual.some((item) => looseEquals(item, value));
    }
    if (actual == null || value == null) return false;
    return String(actual).toLowerCase().includes(String(value).toLowerCase());
}
