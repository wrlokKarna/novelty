import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRPC } from '../../contexts/RPCContext';
import VisibilityEditor from '../VisibilityEditor';
import TreeRelationsEditor from '../TreeRelationsEditor';
import { describeVisibility } from '../../templates/fieldVisibility';
import { TREE_PRESETS } from '../../templates/tree';
import {
    getSeriesInheritedNames,
    fullMerge,
} from '../../templates/mergeFields';
import type {
    CompendiumCategory,
    FieldDefinition,
    SeriesTemplate,
    NewSeriesTemplate,
} from '../../types/index';
import { IconTrash } from '@tabler/icons-react';
import styles from './TemplateManagerTab.module.css';

interface TemplateManagerTabProps {
    projectId: string;
    seriesId: string | null;
    onTemplatesChanged: () => void;
    initialCategory?: CompendiumCategory;
}

const CATEGORIES: CompendiumCategory[] = [
    'character',
    'location',
    'organization',
    'item',
    'lore',
];

const categoryLabels: Record<CompendiumCategory, string> = {
    character: 'Character',
    location: 'Location',
    organization: 'Organization',
    item: 'Item',
    lore: 'Lore',
};

const FIELD_TYPE_GROUPS: {
    label: string;
    types: { type: FieldDefinition['type']; label: string }[];
}[] = [
    {
        label: 'Text',
        types: [
            { type: 'text', label: 'Text' },
            { type: 'textarea', label: 'Long Text' },
            { type: 'richtext', label: 'Rich Text' },
        ],
    },
    {
        label: 'Numbers',
        types: [
            { type: 'number', label: 'Number' },
            { type: 'range', label: 'Slider' },
        ],
    },
    {
        label: 'Choices',
        types: [
            { type: 'select', label: 'Dropdown' },
            { type: 'multiselect', label: 'Multi-select' },
            { type: 'toggle', label: 'Toggle' },
            { type: 'date', label: 'Date' },
            { type: 'color', label: 'Color' },
        ],
    },
    {
        label: 'Media',
        types: [
            { type: 'portrait', label: 'Portrait' },
            { type: 'images', label: 'Gallery' },
        ],
    },
    {
        label: 'Links & Trees',
        types: [
            { type: 'entitylink', label: 'Entity Link' },
            { type: 'tree', label: 'Tree' },
        ],
    },
];

interface SeriesEditorState {
    id: string | null;
    name: string;
    description: string;
    fields: FieldDefinition[];
}

interface CategoryDraft {
    seriesTemplateId: string | null;
    projectFields: FieldDefinition[];
    seriesEditor: SeriesEditorState | null;
    seriesDeletes: string[];
    dirty: boolean;
}

type AddTarget = 'project' | 'series';

const NEW_SERIES = '__new__';

