import { useState, useMemo } from 'react';
import Dialog from '../components/Dialog';
import type { CompendiumCategory, FieldDefinition } from '../types/index';

export interface AIFieldInfo {
    name: string;
    value: unknown;
}

export type MappingAction = 'map' | 'add' | 'skip';

export interface FieldMapping {
    aiField: string;
    action: MappingAction;
    targetField: string | null;
    newFieldDef: FieldDefinition | null;
}

export interface MappingResult {
    mappings: FieldMapping[];
    mergedTemplateData: Record<string, unknown>;
    newFieldsToAdd: FieldDefinition[];
}

interface Props {
    open: boolean;
    onClose: (result: MappingResult | null) => void;
    aiFields: AIFieldInfo[];
    templateFields: FieldDefinition[];
    category: CompendiumCategory;
    entryName: string;
}

const fieldTypes: FieldDefinition['type'][] = [
    'text',
    'number',
    'textarea',
    'select',
    'checkbox',
    'date',
    'file',
    'multiselect',
    'entitylink',
    'richtext',
    'color',
    'toggle',
    'range',
    'portrait',
    'images',
    'tree',
];

function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[_\s-]+/g, ' ')
        .trim();
}

function findBestMatch(
    aiFieldName: string,
    templateFields: FieldDefinition[]
): FieldDefinition | null {
    const normalized = normalizeName(aiFieldName);
    for (const tf of templateFields) {
        const tfNorm = normalizeName(tf.name);
        if (tfNorm === normalized) return tf;
    }
    for (const tf of templateFields) {
        const tfNorm = normalizeName(tf.name);
        if (tfNorm.includes(normalized) || normalized.includes(tfNorm))
            return tf;
    }
    return null;
}

const categoryLabels: Record<CompendiumCategory, string> = {
    character: 'Character',
    location: 'Location',
    organization: 'Organization',
    item: 'Item',
    lore: 'Lore',
};

