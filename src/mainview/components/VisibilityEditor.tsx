import type {
    FieldDefinition,
    FieldVisibility,
    VisibilityCondition,
    VisibilityOperator,
} from '../types/index';
import { getOperatorsForFieldType } from '../templates/fieldVisibility';

interface VisibilityEditorProps {
    fields: FieldDefinition[];
    currentIndex: number;
    value: FieldVisibility | undefined;
    onChange: (value: FieldVisibility | undefined) => void;
}

const OPERATOR_LABELS: Record<VisibilityOperator, string> = {
    isTrue: 'is true',
    isFalse: 'is false',
    isEmpty: 'is empty',
    notEmpty: 'is not empty',
    equals: 'equals',
    notEquals: 'does not equal',
    contains: 'contains',
    notContains: 'does not contain',
    in: 'is one of',
    notIn: 'is none of',
    greaterThan: 'is greater than',
    lessThan: 'is less than',
};

const OPERATORS: VisibilityOperator[] = [
    'isTrue',
    'isFalse',
    'isEmpty',
    'notEmpty',
    'equals',
    'notEquals',
    'contains',
    'notContains',
    'in',
    'notIn',
    'greaterThan',
    'lessThan',
];

function needsValue(operator: VisibilityOperator): boolean {
    return !['isTrue', 'isFalse', 'isEmpty', 'notEmpty'].includes(operator);
}

