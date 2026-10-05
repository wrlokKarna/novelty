import {
    useState,
    useEffect,
    useRef,
    type ReactNode,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
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

type AddTarget = 'project' | 'series';

type SeriesTemplateMap = Partial<Record<CompendiumCategory, SeriesTemplate>>;
type FieldsByCategory = Partial<Record<CompendiumCategory, FieldDefinition[]>>;

// The project template only ever stores project-owned fields plus the disabled
// overrides for inherited ones, so this is how a merged view round-trips back
// without losing a project's "disable this inherited field" choice.
function projectOwnedFields(
    merged: FieldDefinition[],
    seriesTemplate: SeriesTemplate | null
): FieldDefinition[] {
    const inherited = getSeriesInheritedNames(seriesTemplate);
    return merged.filter((f) => !inherited.has(f.name) || f.disabled);
}

function toSeriesTemplateMap(
    list: SeriesTemplate[] | undefined
): SeriesTemplateMap {
    const map: SeriesTemplateMap = {};
    for (const st of list ?? []) map[st.baseType] = st;
    return map;
}

interface ToastState {
    message: string;
    undo?: () => void;
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
    const [seriesFields, setSeriesFields] = useState<FieldsByCategory>({});
    const [projectFields, setProjectFields] = useState<FieldsByCategory>({});
    const [activeCat, setActiveCat] = useState<CompendiumCategory>(
        initialCategory ?? 'character'
    );
    const [loading, setLoading] = useState(true);
    const [collapsedSections, setCollapsedSections] = useState<
        Record<string, boolean>
    >({});
    const [savingCount, setSavingCount] = useState(0);
    const [savedRecently, setSavedRecently] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [loadNonce, setLoadNonce] = useState(0);

    // Refs so async commits and undo handlers always read current values.
    const seriesTemplatesRef = useRef<SeriesTemplateMap>({});
    const seriesFieldsRef = useRef<FieldsByCategory>({});
    const projectFieldsRef = useRef<FieldsByCategory>({});
    const commitQueueRef = useRef<
        Partial<Record<CompendiumCategory, Promise<void>>>
    >({});
    const notifyRef = useRef(onTemplatesChanged);
    notifyRef.current = onTemplatesChanged;
    const notifyTimerRef = useRef<number | null>(null);
    const savedTimerRef = useRef<number | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const [showAddCard, setShowAddCard] = useState(false);
    const [addTarget, setAddTarget] = useState<AddTarget>('project');
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] =
        useState<FieldDefinition['type']>('text');
    const [addingField, setAddingField] = useState(false);
    const addCardRef = useRef<HTMLDivElement | null>(null);
    const addButtonGroupRef = useRef<HTMLDivElement | null>(null);

    function setProjectFieldsFor(
        cat: CompendiumCategory,
        next: FieldDefinition[]
    ) {
        const map = { ...projectFieldsRef.current, [cat]: next };
        projectFieldsRef.current = map;
        setProjectFields(map);
    }

    function setSeriesFieldsFor(
        cat: CompendiumCategory,
        next: FieldDefinition[]
    ) {
        const map = { ...seriesFieldsRef.current, [cat]: next };
        seriesFieldsRef.current = map;
        setSeriesFields(map);
    }

    function scheduleNotify() {
        if (notifyTimerRef.current !== null)
            window.clearTimeout(notifyTimerRef.current);
        notifyTimerRef.current = window.setTimeout(() => {
            notifyTimerRef.current = null;
            notifyRef.current();
        }, 350);
    }

    // A pending runtime refresh must not be dropped when the tab goes away.
    useEffect(
        () => () => {
            if (notifyTimerRef.current !== null) {
                window.clearTimeout(notifyTimerRef.current);
                notifyTimerRef.current = null;
                notifyRef.current();
            }
        },
        []
    );

    useEffect(
        () => () => {
            if (savedTimerRef.current !== null)
                window.clearTimeout(savedTimerRef.current);
            if (toastTimerRef.current !== null)
                window.clearTimeout(toastTimerRef.current);
        },
        []
    );

    // Commits are serialized per category so a slow write can never land after a
    // newer one and resurrect stale data.
    function enqueueCommit(
        cat: CompendiumCategory,
        task: () => Promise<void>
    ): Promise<void> {
        const prev = commitQueueRef.current[cat] ?? Promise.resolve();
        const run = prev.then(async () => {
            setSavingCount((c) => c + 1);
            try {
                await task();
                setSaveFailed(false);
                setSavedRecently(true);
                if (savedTimerRef.current !== null)
                    window.clearTimeout(savedTimerRef.current);
                savedTimerRef.current = window.setTimeout(
                    () => setSavedRecently(false),
                    1600
                );
                scheduleNotify();
            } catch (e) {
                console.error('Failed to save template:', e);
                setSaveFailed(true);
                if (savedTimerRef.current !== null)
                    window.clearTimeout(savedTimerRef.current);
                savedTimerRef.current = window.setTimeout(
                    () => setSaveFailed(false),
                    4000
                );
            } finally {
                setSavingCount((c) => Math.max(0, c - 1));
            }
        });
        commitQueueRef.current[cat] = run;
        return run;
    }

    function commitProject(
        cat: CompendiumCategory,
        fields: FieldDefinition[]
    ): Promise<void> {
        return enqueueCommit(cat, async () => {
            const inherited = getSeriesInheritedNames(
                seriesTemplatesRef.current[cat] ?? null
            );
            const savable = fields
                .filter((f) => !inherited.has(f.name) || f.disabled)
                .filter((f) => f.name.trim() && f.label.trim());
            await rpc.request['db:save-template']({
                projectId,
                baseType: cat,
                customFields: savable,
            });
        });
    }

    function commitSeries(
        cat: CompendiumCategory,
        fields: FieldDefinition[]
    ): Promise<void> {
        if (!seriesId) return Promise.resolve();
        return enqueueCommit(cat, async () => {
            const savable = fields
                .filter((f) => !f.disabled)
                .filter((f) => f.name.trim() && f.label.trim());
            await rpc.request['db:upsert-series-template']({
                seriesId,
                baseType: cat,
                customFields: savable,
            });
            // Re-read so row existence and ids are authoritative, then re-merge
            // the project view against the new series fields.
            const res = await rpc.request['db:list-series-templates']({
                seriesId,
            });
            const sl = toSeriesTemplateMap(Array.isArray(res) ? res : []);
            seriesTemplatesRef.current = sl;
            setSeriesTemplates(sl);
            setSeriesFieldsFor(cat, sl[cat]?.customFields ?? []);
            const st = sl[cat] ?? null;
            setProjectFieldsFor(
                cat,
                fullMerge(
                    projectOwnedFields(projectFieldsRef.current[cat] ?? [], st),
                    st
                )
            );
        });
    }

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
            const results = await Promise.all(
                CATEGORIES.map((cat) =>
                    rpc.request['db:get-resolved-template']({
                        projectId,
                        baseType: cat,
                    })
                )
            );

            const nextSeries: FieldsByCategory = {};
            const nextProject: FieldsByCategory = {};
            CATEGORIES.forEach((cat, i) => {
                const st = sl[cat] ?? null;
                nextSeries[cat] = st?.customFields ?? [];
                nextProject[cat] = fullMerge(
                    results[i]?.projectTemplate?.customFields || [],
                    st
                );
            });

            seriesTemplatesRef.current = sl;
            seriesFieldsRef.current = nextSeries;
            projectFieldsRef.current = nextProject;
            setSeriesTemplates(sl);
            setSeriesFields(nextSeries);
            setProjectFields(nextProject);
            // Remount the editors so their text-commit baselines reset.
            setLoadNonce((n) => n + 1);
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

    function showToast(message: string, undo?: () => void) {
        if (toastTimerRef.current !== null)
            window.clearTimeout(toastTimerRef.current);
        setToast({ message, undo });
        toastTimerRef.current = window.setTimeout(() => setToast(null), 6000);
    }

    function runUndo() {
        const fn = toast?.undo;
        if (toastTimerRef.current !== null)
            window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
        setToast(null);
        fn?.();
    }

    function removeProjectField(cat: CompendiumCategory, index: number) {
        const merged = projectFieldsRef.current[cat] ?? [];
        const removed = merged[index];
        if (!removed) return;
        const next = merged.filter((_, i) => i !== index);
        setProjectFieldsFor(cat, next);
        commitProject(cat, next);
        showToast(`Removed "${removed.label || removed.name}"`, () => {
            const cur = projectFieldsRef.current[cat] ?? [];
            if (cur.some((f) => f.name === removed.name)) return;
            const restored = [
                ...cur.slice(0, index),
                removed,
                ...cur.slice(index),
            ];
            setProjectFieldsFor(cat, restored);
            commitProject(cat, restored);
        });
    }

    function removeSeriesField(cat: CompendiumCategory, index: number) {
        const current = seriesFieldsRef.current[cat] ?? [];
        const removed = current[index];
        if (!removed) return;
        const next = current.filter((_, i) => i !== index);
        setSeriesFieldsFor(cat, next);
        commitSeries(cat, next);
        showToast(`Removed "${removed.label || removed.name}"`, () => {
            const cur = seriesFieldsRef.current[cat] ?? [];
            if (cur.some((f) => f.name === removed.name)) return;
            const restored = [
                ...cur.slice(0, index),
                removed,
                ...cur.slice(index),
            ];
            setSeriesFieldsFor(cat, restored);
            commitSeries(cat, restored);
        });
    }

    async function removeSeriesTemplate(cat: CompendiumCategory) {
        if (!seriesId) return;
        if (
            !confirm(
                `Delete the series ${categoryLabels[cat].toLowerCase()} fields? This affects every project in the series.`
            )
        )
            return;
        await enqueueCommit(cat, async () => {
            await rpc.request['db:delete-series-template']({
                seriesId,
                baseType: cat,
            });
            const res = await rpc.request['db:list-series-templates']({
                seriesId,
            });
            const sl = toSeriesTemplateMap(Array.isArray(res) ? res : []);
            seriesTemplatesRef.current = sl;
            setSeriesTemplates(sl);
            setSeriesFieldsFor(cat, sl[cat]?.customFields ?? []);
            setProjectFieldsFor(
                cat,
                fullMerge(
                    projectOwnedFields(
                        projectFieldsRef.current[cat] ?? [],
                        null
                    ),
                    null
                )
            );
        });
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
        if (addTarget === 'series' && !seriesId) return false;
        return true;
    }

    function resetAddCard() {
        setNewFieldName('');
        setShowAddCard(false);
    }

    async function handleAddFieldSubmit() {
        const cat = activeCat;
        if (!newFieldName.trim()) return;
        const field = buildFieldDefinition(newFieldName.trim(), newFieldType);

        if (addTarget === 'project') {
            const next = [...(projectFieldsRef.current[cat] ?? []), field];
            setProjectFieldsFor(cat, next);
            commitProject(cat, next);
            resetAddCard();
            return;
        }

        if (!seriesId) return;
        const current = seriesFieldsRef.current[cat] ?? [];
        setAddingField(true);
        try {
            await commitSeries(cat, [...current, field]);
            resetAddCard();
        } finally {
            setAddingField(false);
        }
    }

    const saveStatusLabel = savingCount
        ? 'Saving…'
        : saveFailed
          ? 'Save failed'
          : savedRecently
            ? 'Saved'
            : '';

    const saveStatusColor = saveFailed
        ? '#e74c3c'
        : savedRecently && !savingCount
          ? '#4CAF50'
          : '#888';

    function summaryFor(cat: CompendiumCategory): string {
        const s = seriesFields[cat]?.length || 0;
        const inherited = getSeriesInheritedNames(seriesTemplates[cat] ?? null);
        const merged = projectFields[cat] ?? [];
        const p = merged.filter((f) => !inherited.has(f.name)).length;
        return `${s} series · ${p} project`;
    }

    function seriesSummary(cat: CompendiumCategory): string {
        if (!seriesId) return 'Not applicable';
        return `${seriesFields[cat]?.length || 0} fields · shared across the series`;
    }

    function projectSummary(cat: CompendiumCategory): string {
        const inherited = getSeriesInheritedNames(seriesTemplates[cat] ?? null);
        const merged = projectFields[cat] ?? [];
        return `${merged.filter((f) => !inherited.has(f.name)).length} project fields`;
    }

    function renderSeriesSection(cat: CompendiumCategory) {
        if (!seriesId) {
            return (
                <div style={{ color: '#888', fontSize: '0.85em' }}>
                    This project is not assigned to a series, so no series
                    fields apply. Assign a series in the General tab.
                </div>
            );
        }
        const st = seriesTemplates[cat] ?? null;
        const fields = seriesFields[cat] ?? [];

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
                    every project in this series. Changes save automatically and
                    apply to all of them immediately.
                </p>
                <SimpleFieldsEditor
                    key={`series:${cat}:${loadNonce}`}
                    fields={fields}
                    onChange={(next) => setSeriesFieldsFor(cat, next)}
                    onCommit={(next) => commitSeries(cat, next)}
                    onRemove={(index) => removeSeriesField(cat, index)}
                    inheritedNames={new Set()}
                />
                {st && (
                    <button
                        type="button"
                        className="danger"
                        onClick={() => removeSeriesTemplate(cat)}
                        style={{ color: '#e74c3c', marginTop: '0.5rem' }}
                    >
                        Delete series fields
                    </button>
                )}
            </div>
        );
    }

    function renderProjectSection(cat: CompendiumCategory) {
        const fields = projectFields[cat] ?? [];
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
                    disabled per project. Changes save automatically.
                </p>
                <ProjectFieldsEditor
                    key={`project:${cat}:${loadNonce}`}
                    fields={fields}
                    onChange={(next) => setProjectFieldsFor(cat, next)}
                    onCommit={(next) => commitProject(cat, next)}
                    onRemove={(index) => removeProjectField(cat, index)}
                    inheritedNames={getSeriesInheritedNames(
                        seriesTemplates[cat] ?? null
                    )}
                />
            </div>
        );
    }

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
                                        <strong>{categoryLabels[cat]}</strong>
                                        <span
                                            style={{
                                                fontSize: '0.72em',
                                                opacity: 0.75,
                                            }}
                                        >
                                            {summaryFor(cat)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div
                            className={styles.headerActions}
                            ref={addButtonGroupRef}
                        >
                            {saveStatusLabel && (
                                <span
                                    style={{
                                        fontSize: '0.8em',
                                        color: saveStatusColor,
                                    }}
                                >
                                    {saveStatusLabel}
                                </span>
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
                                            title="Shared across every project in this series"
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
                                    <span>Saved automatically.</span>
                                    <button
                                        type="button"
                                        onClick={handleAddFieldSubmit}
                                        disabled={!canSubmitField()}
                                    >
                                        {addingField
                                            ? 'Saving…'
                                            : addTarget === 'series'
                                              ? 'Add series field'
                                              : 'Add field'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

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
                                collapsed={isSectionCollapsed(
                                    activeCat,
                                    'series'
                                )}
                                onToggle={() =>
                                    toggleSection(activeCat, 'series')
                                }
                                summary={seriesSummary(activeCat)}
                            >
                                {renderSeriesSection(activeCat)}
                            </CollapsibleSection>
                        )}
                        <CollapsibleSection
                            title="Project Fields"
                            collapsed={isSectionCollapsed(activeCat, 'project')}
                            onToggle={() => toggleSection(activeCat, 'project')}
                            summary={projectSummary(activeCat)}
                        >
                            {renderProjectSection(activeCat)}
                        </CollapsibleSection>
                    </div>
                </>
            )}

            {toast && (
                <div className={styles.toast} role="status">
                    <span>{toast.message}</span>
                    {toast.undo && (
                        <button
                            type="button"
                            className={styles.toastAction}
                            onClick={runUndo}
                        >
                            Undo
                        </button>
                    )}
                </div>
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

// Autosave lives here so both editors share one set of rules: free-text edits
// only mutate local state and persist on blur/Enter, while discrete actions
// (toggles, selects, reorders, deletes) persist immediately.
interface FieldEditorHandlers {
    editField: (index: number, updates: Partial<FieldDefinition>) => void;
    commitField: (index: number, updates: Partial<FieldDefinition>) => void;
    commitPending: () => void;
    commitOnEnter: (e: ReactKeyboardEvent) => void;
    removeField: (index: number) => void;
    toggleDisabled: (fieldName: string) => void;
    moveField: (from: number, to: number) => void;
}

function useFieldEditorHandlers({
    fields,
    onChange,
    onCommit,
    onRemove,
}: {
    fields: FieldDefinition[];
    onChange: (fields: FieldDefinition[]) => void;
    onCommit: (fields: FieldDefinition[]) => void;
    onRemove: (index: number) => void;
}): FieldEditorHandlers {
    const lastCommittedRef = useRef(fields);

    function change(next: FieldDefinition[], persist: boolean) {
        onChange(next);
        if (!persist) return;
        lastCommittedRef.current = next;
        onCommit(next);
    }

    function withField(
        index: number,
        updates: Partial<FieldDefinition>
    ): FieldDefinition[] {
        const next = [...fields];
        next[index] = { ...next[index], ...updates };
        return next;
    }

    function commitPending() {
        if (fields === lastCommittedRef.current) return;
        lastCommittedRef.current = fields;
        onCommit(fields);
    }

    return {
        editField: (index, updates) => change(withField(index, updates), false),
        commitField: (index, updates) =>
            change(withField(index, updates), true),
        commitPending,
        commitOnEnter: (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            commitPending();
        },
        removeField: onRemove,
        toggleDisabled: (fieldName) =>
            change(
                fields.map((f) =>
                    f.name === fieldName ? { ...f, disabled: !f.disabled } : f
                ),
                true
            ),
        moveField: (from, to) => {
            if (from === to) return;
            const next = [...fields];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            change(next, true);
        },
    };
}

function ProjectFieldsEditor({
    fields,
    onChange,
    onCommit,
    onRemove,
    inheritedNames,
}: {
    fields: FieldDefinition[];
    onChange: (fields: FieldDefinition[]) => void;
    onCommit: (fields: FieldDefinition[]) => void;
    onRemove: (index: number) => void;
    inheritedNames: Set<string>;
}) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const {
        editField,
        commitField,
        commitPending,
        commitOnEnter,
        removeField,
        toggleDisabled,
        moveField,
    } = useFieldEditorHandlers({ fields, onChange, onCommit, onRemove });

    function isInherited(fieldName: string): boolean {
        return inheritedNames.has(fieldName);
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
                        display: 'grid',
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
                                                    commitField(index, {
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
                                                        toggleDisabled(
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
                                                        editField(index, {
                                                            label: e.target
                                                                .value,
                                                        })
                                                    }
                                                    onBlur={commitPending}
                                                    onKeyDown={commitOnEnter}
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
                                                            commitField(index, {
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
                                                        editField(index, {
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
                                                    onBlur={commitPending}
                                                    onKeyDown={commitOnEnter}
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
                                                            editField(index, {
                                                                rangeMin:
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ),
                                                            })
                                                        }
                                                        onBlur={commitPending}
                                                        onKeyDown={
                                                            commitOnEnter
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
                                                            editField(index, {
                                                                rangeMax:
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ),
                                                            })
                                                        }
                                                        onBlur={commitPending}
                                                        onKeyDown={
                                                            commitOnEnter
                                                        }
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Step"
                                                        value={
                                                            field.rangeStep ?? 1
                                                        }
                                                        onChange={(e) =>
                                                            editField(index, {
                                                                rangeStep:
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    ),
                                                            })
                                                        }
                                                        onBlur={commitPending}
                                                        onKeyDown={
                                                            commitOnEnter
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
                                                                        commitField(
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
                                                        commitField(index, {
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
                                                    commitField(index, {
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
    onCommit,
    onRemove,
    inheritedNames,
}: {
    fields: FieldDefinition[];
    onChange: (fields: FieldDefinition[]) => void;
    onCommit: (fields: FieldDefinition[]) => void;
    onRemove: (index: number) => void;
    inheritedNames: Set<string>;
}) {
    const {
        editField,
        commitField,
        commitPending,
        commitOnEnter,
        removeField,
        toggleDisabled,
    } = useFieldEditorHandlers({ fields, onChange, onCommit, onRemove });

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
                                </div>
                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        fontSize: '0.85em',
                                        cursor: 'pointer',
                                        color: f.disabled ? '#e74c3c' : '#aaa',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={!f.disabled}
                                        onChange={() => toggleDisabled(f.name)}
                                    />
                                    Enabled
                                </label>
                            </div>
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
                                        editField(i, { label: e.target.value })
                                    }
                                    onBlur={commitPending}
                                    onKeyDown={commitOnEnter}
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
                                            commitField(i, {
                                                required: e.target.checked,
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
                                        editField(i, {
                                            options: e.target.value
                                                .split(',')
                                                .map((o) => o.trim())
                                                .filter(Boolean),
                                        })
                                    }
                                    onBlur={commitPending}
                                    onKeyDown={commitOnEnter}
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
                                            editField(i, {
                                                rangeMin: Number(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                        onBlur={commitPending}
                                        onKeyDown={commitOnEnter}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={f.rangeMax ?? 100}
                                        onChange={(e) =>
                                            editField(i, {
                                                rangeMax: Number(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                        onBlur={commitPending}
                                        onKeyDown={commitOnEnter}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Step"
                                        value={f.rangeStep ?? 1}
                                        onChange={(e) =>
                                            editField(i, {
                                                rangeStep: Number(
                                                    e.target.value
                                                ),
                                            })
                                        }
                                        onBlur={commitPending}
                                        onKeyDown={commitOnEnter}
                                    />
                                </div>
                            )}
                            <VisibilityEditor
                                fields={fields}
                                currentIndex={i}
                                value={f.visibleWhen}
                                onChange={(v) =>
                                    commitField(i, { visibleWhen: v })
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