export default function TemplateManagerTab({
    projectId,
    seriesId,
    onTemplatesChanged,
    initialCategory,
}: TemplateManagerTabProps) {
    const rpc = useRPC();
    const [seriesTemplates, setSeriesTemplates] = useState<SeriesTemplate[]>(
        []
    );
    const [drafts, setDrafts] = useState<
        Partial<Record<CompendiumCategory, CategoryDraft>>
    >({});
    const [activeCat, setActiveCat] = useState<CompendiumCategory>(
        initialCategory ?? 'character'
    );
    const [loading, setLoading] = useState(true);
    const [savingCat, setSavingCat] = useState<CompendiumCategory | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<
        Record<string, boolean>
    >({});

    async function load() {
        if (!projectId) return;
        setLoading(true);
        try {
            const seriesRes = seriesId
                ? await rpc.request['db:list-series-templates']({ seriesId })
                : ([] as SeriesTemplate[]);
            const sl = Array.isArray(seriesRes) ? seriesRes : [];
            setSeriesTemplates(sl);

            const results = await Promise.all(
                CATEGORIES.map((cat) =>
                    rpc.request['db:get-resolved-template']({
                        projectId,
                        baseType: cat,
                    })
                )
            );

            const next = {} as Record<CompendiumCategory, CategoryDraft>;
            CATEGORIES.forEach((cat, i) => {
                const info = results[i];
                const seriesIdApplied =
                    info?.projectTemplate?.seriesTemplateId ?? null;
                next[cat] = {
                    seriesTemplateId: seriesIdApplied,
                    projectFields: fullMerge(
                        info?.projectTemplate?.customFields || [],
                        seriesIdApplied,
                        sl
                    ),
                    seriesEditor: null,
                    seriesDeletes: [],
                    dirty: false,
                };
            });
            setDrafts(next);
        } catch (e) {
            console.error('Failed to load templates:', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, seriesId]);

    async function reloadCategory(cat: CompendiumCategory) {
        const [seriesRes, info] = await Promise.all([
            seriesId
                ? rpc.request['db:list-series-templates']({ seriesId })
                : (Promise.resolve([]) as Promise<SeriesTemplate[]>),
            rpc.request['db:get-resolved-template']({
                projectId,
                baseType: cat,
            }),
        ]);
        const sl = Array.isArray(seriesRes) ? seriesRes : [];
        setSeriesTemplates(sl);
        const seriesIdApplied = info?.projectTemplate?.seriesTemplateId ?? null;
        setDrafts((prev) => ({
            ...prev,
            [cat]: {
                seriesTemplateId: seriesIdApplied,
                projectFields: fullMerge(
                    info?.projectTemplate?.customFields || [],
                    seriesIdApplied,
                    sl
                ),
                seriesEditor: null,
                seriesDeletes: [],
                dirty: false,
            },
        }));
    }

    function updateDraft(
        cat: CompendiumCategory,
        patch: Partial<CategoryDraft>
    ) {
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            return { ...prev, [cat]: { ...d, ...patch, dirty: true } };
        });
    }

    function isSectionCollapsed(
        cat: CompendiumCategory,
        section: 'series' | 'project'
    ) {
        return !!collapsedSections[`${cat}:${section}`];
    }

    function toggleSection(
        cat: CompendiumCategory,
        section: 'series' | 'project'
    ) {
        setCollapsedSections((prev) => ({
            ...prev,
            [`${cat}:${section}`]: !prev[`${cat}:${section}`],
        }));
    }

    function handleSeriesChange(cat: CompendiumCategory, newId: string) {
        const id = newId || null;
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            const oldInherited = getSeriesInheritedNames(
                d.seriesTemplateId,
                seriesTemplates
            );
            const cleaned = d.projectFields.filter(
                (f) => !oldInherited.has(f.name)
            );
            return {
                ...prev,
                [cat]: {
                    ...d,
                    seriesTemplateId: id,
                    projectFields: fullMerge(cleaned, id, seriesTemplates),
                    dirty: true,
                },
            };
        });
    }

    function openSeriesCreate(cat: CompendiumCategory) {
        updateDraft(cat, {
            seriesEditor: {
                id: null,
                name: '',
                description: '',
                fields: [],
            },
        });
    }

    function openSeriesEdit(cat: CompendiumCategory, tpl: SeriesTemplate) {
        updateDraft(cat, {
            seriesEditor: {
                id: tpl.id,
                name: tpl.name,
                description: tpl.description || '',
                fields: tpl.customFields || [],
            },
        });
    }

    function cancelSeriesEditor(cat: CompendiumCategory) {
        updateDraft(cat, { seriesEditor: null });
    }

    function updateSeriesEditor(
        cat: CompendiumCategory,
        patch: Partial<SeriesEditorState>
    ) {
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d?.seriesEditor) return prev;
            return {
                ...prev,
                [cat]: {
                    ...d,
                    seriesEditor: { ...d.seriesEditor, ...patch },
                    dirty: true,
                },
            };
        });
    }

    function stageSeriesDelete(cat: CompendiumCategory, id: string) {
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            let seriesTemplateId = d.seriesTemplateId;
            let projectFields = d.projectFields;
            if (d.seriesTemplateId === id) {
                const oldInherited = getSeriesInheritedNames(
                    id,
                    seriesTemplates
                );
                const cleaned = d.projectFields.filter(
                    (f) => !oldInherited.has(f.name)
                );
                seriesTemplateId = null;
                projectFields = fullMerge(cleaned, null, seriesTemplates);
            }
            return {
                ...prev,
                [cat]: {
                    ...d,
                    seriesTemplateId,
                    projectFields,
                    seriesDeletes: [...d.seriesDeletes, id],
                    dirty: true,
                },
            };
        });
    }

    async function persistSeriesEditor(cat: CompendiumCategory) {
        const d = drafts[cat];
        const se = d?.seriesEditor;
        if (!se || !seriesId) return false;
        const savable = se.fields
            .filter((f) => !f.disabled)
            .filter((f) => f.name.trim() && f.label.trim());

        if (se.id) {
            const data = {
                name: se.name.trim(),
                description: se.description.trim() || null,
                customFields: savable,
            };
            await rpc.request['db:update-series-template']({
                id: se.id,
                data,
            });
            return true;
        }
        if (!se.name.trim()) return false;
        const data: NewSeriesTemplate = {
            id: crypto.randomUUID(),
            seriesId,
            name: se.name.trim(),
            description: se.description.trim() || null,
            baseType: cat,
            customFields: savable,
        };
        await rpc.request['db:create-series-template'](data);
        return true;
    }

    async function refreshSeries(
        cat: CompendiumCategory,
        opts?: { keepEditor?: boolean }
    ) {
        if (!seriesId) return;
        const res = await rpc.request['db:list-series-templates']({ seriesId });
        const sl = Array.isArray(res) ? res : [];
        setSeriesTemplates(sl);
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            const cleaned = d.projectFields.filter(
                (f) =>
                    !getSeriesInheritedNames(d.seriesTemplateId, sl).has(f.name)
            );
            return {
                ...prev,
                [cat]: {
                    ...d,
                    projectFields: fullMerge(cleaned, d.seriesTemplateId, sl),
                    ...(opts?.keepEditor ? {} : { seriesEditor: null }),
                },
            };
        });
    }

    async function saveSeriesEditor(cat: CompendiumCategory) {
        try {
            const saved = await persistSeriesEditor(cat);
            if (saved) await refreshSeries(cat);
        } catch (e) {
            console.error('Failed to save series template:', e);
        }
    }

    async function handleSaveCategory(cat: CompendiumCategory) {
        const d = drafts[cat];
        if (!d) return;
        setSavingCat(cat);
        try {
            for (const id of d.seriesDeletes) {
                await rpc.request['db:delete-series-template'](id);
            }

            await persistSeriesEditor(cat);

            const seriesInherited = getSeriesInheritedNames(
                d.seriesTemplateId,
                seriesTemplates
            );
            const savableProject = d.projectFields
                .filter((f) => {
                    if (!seriesInherited.has(f.name)) return true;
                    if (f.disabled) return true;
                    return false;
                })
                .filter((f) => f.name.trim() && f.label.trim());

            await rpc.request['db:save-template']({
                projectId,
                baseType: cat,
                customFields: savableProject,
                seriesTemplateId: d.seriesTemplateId,
            });

            await reloadCategory(cat);
            onTemplatesChanged();
        } catch (e) {
            console.error('Failed to save category:', e);
        } finally {
            setSavingCat(null);
        }
    }

    function toggleAddCard() {
        const next = !showAddCard;
        setShowAddCard(next);
        if (!next) return;
        const d = drafts[activeCat];
        const preferred = d?.seriesEditor?.id || d?.seriesTemplateId || '';
        setSeriesPick(
            seriesTemplates.some((s) => s.id === preferred) ? preferred : ''
        );
        setAddTarget(d?.seriesEditor?.id ? 'series' : 'project');
        setNewFieldName('');
        setNewFieldType('text');
        setNewSeriesName('');
    }

    function canSubmitField() {
        if (!newFieldName.trim() || addingField) return false;
        if (addTarget === 'series') {
            if (!seriesId || !seriesPick) return false;
            if (seriesPick === NEW_SERIES && !newSeriesName.trim())
                return false;
        }
        return true;
    }

    function resetAddCard() {
        setNewFieldName('');
        setNewSeriesName('');
        setShowAddCard(false);
    }

    async function handleAddFieldSubmit() {
        const d = drafts[activeCat];
        if (!d || !newFieldName.trim()) return;
        const field = buildFieldDefinition(newFieldName.trim(), newFieldType);

        if (addTarget === 'project') {
            updateDraft(activeCat, {
                projectFields: [...d.projectFields, field],
            });
            resetAddCard();
            return;
        }

        if (!seriesId) return;
        if (seriesPick === NEW_SERIES) {
            if (!newSeriesName.trim()) return;
        } else if (!seriesTemplates.some((s) => s.id === seriesPick)) {
            return;
        }

        setAddingField(true);
        try {
            if (seriesPick === NEW_SERIES) {
                const data: NewSeriesTemplate = {
                    id: crypto.randomUUID(),
                    seriesId,
                    name: newSeriesName.trim(),
                    description: null,
                    baseType: activeCat,
                    customFields: [field],
                };
                await rpc.request['db:create-series-template'](data);
            } else {
                const tpl = seriesTemplates.find((s) => s.id === seriesPick);
                if (!tpl) return;
                await rpc.request['db:update-series-template']({
                    id: tpl.id,
                    data: {
                        name: tpl.name,
                        description: tpl.description || null,
                        customFields: [...(tpl.customFields || []), field],
                    },
                });
            }
            await refreshSeries(activeCat, { keepEditor: true });
            resetAddCard();
        } catch (e) {
            console.error('Failed to add series field:', e);
        } finally {
            setAddingField(false);
        }
    }

    function summaryFor(d: CategoryDraft): string {
        const s =
            seriesTemplates.find((x) => x.id === d.seriesTemplateId)
                ?.customFields?.length || 0;
        const inherited = new Set(
            Array.from(
                getSeriesInheritedNames(d.seriesTemplateId, seriesTemplates)
            )
        );
        const p = d.projectFields.filter((f) => !inherited.has(f.name)).length;
        return `${s} series · ${p} project`;
    }

    function seriesSummary(d: CategoryDraft): string {
        if (!seriesId) return 'Not applicable';
        const s = seriesTemplates.find((x) => x.id === d.seriesTemplateId);
        return s ? `${s.name} (${s.customFields?.length || 0} fields)` : 'None';
    }

    function projectSummary(d: CategoryDraft): string {
        const inherited = new Set(
            Array.from(
                getSeriesInheritedNames(d.seriesTemplateId, seriesTemplates)
            )
        );
        return `${d.projectFields.filter((f) => !inherited.has(f.name)).length} project fields`;
    }

    function renderFieldPreview(
        fields: FieldDefinition[],
        labelResolver: (name: string) => string
    ) {
        if (fields.length === 0) {
            return (
                <span style={{ color: '#888', fontStyle: 'italic' }}>
                    No fields
                </span>
            );
        }
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {fields.map((f) => {
                    const visDesc = describeVisibility(
                        f.visibleWhen,
                        labelResolver
                    );
                    return (
                        <span
                            key={f.name}
                            title={visDesc || undefined}
                            style={{
                                padding: '0.15rem 0.4rem',
                                background: 'var(--bg-secondary, #222)',
                                borderRadius: '3px',
                                fontSize: '0.85em',
                                color: '#ccc',
                            }}
                        >
                            {f.label || f.name}
                            {f.required && (
                                <span style={{ color: '#e74c3c' }}>*</span>
                            )}
                            <span
                                style={{
                                    color: '#888',
                                    marginLeft: '0.25rem',
                                    fontSize: '0.85em',
                                }}
                            >
                                ({f.type})
                            </span>
                            {visDesc && (
                                <span
                                    style={{
                                        color: '#4A9EFF',
                                        marginLeft: '0.25rem',
                                        fontSize: '0.85em',
                                    }}
                                >
                                    👁
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
        );
    }

    function renderSeriesEditor(cat: CompendiumCategory, d: CategoryDraft) {
        const se = d.seriesEditor!;
        return (
            <div
                style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    border: '1px solid #4A9EFF',
                    borderRadius: '4px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                    }}
                >
                    <strong>
                        {se.id
                            ? 'Editing Series Template'
                            : 'New Series Template'}
                    </strong>
                    <button
                        type="button"
                        onClick={() => cancelSeriesEditor(cat)}
                    >
                        Cancel
                    </button>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                    <label>Template Name</label>
                    <input
                        type="text"
                        value={se.name}
                        onChange={(e) =>
                            updateSeriesEditor(cat, { name: e.target.value })
                        }
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                    <label>Description</label>
                    <textarea
                        value={se.description}
                        onChange={(e) =>
                            updateSeriesEditor(cat, {
                                description: e.target.value,
                            })
                        }
                        rows={2}
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label>Fields</label>
                    <SimpleFieldsEditor
                        fields={se.fields}
                        onChange={(fields) =>
                            updateSeriesEditor(cat, { fields })
                        }
                        inheritedNames={new Set()}
                    />
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => cancelSeriesEditor(cat)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="save-btn"
                        onClick={() => saveSeriesEditor(cat)}
                        disabled={!se.name.trim()}
                    >
                        Save Series Template
                    </button>
                </div>
            </div>
        );
    }

    function renderSeriesSection(cat: CompendiumCategory, d: CategoryDraft) {
        if (!seriesId) {
            return (
                <div>
                    <div style={{ color: '#888', fontSize: '0.85em' }}>
                        This project is not assigned to a series, so no series
                        templates apply. Assign a series in the General tab.
                    </div>
                </div>
            );
        }
        const seriesForCat = seriesTemplates.filter((s) => s.baseType === cat);
        const applied = seriesTemplates.find(
            (s) => s.id === d.seriesTemplateId
        );
        return (
            <div>
                <select
                    value={d.seriesTemplateId || ''}
                    onChange={(e) => handleSeriesChange(cat, e.target.value)}
                    style={{ width: '100%' }}
                >
                    <option value="">None (no series template)</option>
                    {seriesForCat.map((st) => (
                        <option key={st.id} value={st.id}>
                            {st.name}
                            {st.description ? ` — ${st.description}` : ''} (
                            {st.customFields?.length || 0} fields)
                        </option>
                    ))}
                </select>
                {applied && (
                    <div
                        style={{
                            padding: '0.5rem',
                            background: 'var(--bg-secondary, #1a1a1a)',
                            borderRadius: '4px',
                            marginTop: '0.5rem',
                        }}
                    >
                        <div
                            style={{
                                color: '#888',
                                fontSize: '0.8em',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Applied series fields (also shown as inherited
                            below):
                        </div>
                        {renderFieldPreview(
                            applied.customFields,
                            (name) =>
                                d.projectFields.find((p) => p.name === name)
                                    ?.label || name
                        )}
                    </div>
                )}

                <div style={{ marginTop: '0.75rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                        }}
                    >
                        <span style={{ fontSize: '0.9em', color: '#ccc' }}>
                            Series templates for {categoryLabels[cat]} (shared
                            across the series)
                        </span>
                        <button
                            type="button"
                            onClick={() => openSeriesCreate(cat)}
                        >
                            + New Series Template
                        </button>
                    </div>
                    {seriesForCat.length === 0 ? (
                        <div style={{ color: '#888', fontSize: '0.85em' }}>
                            No series templates for this category yet.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                            }}
                        >
                            {seriesForCat.map((st) => {
                                const stagedDelete = d.seriesDeletes.includes(
                                    st.id
                                );
                                return (
                                    <div
                                        key={st.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.5rem',
                                            border: '1px solid var(--border, #333)',
                                            borderRadius: '4px',
                                            opacity: stagedDelete ? 0.5 : 1,
                                        }}
                                    >
                                        <div>
                                            <strong>{st.name}</strong>
                                            <span
                                                style={{
                                                    marginLeft: '0.5rem',
                                                    color: '#888',
                                                    fontSize: '0.85em',
                                                }}
                                            >
                                                ({st.customFields?.length || 0}{' '}
                                                fields)
                                            </span>
                                            {st.id === d.seriesTemplateId && (
                                                <span
                                                    style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.7em',
                                                        color: '#4A9EFF',
                                                        background:
                                                            'rgba(74,158,255,0.15)',
                                                        padding: '1px 6px',
                                                        borderRadius: '3px',
                                                    }}
                                                >
                                                    APPLIED
                                                </span>
                                            )}
                                            {stagedDelete && (
                                                <span
                                                    style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.7em',
                                                        color: '#e74c3c',
                                                        background:
                                                            'rgba(231,76,60,0.15)',
                                                        padding: '1px 6px',
                                                        borderRadius: '3px',
                                                    }}
                                                >
                                                    PENDING DELETE
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openSeriesEdit(cat, st)
                                                }
                                                disabled={stagedDelete}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() =>
                                                    stageSeriesDelete(
                                                        cat,
                                                        st.id
                                                    )
                                                }
                                                style={{ color: '#e74c3c' }}
                                                disabled={stagedDelete}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {d.seriesDeletes.length > 0 && (
                        <div
                            style={{
                                color: '#FFA500',
                                fontSize: '0.85em',
                                marginTop: '0.35rem',
                            }}
                        >
                            {d.seriesDeletes.length} template(s) marked for
                            deletion — removed when you Save.
                        </div>
                    )}
                </div>

                {d.seriesEditor && renderSeriesEditor(cat, d)}
            </div>
        );
    }

    function renderProjectSection(cat: CompendiumCategory, d: CategoryDraft) {
        return (
            <div>
                <p
                    style={{
                        fontSize: '0.85em',
                        color: '#888',
                        margin: '0 0 0.5rem 0',
                    }}
                >
                    The effective template for this project. Inherited fields
                    from the series template are shown with an INHERITED badge.
                </p>
                <ProjectFieldsEditor
                    fields={d.projectFields}
                    onChange={(fields) =>
                        updateDraft(cat, { projectFields: fields })
                    }
                    inheritedNames={getSeriesInheritedNames(
                        d.seriesTemplateId,
                        seriesTemplates
                    )}
                />
            </div>
        );
    }

    const [showAddCard, setShowAddCard] = useState(false);
    const [addTarget, setAddTarget] = useState<AddTarget>('project');
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] =
        useState<FieldDefinition['type']>('text');
    const [seriesPick, setSeriesPick] = useState('');
    const [newSeriesName, setNewSeriesName] = useState('');
    const [addingField, setAddingField] = useState(false);
    const addCardRef = useRef<HTMLDivElement | null>(null);
    const addButtonGroupRef = useRef<HTMLDivElement | null>(null);

    const activeDraft = drafts[activeCat];

    useEffect(() => {
        if (!showAddCard) return;
        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (
                addCardRef.current?.contains(t) ||
                addButtonGroupRef.current?.contains(t)
            ) {
                return;
            }
            setShowAddCard(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowAddCard(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showAddCard]);

    useEffect(() => {
        setShowAddCard(false);
    }, [activeCat]);

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                minHeight: 0,
            }}
        >
            {loading ? (
                <div
                    style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#888',
                    }}
                >
                    Loading templates...
                </div>
            ) : (
                <>
                    <div className={styles.header}>
                        <div className={styles.headerTabs}>
                            {CATEGORIES.map((cat) => {
                                const d = drafts[cat];
                                if (!d) return null;
                                const isActive = activeCat === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setActiveCat(cat)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            gap: '0.15rem',
                                            padding: '0.4rem 0.75rem',
                                            borderRadius: '4px',
                                            border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border, #333)'}`,
                                            cursor: 'pointer',
                                            background: isActive
                                                ? 'var(--accent-subtle, rgba(240,160,80,0.08))'
                                                : 'transparent',
                                            color: isActive
                                                ? 'var(--accent)'
                                                : '#ccc',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                            }}
                                        >
                                            <strong>
                                                {categoryLabels[cat]}
                                            </strong>
                                            {d.dirty && (
                                                <span
                                                    style={{
                                                        fontSize: '0.65em',
                                                        color: '#FFA500',
                                                        background:
                                                            'rgba(255,165,0,0.15)',
                                                        padding: '1px 5px',
                                                        borderRadius: '3px',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    UNSAVED
                                                </span>
                                            )}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.72em',
                                                opacity: 0.75,
                                            }}
                                        >
                                            {summaryFor(d)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div
                            className={styles.headerActions}
                            ref={addButtonGroupRef}
                        >
                            {activeDraft?.dirty && (
                                <button
                                    type="button"
                                    onClick={() => reloadCategory(activeCat)}
                                >
                                    Discard
                                </button>
                            )}
                            <button
                                type="button"
                                className="save-btn"
                                onClick={() => handleSaveCategory(activeCat)}
                                disabled={
                                    !activeDraft?.dirty ||
                                    savingCat === activeCat
                                }
                            >
                                {savingCat === activeCat ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                className={`${styles.addFieldBtn} ${
                                    showAddCard ? styles.addFieldBtnOpen : ''
                                }`}
                                onClick={toggleAddCard}
                            >
                                {showAddCard ? 'cancel' : 'add'}
                            </button>
                        </div>
                        {showAddCard && (
                            <div className={styles.addField} ref={addCardRef}>
                                <div className={styles.addCardTarget}>
                                    <button
                                        type="button"
                                        className={
                                            addTarget === 'project'
                                                ? styles.addCardTargetOn
                                                : undefined
                                        }
                                        onClick={() => setAddTarget('project')}
                                    >
                                        Project field
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            addTarget === 'series'
                                                ? styles.addCardTargetOn
                                                : undefined
                                        }
                                        onClick={() => setAddTarget('series')}
                                        disabled={!seriesId}
                                        title={
                                            seriesId
                                                ? 'Shared across the series'
                                                : 'This project has no series'
                                        }
                                    >
                                        Series field
                                    </button>
                                </div>
                                {!seriesId && (
                                    <span
                                        style={{
                                            color: '#888',
                                            fontSize: '0.8em',
                                        }}
                                    >
                                        This project is not assigned to a
                                        series, so only project fields can be
                                        added.
                                    </span>
                                )}
                                <div>
                                    <label>Field name</label>
                                    <input
                                        type="text"
                                        placeholder="Field name"
                                        value={newFieldName}
                                        onChange={(e) =>
                                            setNewFieldName(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' &&
                                                canSubmitField()
                                            ) {
                                                handleAddFieldSubmit();
                                            }
                                        }}
                                    />
                                </div>
                                <div>
                                    <label>Type</label>
                                    <FieldTypePills
                                        value={newFieldType}
                                        onChange={setNewFieldType}
                                    />
                                </div>
                                {addTarget === 'series' && (
                                    <div>
                                        <label>Series template</label>
                                        <select
                                            value={seriesPick}
                                            onChange={(e) =>
                                                setSeriesPick(e.target.value)
                                            }
                                        >
                                            <option value="">
                                                None — pick one
                                            </option>
                                            {seriesTemplates
                                                .filter(
                                                    (s) =>
                                                        s.baseType === activeCat
                                                )
                                                .map((s) => (
                                                    <option
                                                        key={s.id}
                                                        value={s.id}
                                                    >
                                                        {s.name} (
                                                        {s.customFields
                                                            ?.length || 0}{' '}
                                                        fields)
                                                    </option>
                                                ))}
                                            <option value={NEW_SERIES}>
                                                + New series template…
                                            </option>
                                        </select>
                                        {seriesPick === NEW_SERIES && (
                                            <div
                                                style={{
                                                    marginTop: '0.35rem',
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Series template name"
                                                    value={newSeriesName}
                                                    onChange={(e) =>
                                                        setNewSeriesName(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className={styles.addCardFooter}>
                                    <span>
                                        {addTarget === 'series'
                                            ? 'Saved immediately to the series template.'
                                            : 'Staged — press Save to apply.'}
                                    </span>
                                    <button
                                        type="button"
                                        className="save-btn"
                                        onClick={handleAddFieldSubmit}
                                        disabled={!canSubmitField()}
                                    >
                                        {addingField
                                            ? 'Saving…'
                                            : addTarget === 'series'
                                              ? 'Save series field'
                                              : 'Add field'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {(() => {
                        const d = drafts[activeCat];
                        if (!d) return null;
                        const seriesForCat = seriesTemplates.filter(
                            (s) => s.baseType === activeCat
                        );
                        return (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    padding: '0.25rem 0.25rem 0.5rem',
                                }}
                            >
                                {seriesForCat.length !== 0 ? (
                                    <CollapsibleSection
                                        title="Series Template"
                                        collapsed={
                                            isSectionCollapsed(
                                                activeCat,
                                                'series'
                                            ) && !d.seriesEditor
                                        }
                                        onToggle={() =>
                                            toggleSection(activeCat, 'series')
                                        }
                                        summary={seriesSummary(d)}
                                    >
                                        {renderSeriesSection(activeCat, d)}
                                    </CollapsibleSection>
                                ) : (
                                    ''
                                )}
                                <CollapsibleSection
                                    title="Project Fields"
                                    collapsed={isSectionCollapsed(
                                        activeCat,
                                        'project'
                                    )}
                                    onToggle={() =>
                                        toggleSection(activeCat, 'project')
                                    }
                                    summary={projectSummary(d)}
                                >
                                    {renderProjectSection(activeCat, d)}
                                </CollapsibleSection>
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    );
}

function CollapsibleSection({
    title,
    collapsed,
    onToggle,
    summary,
    children,
}: {
    title: string;
    collapsed: boolean;
    onToggle: () => void;
    summary: string;
    children: ReactNode;
}) {
    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-secondary, #1a1a1a)',
                    border: '1px solid var(--border, #333)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
            >
                <span
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}
                >
                    <span style={{ color: '#888' }}>
                        {collapsed ? '▸' : '▾'}
                    </span>
                    <strong style={{ color: '#ccc' }}>{title}</strong>
                </span>
                <span
                    style={{
                        color: '#888',
                        fontSize: '0.8em',
                        textAlign: 'right',
                    }}
                >
                    {summary}
                </span>
            </button>
            {!collapsed && (
                <div style={{ marginTop: '0.5rem' }}>{children}</div>
            )}
        </div>
    );
}

function buildFieldDefinition(
    name: string,
    type: FieldDefinition['type']
): FieldDefinition {
    return {
        name: name.toLowerCase().replace(/\s+/g, '_'),
        type,
        label: name,
        required: false,
        ...(type === 'select' || type === 'multiselect' ? { options: [] } : {}),
        ...(type === 'range'
            ? { rangeMin: 0, rangeMax: 100, rangeStep: 1 }
            : {}),
        ...(type === 'entitylink'
            ? {
                  entitylinkCategories: [
                      'character',
                      'location',
                      'organization',
                      'item',
                      'lore',
                  ],
              }
            : {}),
        ...(type === 'tree'
            ? {
                  entitylinkCategories: ['character'],
                  treeRelations: TREE_PRESETS.family,
              }
            : {}),
    };
}

function FieldTypePills({
    value,
    onChange,
}: {
    value: FieldDefinition['type'];
    onChange: (type: FieldDefinition['type']) => void;
}) {
    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
        >
            {FIELD_TYPE_GROUPS.map((group) => (
                <div key={group.label}>
                    <div
                        style={{
                            fontSize: '0.7em',
                            color: '#888',
                            marginBottom: '0.2rem',
                        }}
                    >
                        {group.label}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.25rem',
                        }}
                    >
                        {group.types.map(({ type, label }) => {
                            const selected = value === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => onChange(type)}
                                    style={{
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '12px',
                                        fontSize: '0.8em',
                                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border, #333)'}`,
                                        background: selected
                                            ? 'var(--accent-subtle, rgba(240,160,80,0.12))'
                                            : 'transparent',
                                        color: selected
                                            ? 'var(--accent)'
                                            : '#bbb',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ProjectFieldsEditor({
    fields,
    onChange,
    inheritedNames,
}: {
    fields: FieldDefinition[];
    onChange: (fields: FieldDefinition[]) => void;
    inheritedNames: Set<string>;
}) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    function updateField(index: number, updates: Partial<FieldDefinition>) {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    }

    function removeField(index: number) {
        onChange(fields.filter((_, i) => i !== index));
    }

    function toggleFieldDisabled(fieldName: string) {
        onChange(
            fields.map((f) =>
                f.name === fieldName ? { ...f, disabled: !f.disabled } : f
            )
        );
    }

    function isInherited(fieldName: string): boolean {
        return inheritedNames.has(fieldName);
    }

    function moveField(from: number, to: number) {
        if (from === to) return;
        const newFields = [...fields];
        const [moved] = newFields.splice(from, 1);
        newFields.splice(to, 0, moved);
        onChange(newFields);
    }

    function handleDragStart(index: number) {
        setDragIndex(index);
    }

    function handleDragOver(e: React.DragEvent, index: number) {
        e.preventDefault();
        setDragOverIndex(index);
    }

    function handleDragLeave() {
        setDragOverIndex(null);
    }

    function handleDrop(index: number) {
        if (dragIndex !== null && dragIndex !== index) {
            moveField(dragIndex, index);
        }
        setDragIndex(null);
        setDragOverIndex(null);
    }

    function handleDragEnd() {
        setDragIndex(null);
        setDragOverIndex(null);
    }

    return (
        <div>
            {fields.length === 0 ? (
                <div style={{ color: '#888', fontSize: '0.85em' }}>
                    No fields defined.
                </div>
            ) : (
                <div
                    style={{
                        /*display: "flex", flexDirection: "column", gap: "0.5rem",*/ display:
                            'grid',
                        gridTemplateColumns:
                            'repeat(auto-fill, minmax(420px, 1fr))',
                        gap: '12px',
                    }}
                >
                    {fields.map((field, index) => {
                        const isOver =
                            dragOverIndex === index && dragIndex !== index;
                        return (
                            <div
                                key={`${field.name}-${index}`}
                                draggable={!field.disabled}
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={() => handleDrop(index)}
                                onDragEnd={handleDragEnd}
                                style={{
                                    padding: '0.5rem',
                                    border: `1px solid ${isOver ? '#4A9EFF' : 'var(--border, #333)'}`,
                                    borderRadius: '4px',
                                    borderStyle: isOver ? 'dashed' : 'solid',
                                    opacity: dragIndex === index ? 0.4 : 1,
                                    cursor: field.disabled ? 'default' : 'grab',
                                    backgroundColor: '#1a1b1c',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <span
                                            style={{
                                                cursor: field.disabled
                                                    ? 'default'
                                                    : 'grab',
                                                color: '#888',
                                                userSelect: 'none',
                                                fontSize: '22px',
                                                lineHeight: '16px',
                                            }}
                                        >
                                            ≡
                                        </span>
                                        <div
                                            className=""
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontFamily: 'var(--ui)',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {field.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontFamily: 'var(--mono)',
                                                    color: '#888',
                                                    fontSize: '0.85em',
                                                }}
                                            >
                                                {field.type}
                                            </span>
                                        </div>
                                        {isInherited(field.name) && (
                                            <span
                                                style={{
                                                    fontSize: '0.7em',
                                                    color: '#FFA500',
                                                    background:
                                                        'rgba(255,165,0,0.15)',
                                                    padding: '1px 6px',
                                                    borderRadius: '3px',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                INHERITED
                                            </span>
                                        )}
                                        {field.visibleWhen && (
                                            <span
                                                title={
                                                    describeVisibility(
                                                        field.visibleWhen,
                                                        (name) =>
                                                            fields.find(
                                                                (p) =>
                                                                    p.name ===
                                                                    name
                                                            )?.label || name
                                                    ) || undefined
                                                }
                                                style={{
                                                    fontSize: '0.7em',
                                                    color: '#4A9EFF',
                                                    background:
                                                        'rgba(74,158,255,0.15)',
                                                    padding: '1px 6px',
                                                    borderRadius: '3px',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                👁 CONDITIONAL
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            margin: '0px 12px 0px auto',
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.2rem',
                                                fontSize: '0.8em',
                                                color: '#888',
                                            }}
                                        >
                                            Span
                                            <select
                                                value={field.span || 4}
                                                onChange={(e) =>
                                                    updateField(index, {
                                                        span: Number(
                                                            e.target.value
                                                        ) as 1 | 2 | 3 | 4,
                                                    })
                                                }
                                                style={{
                                                    padding: '2px 4px',
                                                    fontSize: '0.85em',
                                                }}
                                            >
                                                <option value={1}>1</option>
                                                <option value={2}>2</option>
                                                <option value={3}>3</option>
                                                <option value={4}>4</option>
                                            </select>
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() => removeField(index)}
                                        style={{
                                            marginTop: '0.5rem',
                                            color: '#e74c3c',
                                            fontSize: '0.85em',
                                        }}
                                    >
                                        <IconTrash size={'18px'} />
                                    </button>
                                </div>
                                <div style={{ marginTop: '0.5rem' }}>
                                    {isInherited(field.name) ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    flex: 1,
                                                    color: '#aaa',
                                                    fontSize: '0.9em',
                                                }}
                                            >
                                                {field.label}
                                            </span>
                                            {field.required && (
                                                <span
                                                    style={{
                                                        color: '#e74c3c',
                                                        fontSize: '0.85em',
                                                    }}
                                                >
                                                    Required *
                                                </span>
                                            )}
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontSize: '0.85em',
                                                    cursor: 'pointer',
                                                    color: field.disabled
                                                        ? '#e74c3c'
                                                        : '#aaa',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!field.disabled}
                                                    onChange={() =>
                                                        toggleFieldDisabled(
                                                            field.name
                                                        )
                                                    }
                                                />
                                                Enabled
                                            </label>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.5rem',
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Label"
                                                    value={field.label}
                                                    onChange={(e) =>
                                                        updateField(index, {
                                                            label: e.target
                                                                .value,
                                                        })
                                                    }
                                                    style={{ flex: 1 }}
                                                />
                                                <label
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.85em',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={(e) =>
                                                            updateField(index, {
                                                                required:
                                                                    e.target
                                                                        .checked,
                                                            })
                                                        }
                                                    />
                                                    Required
                                                </label>
                                            </div>
                                            {(field.type === 'select' ||
                                                field.type ===
                                                    'multiselect') && (
                                                <input
                                                    type="text"
                                                    placeholder="Options (comma-separated)"
                                                    value={
                                                        field.options?.join(
                                                            ', '
                                                        ) || ''
                                                    }
                                                    onChange={(e) =>
                                                        updateField(index, {
                                                            options:
                                                                e.target.value
                                                                    .split(',')
                                                                    .map((o) =>
                                                                        o.trim()
                                                                    )
                                                                    .filter(
                                                                        Boolean
                                                                    ),
                                                        })
                                                    }
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            {field.type === 'range' && (
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: '0.5rem',
                                                        marginTop: '0.5rem',
                                                    }}
                                                >
                                                    <input
                                                        type="number"
                                                        placeholder="Min"
                                                        value={
                                                            field.rangeMin ?? 0
                                                        }
                                                        onChange={(e) =>
                                                            updateField(index, {
                                                                rangeMin:
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Max"
                                                        value={
                                                            field.rangeMax ??
                                                            100
                                                        }
                                                        onChange={(e) =>
                                                            updateField(index, {
                                                                rangeMax:
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Step"
                                                        value={
                                                            field.rangeStep ?? 1
                                                        }
                                                        onChange={(e) =>
                                                            updateField(index, {
                                                                rangeStep:
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ),
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}
                                            {(field.type === 'entitylink' ||
                                                field.type === 'tree') && (
                                                <div
                                                    style={{
                                                        marginTop: '0.5rem',
                                                    }}
                                                >
                                                    <label
                                                        style={{
                                                            fontSize: '0.85em',
                                                        }}
                                                    >
                                                        Allowed Categories:
                                                    </label>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            gap: '0.5rem',
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        {(
                                                            [
                                                                'character',
                                                                'location',
                                                                'organization',
                                                                'item',
                                                                'lore',
                                                            ] as CompendiumCategory[]
                                                        ).map((c) => (
                                                            <label
                                                                key={c}
                                                                style={{
                                                                    fontSize:
                                                                        '0.85em',
                                                                    display:
                                                                        'flex',
                                                                    alignItems:
                                                                        'center',
                                                                    gap: '0.2rem',
                                                                }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        field.entitylinkCategories?.includes(
                                                                            c
                                                                        ) ??
                                                                        true
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        const current =
                                                                            field.entitylinkCategories || [
                                                                                'character',
                                                                                'location',
                                                                                'organization',
                                                                                'item',
                                                                                'lore',
                                                                            ];
                                                                        const updated =
                                                                            e
                                                                                .target
                                                                                .checked
                                                                                ? [
                                                                                      ...current,
                                                                                      c,
                                                                                  ]
                                                                                : current.filter(
                                                                                      (
                                                                                          x
                                                                                      ) =>
                                                                                          x !==
                                                                                          c
                                                                                  );
                                                                        updateField(
                                                                            index,
                                                                            {
                                                                                entitylinkCategories:
                                                                                    updated,
                                                                            }
                                                                        );
                                                                    }}
                                                                />
                                                                {c}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {field.type === 'tree' && (
                                                <TreeRelationsEditor
                                                    relations={
                                                        field.treeRelations ||
                                                        TREE_PRESETS.family
                                                    }
                                                    onChange={(treeRelations) =>
                                                        updateField(index, {
                                                            treeRelations,
                                                        })
                                                    }
                                                />
                                            )}
                                            <VisibilityEditor
                                                fields={fields}
                                                currentIndex={index}
                                                value={field.visibleWhen}
                                                onChange={(v) =>
                                                    updateField(index, {
                                                        visibleWhen: v,
                                                    })
                                                }
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SimpleFieldsEditor({
    fields,
    onChange,
    inheritedNames,
}: {
    fields: FieldDefinition[];
    onChange: (fields: FieldDefinition[]) => void;
    inheritedNames: Set<string>;
}) {
    function updateField(index: number, updates: Partial<FieldDefinition>) {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        onChange(newFields);
    }

    function removeField(index: number) {
        onChange(fields.filter((_, i) => i !== index));
    }

    function toggleFieldDisabled(fieldName: string) {
        onChange(
            fields.map((f) =>
                f.name === fieldName ? { ...f, disabled: !f.disabled } : f
            )
        );
    }

    function moveField(from: number, to: number) {
        if (from === to) return;
        const newFields = [...fields];
        const [moved] = newFields.splice(from, 1);
        newFields.splice(to, 0, moved);
        onChange(newFields);
    }

    return (
        <div>
            {fields.length === 0 ? (
                <div style={{ color: '#888', fontSize: '0.85em' }}>
                    No fields defined
                </div>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}
                >
                    {fields.map((f, i) => (
                        <div
                            key={`${f.name}-${i}`}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid var(--border, #333)',
                                borderRadius: '4px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                    }}
                                >
                                    <strong>{f.name}</strong>
                                    {inheritedNames.has(f.name) && (
                                        <span
                                            style={{
                                                fontSize: '0.7em',
                                                color: '#FFA500',
                                                background:
                                                    'rgba(255,165,0,0.15)',
                                                padding: '1px 6px',
                                                borderRadius: '3px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            INHERITED
                                        </span>
                                    )}
                                    {f.visibleWhen && (
                                        <span
                                            title={
                                                describeVisibility(
                                                    f.visibleWhen,
                                                    (name) =>
                                                        fields.find(
                                                            (p) =>
                                                                p.name === name
                                                        )?.label || name
                                                ) || undefined
                                            }
                                            style={{
                                                fontSize: '0.7em',
                                                color: '#4A9EFF',
                                                background:
                                                    'rgba(74,158,255,0.15)',
                                                padding: '1px 6px',
                                                borderRadius: '3px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            👁 CONDITIONAL
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            color: '#888',
                                            fontSize: '0.85em',
                                        }}
                                    >
                                        {f.type}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => moveField(i, i - 1)}
                                        disabled={i === 0}
                                        title="Move up"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveField(i, i + 1)}
                                        disabled={i === fields.length - 1}
                                        title="Move down"
                                    >
                                        ↓
                                    </button>
                                </div>
                            </div>
                            {inheritedNames.has(f.name) ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        marginTop: '0.5rem',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span
                                        style={{
                                            flex: 1,
                                            color: '#aaa',
                                            fontSize: '0.9em',
                                        }}
                                    >
                                        {f.label}
                                    </span>
                                    {f.required && (
                                        <span
                                            style={{
                                                color: '#e74c3c',
                                                fontSize: '0.85em',
                                            }}
                                        >
                                            Required *
                                        </span>
                                    )}
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.85em',
                                            cursor: 'pointer',
                                            color: f.disabled
                                                ? '#e74c3c'
                                                : '#aaa',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!f.disabled}
                                            onChange={() =>
                                                toggleFieldDisabled(f.name)
                                            }
                                        />
                                        Enabled
                                    </label>
                                </div>
                            ) : (
                                <>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '0.5rem',
                                            marginTop: '0.5rem',
                                        }}
                                    >
                                        <input
                                            type="text"
                                            placeholder="Label"
                                            value={f.label}
                                            onChange={(e) =>
                                                updateField(i, {
                                                    label: e.target.value,
                                                })
                                            }
                                            style={{ flex: 1 }}
                                        />
                                        <label
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontSize: '0.85em',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={f.required}
                                                onChange={(e) =>
                                                    updateField(i, {
                                                        required:
                                                            e.target.checked,
                                                    })
                                                }
                                            />
                                            Required
                                        </label>
                                    </div>
                                    {(f.type === 'select' ||
                                        f.type === 'multiselect') && (
                                        <input
                                            type="text"
                                            placeholder="Options (comma-separated)"
                                            value={f.options?.join(', ') || ''}
                                            onChange={(e) =>
                                                updateField(i, {
                                                    options: e.target.value
                                                        .split(',')
                                                        .map((o) => o.trim())
                                                        .filter(Boolean),
                                                })
                                            }
                                            style={{
                                                width: '100%',
                                                marginTop: '0.5rem',
                                            }}
                                        />
                                    )}
                                    {f.type === 'range' && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                marginTop: '0.5rem',
                                            }}
                                        >
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                value={f.rangeMin ?? 0}
                                                onChange={(e) =>
                                                    updateField(i, {
                                                        rangeMin: Number(
                                                            e.target.value
                                                        ),
                                                    })
                                                }
                                            />
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                value={f.rangeMax ?? 100}
                                                onChange={(e) =>
                                                    updateField(i, {
                                                        rangeMax: Number(
                                                            e.target.value
                                                        ),
                                                    })
                                                }
                                            />
                                            <input
                                                type="number"
                                                placeholder="Step"
                                                value={f.rangeStep ?? 1}
                                                onChange={(e) =>
                                                    updateField(i, {
                                                        rangeStep: Number(
                                                            e.target.value
                                                        ),
                                                    })
                                                }
                                            />
                                        </div>
                                    )}
                                    <VisibilityEditor
                                        fields={fields}
                                        currentIndex={i}
                                        value={f.visibleWhen}
                                        onChange={(v) =>
                                            updateField(i, { visibleWhen: v })
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() => removeField(i)}
                                        style={{
                                            marginTop: '0.5rem',
                                            color: '#e74c3c',
                                            fontSize: '0.85em',
                                        }}
                                    >
                                        Remove
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