export default function VisibilityEditor({
    fields,
    currentIndex,
    value,
    onChange,
}: VisibilityEditorProps) {
    const available = fields.slice(0, currentIndex);
    const visibility = value && value.conditions.length > 0 ? value : undefined;

    function toggleEnabled() {
        if (visibility) {
            onChange(undefined);
            return;
        }
        if (available.length === 0) return;
        const firstField = available[0];
        onChange({
            mode: 'all',
            conditions: [{ field: firstField.name, operator: 'isTrue' }],
        });
    }

    function updateCondition(
        index: number,
        updates: Partial<VisibilityCondition>
    ) {
        if (!visibility) return;
        const conditions = visibility.conditions.map((c, i) =>
            i === index ? { ...c, ...updates } : c
        );
        onChange({ ...visibility, conditions });
    }

    function removeCondition(index: number) {
        if (!visibility) return;
        const conditions = visibility.conditions.filter((_, i) => i !== index);
        onChange(
            conditions.length > 0 ? { ...visibility, conditions } : undefined
        );
    }

    function addCondition() {
        if (!visibility) return;
        const fallback =
            available.find(
                (f) =>
                    f.name !==
                    visibility.conditions[visibility.conditions.length - 1]
                        ?.field
            ) || available[0];
        const condition = fallback
            ? {
                  field: fallback.name,
                  operator: getOperatorsForFieldType(fallback.type)[0],
              }
            : { field: '', operator: 'isTrue' as VisibilityOperator };
        onChange({
            ...visibility,
            conditions: [...visibility.conditions, condition],
        });
    }

    function findTrigger(name: string): FieldDefinition | undefined {
        return fields.find((f) => f.name === name);
    }

    return (
        <div
            style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                border: '1px solid var(--border, #333)',
                borderRadius: '4px',
            }}
        >
            <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.85em',
                    cursor: 'pointer',
                }}
            >
                <input
                    type="checkbox"
                    checked={!!visibility}
                    onChange={toggleEnabled}
                    disabled={available.length === 0}
                />
                Show conditionally
            </label>

            {visibility && (
                <div style={{ marginTop: '0.5rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            marginBottom: '0.35rem',
                            fontSize: '0.85em',
                        }}
                    >
                        <span>when</span>
                        <select
                            value={visibility.mode}
                            onChange={(e) =>
                                onChange({
                                    ...visibility,
                                    mode: e.target.value as 'all' | 'any',
                                })
                            }
                            style={{ fontSize: '0.85em', padding: '2px 4px' }}
                        >
                            <option value="all">all</option>
                            <option value="any">any</option>
                        </select>
                        <span>of these are true:</span>
                    </div>

                    {visibility.conditions.map((cond, i) => {
                        const trigger = findTrigger(cond.field);
                        const allowedOps = trigger
                            ? getOperatorsForFieldType(trigger.type)
                            : OPERATORS;
                        const operator = allowedOps.includes(cond.operator)
                            ? cond.operator
                            : allowedOps[0] || 'isTrue';
                        const effectiveCond = { ...cond, operator };
                        return (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    gap: '0.4rem',
                                    alignItems: 'center',
                                    marginBottom: '0.35rem',
                                }}
                            >
                                <select
                                    value={effectiveCond.field}
                                    onChange={(e) => {
                                        const t = findTrigger(e.target.value);
                                        updateCondition(i, {
                                            field: e.target.value,
                                            operator: t
                                                ? getOperatorsForFieldType(
                                                      t.type
                                                  )[0]
                                                : 'isTrue',
                                            value: undefined,
                                        });
                                    }}
                                    style={{
                                        flex: 1,
                                        fontSize: '0.85em',
                                        padding: '2px 4px',
                                    }}
                                >
                                    <option value="">— select field —</option>
                                    {available.map((f) => (
                                        <option key={f.name} value={f.name}>
                                            {f.label || f.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={effectiveCond.operator}
                                    onChange={(e) =>
                                        updateCondition(i, {
                                            operator: e.target
                                                .value as VisibilityOperator,
                                            value: undefined,
                                        })
                                    }
                                    style={{
                                        fontSize: '0.85em',
                                        padding: '2px 4px',
                                    }}
                                >
                                    {allowedOps.map((op) => (
                                        <option key={op} value={op}>
                                            {OPERATOR_LABELS[op]}
                                        </option>
                                    ))}
                                </select>
                                {trigger &&
                                    needsValue(effectiveCond.operator) && (
                                        <ValueInput
                                            triggerType={trigger.type}
                                            operator={effectiveCond.operator}
                                            options={trigger.options}
                                            value={effectiveCond.value}
                                            onChange={(v) =>
                                                updateCondition(i, { value: v })
                                            }
                                        />
                                    )}
                                <button
                                    type="button"
                                    onClick={() => removeCondition(i)}
                                    style={{
                                        fontSize: '1.5em',
                                        color: '#e74c3c',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                    title="Remove condition"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}

                    {available.length > 0 && (
                        <button
                            type="button"
                            onClick={addCondition}
                            style={{ fontSize: '0.85em', marginTop: '0.25rem' }}
                        >
                            + Add condition
                        </button>
                    )}
                    {available.length === 0 && (
                        <div
                            style={{
                                fontSize: '0.8em',
                                color: '#888',
                                marginTop: '0.25rem',
                            }}
                        >
                            No earlier fields to condition on. Move another
                            field above this one first.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface ValueInputProps {
    triggerType: FieldDefinition['type'];
    operator: VisibilityOperator;
    options?: string[];
    value: string | number | boolean | string[] | undefined;
    onChange: (value: string | number | boolean | string[] | undefined) => void;
}

const inputStyle = {
    fontSize: '0.85em',
    padding: '2px 4px',
    minWidth: '90px',
} as const;

function ValueInput({
    triggerType,
    operator,
    options,
    value,
    onChange,
}: ValueInputProps) {
    const isBooleanTrigger =
        triggerType === 'checkbox' || triggerType === 'toggle';

    if (isBooleanTrigger) {
        const v = typeof value === 'boolean' ? value : true;
        return (
            <select
                value={String(v)}
                onChange={(e) => onChange(e.target.value === 'true')}
                style={inputStyle}
            >
                <option value="true">true</option>
                <option value="false">false</option>
            </select>
        );
    }

    if (operator === 'in' || operator === 'notIn') {
        const selected = Array.isArray(value) ? value : [];
        return (
            <select
                multiple
                value={selected as string[]}
                onChange={(e) =>
                    onChange(
                        Array.from(e.target.selectedOptions).map((o) => o.value)
                    )
                }
                style={{ ...inputStyle, minWidth: '140px', maxHeight: '90px' }}
            >
                {(options || []).map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    if (triggerType === 'number' || triggerType === 'range') {
        return (
            <input
                type="number"
                value={typeof value === 'number' ? value : ''}
                onChange={(e) =>
                    onChange(
                        e.target.value ? Number(e.target.value) : undefined
                    )
                }
                style={{ ...inputStyle, width: '90px' }}
            />
        );
    }

    if (triggerType === 'select' || triggerType === 'multiselect') {
        const v = typeof value === 'string' ? value : '';
        return (
            <select
                value={v}
                onChange={(e) => onChange(e.target.value)}
                style={inputStyle}
            >
                <option value="">—</option>
                {(options || []).map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        );
    }

    return (
        <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...inputStyle, width: '120px' }}
            placeholder="value"
        />
    );
}
