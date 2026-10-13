import { useState, useMemo } from 'react';
import Dialog from '../components/Dialog';
import TemplateFieldMappingDialog from './TemplateFieldMappingDialog';
import type { CompendiumCategory, FieldDefinition } from '../types/index';
import type { ParsedEntry } from '../services/entryParser';
import type { MappingResult } from './TemplateFieldMappingDialog';

export interface BulkExtractResult {
    entries: (ParsedEntry & { templateData: Record<string, unknown> })[];
    templateUpdates: {
        baseType: CompendiumCategory;
        fields: FieldDefinition[];
    }[];
}

interface Props {
    open: boolean;
    onClose: (result: BulkExtractResult | null) => void;
    parsedEntries: ParsedEntry[];
    resolvedTemplates: Record<string, FieldDefinition[]>;
    projectId: string;
}

const categoryColors: Record<CompendiumCategory, string> = {
    character: '#4A9EFF',
    location: '#4CAF50',
    organization: '#FF9F4A',
    item: '#FF4A4A',
    lore: '#AB47BC',
};

const categoryIcons: Record<CompendiumCategory, string> = {
    character: '👤',
    location: '📍',
    organization: '🏛',
    item: '⚔',
    lore: '📖',
};

export default function BulkExtractDialog({
    open,
    onClose,
    parsedEntries,
    resolvedTemplates,
    projectId: _projectId,
}: Props) {
    const [selected, setSelected] = useState<Set<number>>(
        () => new Set(parsedEntries.map((_, i) => i))
    );
    const [mappingEntryIndex, setMappingEntryIndex] = useState<number | null>(
        null
    );
    const [entryMappings, setEntryMappings] = useState<
        Record<number, MappingResult>
    >({});

    const toggleAll = () => {
        if (selected.size === parsedEntries.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(parsedEntries.map((_, i) => i)));
        }
    };

    const toggleItem = (idx: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    function handleTemplateMapResult(
        idx: number,
        result: MappingResult | null
    ) {
        setMappingEntryIndex(null);
        if (result) {
            setEntryMappings((prev) => ({ ...prev, [idx]: result }));
        }
    }

    function getEffectiveTemplateData(
        entry: ParsedEntry,
        idx: number
    ): Record<string, unknown> {
        const mapping = entryMappings[idx];
        if (mapping) return mapping.mergedTemplateData;
        return entry.templateData;
    }

    async function handleCreate() {
        const result: BulkExtractResult = { entries: [], templateUpdates: [] };
        const seenTemplateUpdates = new Set<string>();

        for (const idx of selected) {
            const entry = parsedEntries[idx];
            const templateData = getEffectiveTemplateData(entry, idx);
            result.entries.push({ ...entry, templateData });

            const mapping = entryMappings[idx];
            if (mapping?.newFieldsToAdd && mapping.newFieldsToAdd.length > 0) {
                const key = `${entry.category}:${JSON.stringify(mapping.newFieldsToAdd)}`;
                if (!seenTemplateUpdates.has(key)) {
                    seenTemplateUpdates.add(key);
                    result.templateUpdates.push({
                        baseType: entry.category,
                        fields: mapping.newFieldsToAdd,
                    });
                }
            }
        }

        onClose(result);
    }

    const hasUpdates = useMemo(
        () => parsedEntries.some((e) => e.existingId),
        [parsedEntries]
    );
    const updateCount = useMemo(
        () => parsedEntries.filter((e) => e.existingId).length,
        [parsedEntries]
    );
    const createCount = useMemo(
        () => parsedEntries.filter((e) => !e.existingId).length,
        [parsedEntries]
    );

    const hasMappingMismatches = useMemo(() => {
        for (let i = 0; i < parsedEntries.length; i++) {
            const entry = parsedEntries[i];
            const templateFields = resolvedTemplates[entry.category] || [];
            const aiFieldNames = Object.keys(entry.templateData);
            const templateFieldNames = new Set(
                templateFields.map((f) => f.name)
            );
            const hasUnmatched = aiFieldNames.some(
                (name) => !templateFieldNames.has(name)
            );
            if (hasUnmatched && !entryMappings[i]) return true;
        }
        return false;
    }, [parsedEntries, resolvedTemplates, entryMappings]);

    return (
        <>
            <Dialog
                open={open}
                onClose={() => onClose(null)}
                title={
                    hasUpdates
                        ? 'Update Compendium Entries'
                        : 'Extracted Entities'
                }
                large
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        flex: 1,
                        overflow: 'hidden',
                    }}
                >
                    <p
                        style={{
                            color: '#aaa',
                            fontSize: '13px',
                            margin: 0,
                            padding: '0 0 8px 0',
                            borderBottom: '1px solid #393A3B',
                        }}
                    >
                        {hasUpdates
                            ? `Found ${updateCount} existing entr${updateCount === 1 ? 'y' : 'ies'} to update${createCount > 0 ? ` and ${createCount} new entr${createCount === 1 ? 'y' : 'ies'} to create` : ''}.`
                            : `Found ${parsedEntries.length} entit${parsedEntries.length === 1 ? 'y' : 'ies'}. Select which to add to your compendium.`}
                        {hasMappingMismatches && (
                            <span
                                style={{ color: '#FF9F4A', marginLeft: '8px' }}
                            >
                                ⚠ Some entries have unmapped AI-generated
                                fields. Click to review.
                            </span>
                        )}
                    </p>

                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '4px 0',
                        }}
                    >
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#aaa',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selected.size === parsedEntries.length}
                                onChange={toggleAll}
                                style={{ accentColor: '#4A9EFF' }}
                            />
                            {selected.size === parsedEntries.length
                                ? 'Deselect All'
                                : 'Select All'}
                        </label>
                        <span style={{ color: '#888', fontSize: '12px' }}>
                            ({selected.size} selected)
                        </span>
                    </div>

                    <div
                        style={{
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                        }}
                    >
                        {parsedEntries.map((entry, idx) => {
                            const mapped = entryMappings[idx];
                            const templateFields =
                                resolvedTemplates[entry.category] || [];
                            const aiFieldNames = Object.keys(
                                entry.templateData
                            );
                            const templateFieldNames = new Set(
                                templateFields.map((f) => f.name)
                            );
                            const needsMapping = aiFieldNames.some(
                                (name) => !templateFieldNames.has(name)
                            );

                            const previewFields = Object.entries(
                                entry.templateData
                            ).slice(0, 3);
                            const extraCount = Math.max(
                                0,
                                Object.keys(entry.templateData).length - 3
                            );

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 10px',
                                        background: selected.has(idx)
                                            ? '#2A2B2C'
                                            : '#1A1B1C',
                                        border: '1px solid',
                                        borderColor: selected.has(idx)
                                            ? '#393A3B'
                                            : 'transparent',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        opacity: selected.has(idx) ? 1 : 0.6,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(idx)}
                                        onChange={() => toggleItem(idx)}
                                        style={{ accentColor: '#4A9EFF' }}
                                    />
                                    <span style={{ fontSize: '16px' }}>
                                        {categoryIcons[entry.category]}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: '#fff',
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                }}
                                            >
                                                {entry.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '11px',
                                                    color: categoryColors[
                                                        entry.category
                                                    ],
                                                    background: `${categoryColors[entry.category]}20`,
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {entry.category}
                                            </span>
                                            {entry.existingId && (
                                                <span
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#4CAF50',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        background: '#4CAF5020',
                                                    }}
                                                >
                                                    Update
                                                </span>
                                            )}
                                            {needsMapping && (
                                                <span
                                                    style={{
                                                        color: '#FF9F4A',
                                                        fontSize: '11px',
                                                    }}
                                                >
                                                    {mapped
                                                        ? '✓ mapped'
                                                        : '⚠ map'}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                color: '#888',
                                                fontSize: '11px',
                                                marginTop: '2px',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {previewFields
                                                .map(([k, v]) => {
                                                    const val =
                                                        typeof v === 'string' &&
                                                        v.length > 30
                                                            ? v.slice(0, 30) +
                                                              '…'
                                                            : JSON.stringify(v);
                                                    return `${k}: ${val}`;
                                                })
                                                .join(', ')}
                                            {extraCount > 0 &&
                                                ` …+${extraCount} more`}
                                        </div>
                                    </div>
                                    {needsMapping && (
                                        <button
                                            style={{
                                                padding: '4px 8px',
                                                background: '#FF9F4A',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMappingEntryIndex(idx);
                                            }}
                                        >
                                            {mapped ? 'Edit Map' : 'Map Fields'}
                                        </button>
                                    )}
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
                                background:
                                    selected.size === 0 ? '#393A3B' : '#4A9EFF',
                                border: 'none',
                                borderRadius: '6px',
                                color: selected.size === 0 ? '#666' : '#fff',
                                cursor:
                                    selected.size === 0
                                        ? 'not-allowed'
                                        : 'pointer',
                            }}
                            disabled={selected.size === 0}
                            onClick={handleCreate}
                        >
                            {hasUpdates ? 'Apply Updates' : 'Create'} (
                            {selected.size})
                        </button>
                    </div>
                </div>
            </Dialog>

            {mappingEntryIndex !== null &&
                (() => {
                    const entry = parsedEntries[mappingEntryIndex];
                    const templateFields =
                        resolvedTemplates[entry.category] || [];
                    const aiFields = Object.entries(entry.templateData).map(
                        ([name, value]) => ({ name, value })
                    );
                    return (
                        <TemplateFieldMappingDialog
                            open={true}
                            onClose={(result) =>
                                handleTemplateMapResult(
                                    mappingEntryIndex,
                                    result
                                )
                            }
                            aiFields={aiFields}
                            templateFields={templateFields}
                            category={entry.category}
                            entryName={entry.name}
                        />
                    );
                })()}
        </>
    );
}