export default function TemplateFieldMappingDialog({
    open,
    onClose,
    aiFields,
    templateFields,
    category,
    entryName,
}: Props) {
    const templateFieldNames = useMemo(
        () => templateFields.map((f) => f.name),
        [templateFields]
    );

    const [mappings, setMappings] = useState<FieldMapping[]>(() =>
        aiFields.map((af) => {
            const match = findBestMatch(af.name, templateFields);
            return {
                aiField: af.name,
                action: match
                    ? ('map' as MappingAction)
                    : ('add' as MappingAction),
                targetField: match ? match.name : null,
                newFieldDef: match
                    ? null
                    : {
                          name: af.name,
                          label: af.name
                              .replace(/[_-]/g, ' ')
                              .replace(/\b\w/g, (c) => c.toUpperCase()),
                          type: 'text' as const,
                          required: false,
                      },
            };
        })
    );

    function setMapping(aiField: string, partial: Partial<FieldMapping>) {
        setMappings((prev) =>
            prev.map((m) => (m.aiField === aiField ? { ...m, ...partial } : m))
        );
    }

    function handleSubmit() {
        const mergedTemplateData: Record<string, unknown> = {};
        const newFieldsToAdd: FieldDefinition[] = [];

        for (const m of mappings) {
            const aiField = aiFields.find((af) => af.name === m.aiField);
            if (!aiField) continue;

            if (m.action === 'map' && m.targetField) {
                mergedTemplateData[m.targetField] = aiField.value;
            } else if (m.action === 'add' && m.newFieldDef) {
                mergedTemplateData[m.newFieldDef.name] = aiField.value;
                newFieldsToAdd.push(m.newFieldDef);
            }
        }

        onClose({ mappings, mergedTemplateData, newFieldsToAdd });
    }

    return (
        <Dialog
            open={open}
            onClose={() => onClose(null)}
            title={`Map Fields for ${entryName}`}
            large
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flex: 1,
                    overflow: 'hidden',
                }}
            >
                <p style={{ color: '#aaa', fontSize: '13px', margin: 0 }}>
                    The AI generated fields for this{' '}
                    {categoryLabels[category].toLowerCase()} entry. Map them to
                    template fields, add new persistent fields, or skip them.
                </p>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.5fr 2.5fr',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#888',
                        padding: '8px 4px',
                        borderBottom: '1px solid #393A3B',
                    }}
                >
                    <span>AI Field</span>
                    <span>AI Value</span>
                    <span>Action</span>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    {mappings.map((m) => {
                        const aiField = aiFields.find(
                            (af) => af.name === m.aiField
                        )!;
                        const valueStr =
                            typeof aiField.value === 'string'
                                ? aiField.value.length > 80
                                    ? aiField.value.slice(0, 80) + '...'
                                    : aiField.value
                                : JSON.stringify(aiField.value);

                        return (
                            <div
                                key={m.aiField}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1.5fr 2.5fr',
                                    gap: '8px',
                                    alignItems: 'start',
                                    padding: '8px',
                                    background: '#1A1B1C',
                                    borderRadius: '6px',
                                }}
                            >
                                <code
                                    style={{
                                        color: '#4A9EFF',
                                        fontSize: '13px',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {m.aiField}
                                </code>
                                <span
                                    style={{
                                        color: '#ccc',
                                        fontSize: '13px',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {valueStr}
                                </span>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                    }}
                                >
                                    <select
                                        style={{
                                            padding: '6px 8px',
                                            background: '#2A2B2C',
                                            border: '1px solid #393A3B',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            fontSize: '12px',
                                        }}
                                        value={m.action}
                                        onChange={(e) => {
                                            const action = e.target
                                                .value as MappingAction;
                                            setMapping(m.aiField, { action });
                                            if (
                                                action === 'map' &&
                                                !m.targetField &&
                                                templateFieldNames.length > 0
                                            ) {
                                                setMapping(m.aiField, {
                                                    targetField:
                                                        templateFieldNames[0],
                                                });
                                            }
                                            if (
                                                action === 'add' &&
                                                !m.newFieldDef
                                            ) {
                                                setMapping(m.aiField, {
                                                    newFieldDef: {
                                                        name: m.aiField,
                                                        label: m.aiField
                                                            .replace(
                                                                /[_-]/g,
                                                                ' '
                                                            )
                                                            .replace(
                                                                /\b\w/g,
                                                                (c) =>
                                                                    c.toUpperCase()
                                                            ),
                                                        type: 'text',
                                                        required: false,
                                                    },
                                                });
                                            }
                                        }}
                                    >
                                        <option value="map">
                                            Map to template field
                                        </option>
                                        <option value="add">
                                            Add as new field
                                        </option>
                                        <option value="skip">Skip</option>
                                    </select>

                                    {m.action === 'map' && (
                                        <select
                                            style={{
                                                padding: '6px 8px',
                                                background: '#2A2B2C',
                                                border: '1px solid #393A3B',
                                                borderRadius: '4px',
                                                color: '#fff',
                                                fontSize: '12px',
                                            }}
                                            value={m.targetField || ''}
                                            onChange={(e) =>
                                                setMapping(m.aiField, {
                                                    targetField:
                                                        e.target.value || null,
                                                })
                                            }
                                        >
                                            <option value="" disabled>
                                                Select field...
                                            </option>
                                            {templateFields.map((tf) => (
                                                <option
                                                    key={tf.name}
                                                    value={tf.name}
                                                >
                                                    {tf.label} ({tf.type})
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {m.action === 'add' && m.newFieldDef && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                            }}
                                        >
                                            <input
                                                style={{
                                                    padding: '4px 6px',
                                                    background: '#1A1B1C',
                                                    border: '1px solid #393A3B',
                                                    borderRadius: '4px',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                }}
                                                placeholder="Field name"
                                                value={m.newFieldDef.name}
                                                onChange={(e) =>
                                                    setMapping(m.aiField, {
                                                        newFieldDef: {
                                                            ...m.newFieldDef!,
                                                            name: e.target
                                                                .value,
                                                        },
                                                    })
                                                }
                                            />
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '4px',
                                                }}
                                            >
                                                <input
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        background: '#1A1B1C',
                                                        border: '1px solid #393A3B',
                                                        borderRadius: '4px',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                    }}
                                                    placeholder="Label"
                                                    value={m.newFieldDef.label}
                                                    onChange={(e) =>
                                                        setMapping(m.aiField, {
                                                            newFieldDef: {
                                                                ...m.newFieldDef!,
                                                                label: e.target
                                                                    .value,
                                                            },
                                                        })
                                                    }
                                                />
                                                <select
                                                    style={{
                                                        padding: '4px 6px',
                                                        background: '#1A1B1C',
                                                        border: '1px solid #393A3B',
                                                        borderRadius: '4px',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                    }}
                                                    value={m.newFieldDef.type}
                                                    onChange={(e) =>
                                                        setMapping(m.aiField, {
                                                            newFieldDef: {
                                                                ...m.newFieldDef!,
                                                                type: e.target
                                                                    .value as FieldDefinition['type'],
                                                            },
                                                        })
                                                    }
                                                >
                                                    {fieldTypes.map((ft) => (
                                                        <option
                                                            key={ft}
                                                            value={ft}
                                                        >
                                                            {ft}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid #393A3B',
                    }}
                >
                    <button
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#aaa',
                            cursor: 'pointer',
                        }}
                        onClick={() => onClose(null)}
                    >
                        Cancel
                    </button>
                    <button
                        style={{
                            padding: '8px 16px',
                            background: '#4A9EFF',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                        onClick={handleSubmit}
                    >
                        Confirm Mapping
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
