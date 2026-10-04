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
    fields: FieldDefinition[];
}

interface CategoryDraft {
    projectFields: FieldDefinition[];
    seriesEditor: SeriesEditorState | null;
    dirty: boolean;
}

type AddTarget = 'project' | 'series';

type SeriesTemplateMap = Partial<Record<CompendiumCategory, SeriesTemplate>>;

function toSeriesTemplateMap(
    list: SeriesTemplate[] | undefined
): SeriesTemplateMap {
    const map: SeriesTemplateMap = {};
    for (const st of list ?? []) map[st.baseType] = st;
    return map;
}

export default function TemplateManagerTab({
    projectId,
    seriesId,
    onTemplatesChanged,
    initialCategory,
}: TemplateManagerTabProps) {
    const rpc = useRPC();
    const [seriesTemplates, setSeriesTemplates] = useState<SeriesTemplateMap>(
        {}
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
            const sl = toSeriesTemplateMap(
                Array.isArray(seriesRes) ? seriesRes : []
            );
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
                next[cat] = {
                    projectFields: fullMerge(
                        results[i]?.projectTemplate?.customFields || [],
                        sl[cat] ?? null
                    ),
                    seriesEditor: null,
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
        const sl = toSeriesTemplateMap(
            Array.isArray(seriesRes) ? seriesRes : []
        );
        setSeriesTemplates(sl);
        setDrafts((prev) => ({
            ...prev,
            [cat]: {
                projectFields: fullMerge(
                    info?.projectTemplate?.customFields || [],
                    sl[cat] ?? null
                ),
                seriesEditor: null,
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

    function setSeriesEditor(
        cat: CompendiumCategory,
        editor: SeriesEditorState | null
    ) {
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            return { ...prev, [cat]: { ...d, seriesEditor: editor } };
        });
    }

    function openSeriesCreate(cat: CompendiumCategory) {
        setSeriesEditor(cat, { fields: [] });
    }

    function openSeriesEdit(cat: CompendiumCategory) {
        const st = seriesTemplates[cat];
        if (!st) return;
        setSeriesEditor(cat, { fields: [...(st.customFields || [])] });
    }

    function cancelSeriesEditor(cat: CompendiumCategory) {
        setSeriesEditor(cat, null);
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

    async function persistSeriesEditor(cat: CompendiumCategory) {
        const se = drafts[cat]?.seriesEditor;
        if (!se || !seriesId) return false;
        const savable = se.fields
            .filter((f) => !f.disabled)
            .filter((f) => f.name.trim() && f.label.trim());

        await rpc.request['db:upsert-series-template']({
            seriesId,
            baseType: cat,
            customFields: savable,
        });
        return true;
    }

    async function refreshSeries(
        cat: CompendiumCategory,
        opts?: { keepEditor?: boolean }
    ) {
        if (!seriesId) return;
        const res = await rpc.request['db:list-series-templates']({ seriesId });
        const sl = toSeriesTemplateMap(Array.isArray(res) ? res : []);
        setSeriesTemplates(sl);
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            const st = sl[cat] ?? null;
            const cleaned = d.projectFields.filter(
                (f) => !getSeriesInheritedNames(st).has(f.name)
            );
            return {
                ...prev,
                [cat]: {
                    ...d,
                    projectFields: fullMerge(cleaned, st),
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

    async function removeSeriesTemplate(cat: CompendiumCategory) {
        if (!seriesId) return;
        if (
            !confirm(
                `Delete the series ${categoryLabels[cat].toLowerCase()} fields? This affects every project in the series.`
            )
        ) {
            return;
        }
        try {
            await rpc.request['db:delete-series-template']({
                seriesId,
                baseType: cat,
            });
            await refreshSeries(cat);
            // Fields that were inherited are no longer supplied by the series,
            // so the effective project template changed - flag it for review.
            updateDraft(cat, {});
            onTemplatesChanged();
        } catch (e) {
            console.error('Failed to delete series template:', e);
        }
    }

    async function handleSaveCategory(cat: CompendiumCategory) {
        const d = drafts[cat];
        if (!d) return;
        setSavingCat(cat);
        try {
            await persistSeriesEditor(cat);

            const seriesInherited = getSeriesInheritedNames(
                seriesTemplates[cat] ?? null
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
        setAddTarget('project');
        setNewFieldName('');
        setNewFieldType('text');
    }

    function canSubmitField() {
        if (!newFieldName.trim() || addingField) return false;
        if (addTarget === 'series') {
            if (!seriesId) return false;
            if (!seriesTemplates[activeCat]) return false;
        }
        return true;
    }

    function resetAddCard() {
        setNewFieldName('');
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
        const tpl = seriesTemplates[activeCat];
        if (!tpl) return;

        setAddingField(true);
        try {
            await rpc.request['db:upsert-series-template']({
                seriesId,
                baseType: activeCat,
                customFields: [...(tpl.customFields || []), field],
            });
            await refreshSeries(activeCat, { keepEditor: true });
            onTemplatesChanged();
            resetAddCard();
        } catch (e) {
            console.error('Failed to add series field:', e);
        } finally {
            setAddingField(false);
        }
    }

    function summaryFor(cat: CompendiumCategory, d: CategoryDraft): string {
        const s = seriesTemplates[cat]?.customFields?.length || 0;
        const inherited = getSeriesInheritedNames(seriesTemplates[cat] ?? null);
        const p = d.projectFields.filter((f) => !inherited.has(f.name)).length;
        return `${s} series · ${p} project`;
    }

    function seriesSummary(cat: CompendiumCategory): string {
        if (!seriesId) return 'Not applicable';
        const s = seriesTemplates[cat];
        return s
            ? `${s.customFields?.length || 0} fields · shared across the series`
            : 'None yet';
    }

    function projectSummary(d: CategoryDraft): string {
        const inherited = getSeriesInheritedNames(
            seriesTemplates[activeCat] ?? null
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
        const existing = !!seriesTemplates[cat];
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
                        {existing ? 'Editing' : 'Creating'} series{' '}
                        {categoryLabels[cat].toLowerCase()} fields
                    </strong>
                    <button
                        type="button"
                        onClick={() => cancelSeriesEditor(cat)}
                    >
                        Cancel
                    </button>
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
                    >
                        {existing
                            ? 'Save Series Fields'
                            : 'Create Series Fields'}
                    </button>
                </div>
            </div>
        );
    }

    function renderSeriesSection(cat: CompendiumCategory, d: CategoryDraft) {
        if (!seriesId) {
            return (
                <div style={{ color: '#888', fontSize: '0.85em' }}>
                    This project is not assigned to a series, so no series
                    fields apply. Assign a series in the General tab.
                </div>
            );
        }
        const st = seriesTemplates[cat] ?? null;
        return (
            <div>
                <p
                    style={{
                        fontSize: '0.85em',
                        color: '#888',
                        margin: '0 0 0.5rem 0',
                    }}
                >
                    The {categoryLabels[cat].toLowerCase()} fields shared by
                    every project in this series. Changes here apply to all of
                    them immediately.
                </p>
                {st ? (
                    <>
                        {renderFieldPreview(
                            st.customFields,
                            (name) =>
                                d.projectFields.find((p) => p.name === name)
                                    ?.label || name
                        )}
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginTop: '0.75rem',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => openSeriesEdit(cat)}
                            >
                                Edit series fields
                            </button>
                            <button
                                type="button"
                                className="danger"
                                onClick={() => removeSeriesTemplate(cat)}
                                style={{ color: '#e74c3c' }}
                            >
                                Delete series fields
                            </button>
                        </div>
                    </>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            border: '1px solid var(--border, #333)',
                            borderRadius: '4px',
                        }}
                    >
                        <span style={{ color: '#888', fontSize: '0.85em' }}>
                            No series {categoryLabels[cat].toLowerCase()} fields
                            yet.
                        </span>
                        <button
                            type="button"
                            onClick={() => openSeriesCreate(cat)}
                        >
                            + Create series fields
                        </button>
                    </div>
                )}

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
                    from the series are shown with an INHERITED badge and can be
                    disabled per project.
                </p>
                <ProjectFieldsEditor
                    fields={d.projectFields}
                    onChange={(fields) =>
                        updateDraft(cat, { projectFields: fields })
                    }
                    inheritedNames={getSeriesInheritedNames(
                        seriesTemplates[cat] ?? null
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
                                            {summaryFor(cat, d)}
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
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            reloadCategory(activeCat)
                                        }
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="button"
                                        className="save-btn"
                                        onClick={() =>
                                            handleSaveCategory(activeCat)
                                        }
                                        disabled={savingCat === activeCat}
                                    >
                                        {savingCat === activeCat
                                            ? 'Saving...'
                                            : 'Save'}
                                    </button>
                                </>
                            )}
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
                                {seriesId && (
                                    <div className={styles.addCardTarget}>
                                        <button
                                            type="button"
                                            className={
                                                addTarget === 'project'
                                                    ? styles.addCardTargetOn
                                                    : undefined
                                            }
                                            onClick={() =>
                                                setAddTarget('project')
                                            }
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
                                            onClick={() =>
                                                setAddTarget('series')
                                            }
                                            disabled={
                                                !seriesTemplates[activeCat]
                                            }
                                            title={
                                                seriesTemplates[activeCat]
                                                    ? 'Shared across the series'
                                                    : `No series ${categoryLabels[
                                                          activeCat
                                                      ].toLowerCase()} fields yet — create them in the Series section`
                                            }
                                        >
                                            Series field
                                        </button>
                                    </div>
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
                                <div className={styles.addCardFooter}>
                                    <span>
                                        {addTarget === 'series'
                                            ? 'Saved immediately to the series.'
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
                        return (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    padding: '0.25rem 0.25rem 0.5rem',
                                }}
                            >
                                {seriesId && (
                                    <CollapsibleSection
                                        title={`Series ${categoryLabels[activeCat]} Fields`}
                                        collapsed={
                                            isSectionCollapsed(
                                                activeCat,
                                                'series'
                                            ) && !d.seriesEditor
                                        }
                                        onToggle={() =>
                                            toggleSection(activeCat, 'series')
                                        }
                                        summary={seriesSummary(activeCat)}
                                    >
                                        {renderSeriesSection(activeCat, d)}
                                    </CollapsibleSection>
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
