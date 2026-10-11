import {
    useState,
    useEffect,
    useRef,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useRPC } from '../../contexts/RPCContext';
import { TREE_PRESETS, normalizeTreeFields } from '../../templates/tree';
import {
    getSeriesInheritedNames,
    fullMerge,
    emptyLayout,
    WIDTH_BY_TYPE,
    ROW_SPAN_BY_TYPE,
    clampSpan,
    clampRowSpan,
} from '../../templates/mergeFields';
import {
    autoArrangeLayout,
    applyDrop,
    withBandPositions,
    type DropTarget,
    type PlacedField,
} from '../../templates/autoArrange';
import type {
    CompendiumCategory,
    FieldDefinition,
    SeriesTemplate,
    TemplateLayout,
    TemplateSpan,
} from '../../types/index';
import { DEFAULT_TEMPLATE_COLUMNS, LAYOUT_VERSION } from '../../types/index';
import { FieldLayoutGrid } from './layout/FieldLayoutGrid';
import { LayoutToolbar } from './layout/LayoutToolbar';
import TemplateField from './TemplateField';
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

type FieldsByCategory = Partial<Record<CompendiumCategory, FieldDefinition[]>>;

type LayoutsByCategory = Partial<Record<CompendiumCategory, TemplateLayout>>;

function defaultLayouts(): LayoutsByCategory {
    const layout = emptyLayout(DEFAULT_TEMPLATE_COLUMNS);
    return {
        character: layout,
        location: layout,
        organization: layout,
        item: layout,
        lore: layout,
    };
}

// Layout is a nested object, so `===` can never detect changes; reuse the same
// key-sorted serialiser as `fieldsEqual`.
function layoutsEqual(
    a: TemplateLayout | null | undefined,
    b: TemplateLayout | null | undefined
): boolean {
    if (!a || !b) return a === b;
    return stableStringify(a) === stableStringify(b);
}

interface SeriesFields {
    exists: boolean;
    fields: FieldDefinition[];
}

type SeriesByCategory = Partial<Record<CompendiumCategory, SeriesFields>>;

// Recursively serialises a value with object keys sorted, so two structurally
// equal field lists compare equal regardless of property order. `undefined`
// properties drop out, matching what JSON storage keeps.
function stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return `{${entries
            .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

// Whether two field lists would persist to the same rows. Compares every
// stored property, so edits that only touch a condition, option, span, range
// config, category list or tree relations are not mistaken for "no change".
function fieldsEqual(a: FieldDefinition[], b: FieldDefinition[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    return a.every((f, i) => stableStringify(f) === stableStringify(b[i]));
}

// Clears a property that the receiving side owns. `undefined` rather than a
// rest-destructure so the key is dropped on serialisation without leaving an
// unused binding behind.
function withoutKey<T extends object, K extends keyof T>(
    obj: T,
    key: K
): Omit<T, K> {
    return { ...obj, [key]: undefined } as Omit<T, K>;
}

// The series template stores exactly the list it is handed, so the response to an
// upsert only differs from what was sent when a legacy type was normalized on
// read. Comparing the identifying parts is enough to decide whether to adopt it.
function serverMatchesShown(
    stored: FieldDefinition[],
    shown: FieldDefinition[] | null | undefined
): boolean {
    if (!shown) return false;
    if (stored.length !== shown.length) return false;
    return stored.every(
        (f, i) =>
            f.name === shown[i]?.name &&
            f.label === shown[i]?.label &&
            f.type === shown[i]?.type
    );
}

function toSeriesFields(list: SeriesTemplate[] | undefined): SeriesByCategory {
    const map: SeriesByCategory = {};
    for (const st of list ?? [])
        map[st.baseType] = { exists: true, fields: st.customFields ?? [] };
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
    const [series, setSeries] = useState<SeriesByCategory>({});
    const [projectFields, setProjectFields] = useState<FieldsByCategory>({});
    const [layoutsByCategory, setLayoutsByCategory] =
        useState<LayoutsByCategory>(defaultLayouts);
    const [activeCat, setActiveCat] = useState<CompendiumCategory>(
        initialCategory ?? 'character'
    );
    const [loading, setLoading] = useState(true);
    const [savingCount, setSavingCount] = useState(0);
    const [savedRecently, setSavedRecently] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [loadNonce, setLoadNonce] = useState(0);

    const seriesRef = useRef<SeriesByCategory>({});
    const projectFieldsRef = useRef<FieldsByCategory>({});
    // The project payload last written to (or read from) the database, kept
    // separate from `projectFieldsRef` because the live list is mutated by
    // `onChange` before a commit, which would otherwise defeat change detection.
    const savedProjectRef = useRef<FieldsByCategory>({});
    // Layout last persisted per category, used to detect layout changes
    // independently of the field list. The project owns the effective layout,
    // so reordering or resizing here always rewrites the project template.
    const layoutRef = useRef<LayoutsByCategory>(defaultLayouts());
    const savedLayoutRef = useRef<LayoutsByCategory>(defaultLayouts());
    const commitQueueRef = useRef<
        Partial<Record<CompendiumCategory, Promise<void>>>
    >({});
    // Pointed at the latest `commitMerged` each render so the unmount flush can
    // persist pending edits without capturing a stale closure.
    const commitMergedRef = useRef<
        | ((
              cat: CompendiumCategory,
              fields: FieldDefinition[]
          ) => Promise<void>)
        | null
    >(null);
    const notifyRef = useRef(onTemplatesChanged);
    notifyRef.current = onTemplatesChanged;
    const notifyTimerRef = useRef<number | null>(null);
    const savedTimerRef = useRef<number | null>(null);
    const toastTimerRef = useRef<number | null>(null);
    // Debounced layout writes: resizing the right edge fires many span changes
    // in quick succession, so persistence is batched until the drag settles.
    const spanCommitTimerRef = useRef<
        Partial<Record<CompendiumCategory, number>>
    >({});

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

    function setSeriesFields(cat: CompendiumCategory, next: SeriesFields) {
        const map = { ...seriesRef.current, [cat]: next };
        seriesRef.current = map;
        setSeries(map);
    }

    // Column count is project layout, so it rides the same project write as the
    // field list; commitMerged detects the change and persists it even when no
    // field was touched.
    // Layout rides the same project write as the field list; commitMerged
    // detects a change and persists it even when no field was touched.
    function patchLayoutOnly(
        cat: CompendiumCategory,
        patch: Partial<TemplateLayout>
    ) {
        const cur = layoutRef.current[cat] ?? emptyLayout();
        const next = { ...cur, ...patch };
        const map = { ...layoutRef.current, [cat]: next };
        layoutRef.current = map;
        setLayoutsByCategory(map);
    }

    function patchLayout(
        cat: CompendiumCategory,
        patch: Partial<TemplateLayout>
    ) {
        patchLayoutOnly(cat, patch);
        commitMerged(cat, projectFieldsRef.current[cat] ?? []);
    }

    // Resize spans/rows update layout state immediately for live reflow, but the
    // db write is debounced so a single drag composes one save.
    function scheduleLayoutCommit(cat: CompendiumCategory) {
        if (spanCommitTimerRef.current[cat] !== undefined) {
            window.clearTimeout(spanCommitTimerRef.current[cat]);
        }
        spanCommitTimerRef.current[cat] = window.setTimeout(() => {
            spanCommitTimerRef.current[cat] = undefined;
            commitMerged(cat, projectFieldsRef.current[cat] ?? []);
        }, 400);
    }

    function layoutFor(cat: CompendiumCategory): TemplateLayout {
        return layoutsByCategory[cat] ?? emptyLayout();
    }

    function autoArrange(cat: CompendiumCategory) {
        const fields = projectFieldsRef.current[cat] ?? [];
        const current = layoutRef.current[cat] ?? emptyLayout();
        const columns = current.columns ?? DEFAULT_TEMPLATE_COLUMNS;
        const packed = autoArrangeLayout(fields, columns, current);
        patchLayout(cat, {
            order: packed.order,
            spans: packed.spans,
            rowSpans: packed.rowSpans,
            cols: packed.cols,
            rowStarts: packed.rowStarts,
            fullWidth: packed.fullWidth,
            version: LAYOUT_VERSION,
        });
    }

    // Builds the current rectangle of every field, so a drop can be resolved
    // against the live grid. Fields the layout has not placed get packed into
    // the first free cell.
    function placedFields(cat: CompendiumCategory): PlacedField[] {
        const layout = layoutRef.current[cat] ?? emptyLayout();
        const columns = layout.columns ?? DEFAULT_TEMPLATE_COLUMNS;
        const fields = projectFieldsRef.current[cat] ?? [];
        const positioned = withBandPositions(
            fields.map((f) => {
                const fullWidth = layout.fullWidth?.[f.name] === true;
                const span = fullWidth
                    ? columns
                    : (layout.spans?.[f.name] ??
                      clampSpan(WIDTH_BY_TYPE[f.type] ?? 1, columns));
                const rowSpan = clampRowSpan(
                    layout.rowSpans?.[f.name] ?? ROW_SPAN_BY_TYPE[f.type] ?? 1
                );
                return {
                    name: f.name,
                    span,
                    rowSpan,
                    rowStart: layout.rowStarts?.[f.name],
                    colStart: layout.cols?.[f.name],
                };
            }),
            columns
        );
        return positioned.map((p) => ({
            name: p.name,
            row: p.rowStart,
            col: p.colStart,
            span: p.span,
            rowSpan: p.rowSpan,
        }));
    }

    function scheduleNotify() {
        if (notifyTimerRef.current !== null)
            window.clearTimeout(notifyTimerRef.current);
        notifyTimerRef.current = window.setTimeout(() => {
            notifyTimerRef.current = null;
            notifyRef.current();
        }, 350);
    }

    useEffect(
        () => () => {
            // Persist edits still sitting in the live list. Text inputs only
            // commit on blur, which never fires when the dialog/tab unmounts, so
            // flush anything that changed. The commit gate makes this a no-op
            // for categories with nothing new to write.
            const flushed = CATEGORIES.map((cat) =>
                commitMergedRef.current
                    ? commitMergedRef.current(
                          cat,
                          projectFieldsRef.current[cat] ?? []
                      )
                    : Promise.resolve()
            );
            if (notifyTimerRef.current !== null) {
                window.clearTimeout(notifyTimerRef.current);
                notifyTimerRef.current = null;
            }
            // The flush above diffs against the refs, so it already picks up
            // any debounced span edit; just disarm the timers first.
            for (const cat of CATEGORIES) {
                if (spanCommitTimerRef.current[cat] !== undefined) {
                    window.clearTimeout(spanCommitTimerRef.current[cat]);
                    spanCommitTimerRef.current[cat] = undefined;
                }
            }
            Promise.allSettled(flushed).then(() => notifyRef.current());
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

    // The editor shows one merged list, so a single commit can touch both tables.
    // Each row is routed by name: rows owned by the series template go there,
    // everything else goes to the project. Display order no longer lives in the
    // field rows - it is the project layout's `order` list, so moving a field
    // here only rewrites the project layout, never the series template.
    function commitMerged(
        cat: CompendiumCategory,
        fields: FieldDefinition[],
        forceSeriesNames?: Set<string>
    ): Promise<void> {
        return enqueueCommit(cat, async () => {
            const seriesFields = seriesRef.current[cat]?.fields ?? [];
            const inherited = getSeriesInheritedNames(seriesFields);
            // A field being added as a series field is not in the series list
            // yet, so name-collision routing would send it to the project. Mark
            // it once so this first write lands in the series template.
            if (forceSeriesNames)
                for (const name of forceSeriesNames) inherited.add(name);
            const seriesByName = new Map(
                seriesFields.map((f) => [f.name, f] as const)
            );

            // --- series payload ---
            const nextSeries = fields
                .filter((f) => inherited.has(f.name))
                .map((f) => {
                    // A row this project has disabled still belongs to the
                    // series, so take its definition from the series row. Using
                    // the merged view here would drop the field for everyone.
                    const base = f.disabled
                        ? (seriesByName.get(f.name) ?? f)
                        : f;
                    // `disabled` is the project's to set, never the series'.
                    return withoutKey(base, 'disabled');
                })
                // Guarded on `name` alone. `name` is read-only in the editor, so
                // it cannot go blank; `label` can, and dropping a row for having
                // an empty label would quietly delete that field for every other
                // project in the series.
                .filter((f) => f.name.trim());

            // --- project payload ---
            const projectPayload = (
                merged: FieldDefinition[]
            ): FieldDefinition[] =>
                merged
                    .filter((f) => !inherited.has(f.name) || f.disabled)
                    .filter((f) => f.name.trim() && f.label.trim())
                    .map((f) => f);
            const nextProject = projectPayload(fields);

            // Materialise the order locally so the list keeps rendering exactly
            // what was just committed, including text still mid-edit. Display
            // order now belongs to the layout, so the array itself is unchanged
            // - this only syncs the live list when an edit landed.
            const mergedNow = projectFieldsRef.current[cat] ?? [];
            if (!fieldsEqual(mergedNow, fields))
                setProjectFieldsFor(cat, fields);

            const seriesChanged =
                !!seriesId && !fieldsEqual(seriesFields, nextSeries);
            // Compare against the last *persisted* payload, not the live list:
            // `onChange` has already folded these edits into `projectFieldsRef`,
            // so comparing against it would always look unchanged.
            const layoutChanged = !layoutsEqual(
                savedLayoutRef.current[cat],
                layoutRef.current[cat]
            );
            const projectChanged =
                layoutChanged ||
                !fieldsEqual(savedProjectRef.current[cat] ?? [], nextProject);

            if (seriesChanged) {
                if (nextSeries.length === 0) {
                    // Removing the last shared field deletes the row rather than
                    // upserting an empty one.
                    await rpc.request['db:delete-series-template']({
                        seriesId,
                        baseType: cat,
                    });
                    setSeriesFields(cat, { exists: false, fields: [] });
                } else {
                    const saved = await rpc.request[
                        'db:upsert-series-template'
                    ]({
                        seriesId,
                        baseType: cat,
                        customFields: nextSeries,
                    });
                    const stored = normalizeTreeFields(
                        saved?.customFields ?? nextSeries
                    );
                    setSeriesFields(cat, {
                        exists: true,
                        fields: serverMatchesShown(stored, nextSeries)
                            ? nextSeries
                            : stored,
                    });
                }
            }

            if (projectChanged) {
                const layout = layoutRef.current[cat] ?? emptyLayout();
                await rpc.request['db:save-template']({
                    projectId,
                    baseType: cat,
                    customFields: nextProject,
                    layout,
                });
                savedProjectRef.current = {
                    ...savedProjectRef.current,
                    [cat]: nextProject,
                };
                savedLayoutRef.current = {
                    ...savedLayoutRef.current,
                    [cat]: layout,
                };
            }
        });
    }
    commitMergedRef.current = commitMerged;
    async function load() {
        if (!projectId) return;
        setLoading(true);
        try {
            const seriesRes = seriesId
                ? await rpc.request['db:list-series-templates']({ seriesId })
                : ([] as SeriesTemplate[]);
            const nextSeries = toSeriesFields(
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

            const nextProject: FieldsByCategory = {};
            const nextSavedProject: FieldsByCategory = {};
            const nextLayouts = defaultLayouts();
            // The layout exactly as loaded (before any version migration), kept
            // as the diff baseline so a migrated layout is written back once.
            const nextSavedLayouts: LayoutsByCategory = defaultLayouts();
            CATEGORIES.forEach((cat, i) => {
                const stored = results[i]?.projectTemplate?.customFields || [];
                nextProject[cat] = fullMerge(
                    stored,
                    nextSeries[cat]?.fields ?? null
                );
                // The raw stored payload, not the merged view, is what a later
                // commit must diff against to know whether anything changed.
                nextSavedProject[cat] = stored;
                // `results[i].layout` is already the effective
                // (project-authoritative) layout, which is exactly what the
                // editor should show and own from here on.
                const rawLayout: TemplateLayout = {
                    ...emptyLayout(
                        results[i]?.columns ?? DEFAULT_TEMPLATE_COLUMNS
                    ),
                    ...(results[i]?.layout ?? null),
                };
                nextSavedLayouts[cat] = rawLayout;
                // A layout saved under an older model carries stale positions
                // (row indices that meant pixel rows), so re-pack it once under
                // the band model and stamp the new version.
                nextLayouts[cat] =
                    rawLayout.version === LAYOUT_VERSION
                        ? rawLayout
                        : autoArrangeLayout(
                              nextProject[cat] ?? [],
                              rawLayout.columns ?? DEFAULT_TEMPLATE_COLUMNS,
                              rawLayout
                          );
            });

            seriesRef.current = nextSeries;
            projectFieldsRef.current = nextProject;
            savedProjectRef.current = nextSavedProject;
            layoutRef.current = nextLayouts;
            savedLayoutRef.current = nextSavedLayouts;
            setSeries(nextSeries);
            setProjectFields(nextProject);
            setLayoutsByCategory(nextLayouts);
            setLoadNonce((n) => n + 1);
        } catch (e) {
            console.error('Failed to load templates:', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [projectId, seriesId]);

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

    // Trash is routed by ownership. An inherited row is shared with every project in
    // the series, so deleting one is confirmed and worded accordingly; a project
    // row is this project's business alone. Both are undoable from the toast.
    function removeField(cat: CompendiumCategory, index: number) {
        const merged = projectFieldsRef.current[cat] ?? [];
        const removed = merged[index];
        if (!removed) return;

        const seriesEntry = seriesRef.current[cat];
        const isInherited = getSeriesInheritedNames(
            seriesEntry?.fields ?? null
        ).has(removed.name);
        const label = removed.label || removed.name;

        if (
            isInherited &&
            !confirm(
                `"${label}" is shared with every project in this series. Delete it for all of them?`
            )
        )
            return;

        // `disabled` belongs to this project, not the series.
        const definition = withoutKey(removed, 'disabled');

        const next = merged.filter((_, i) => i !== index);
        setProjectFieldsFor(cat, next);
        // The series list is deliberately left alone here: commitMerged derives
        // the series payload from the merged list, so clearing it up front would
        // make the deletion look already-applied and skip the write. The undo
        // below puts the definition back before re-committing, which is what
        // restores ownership.
        commitMerged(cat, next);

        showToast(
            `Removed "${label}"${isInherited ? ' from the series' : ''}`,
            () => {
                const cur = projectFieldsRef.current[cat] ?? [];
                if (cur.some((f) => f.name === removed.name)) return;
                if (isInherited) {
                    const curSeries = seriesRef.current[cat];
                    if (curSeries) {
                        setSeriesFields(cat, {
                            exists: curSeries.exists,
                            fields: [...curSeries.fields, definition],
                        });
                    }
                }
                const restored = [
                    ...cur.slice(0, index),
                    removed,
                    ...cur.slice(index),
                ];
                setProjectFieldsFor(cat, restored);
                commitMerged(cat, restored);
            }
        );
    }

    async function removeAllSeriesFields(cat: CompendiumCategory) {
        if (!seriesId) return;
        const seriesEntry = seriesRef.current[cat];
        const owned = seriesEntry?.fields ?? [];
        if (!owned.length) return;

        if (
            !confirm(
                `Delete all ${owned.length} shared ${categoryLabels[cat].toLowerCase()} field${
                    owned.length === 1 ? '' : 's'
                }? This affects every project in the series.`
            )
        )
            return;

        const inherited = getSeriesInheritedNames(owned);
        const next = (projectFieldsRef.current[cat] ?? []).filter(
            (f) => !inherited.has(f.name)
        );
        // As in removeField: leave the series list intact so commitMerged can see
        // that the shared fields are gone and actually issue the delete.
        setProjectFieldsFor(cat, next);
        await commitMerged(cat, next);
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

        if (addTarget === 'series' && !seriesId) return;

        // Ownership is keyed by field name, so a second field with the same
        // name cannot be represented. The merged list covers both scopes; the
        // series check only picks the wording.
        const merged = projectFieldsRef.current[cat] ?? [];
        const existing = merged.find((f) => f.name === field.name);
        if (existing) {
            const inSeries = getSeriesInheritedNames(
                seriesRef.current[cat]?.fields ?? null
            ).has(field.name);
            showToast(
                inSeries
                    ? `"${existing.label || existing.name}" is already a series field.`
                    : `"${existing.label || existing.name}" already exists in this project.`
            );
            return;
        }

        setAddingField(true);
        try {
            // Appending is the only time a field's order is chosen rather than
            // inherited, so it goes to the end of the merged list.
            const next = [...merged, field];
            setProjectFieldsFor(cat, next);
            // Give the new field an explicit, type-appropriate width and drop it
            // straight into a fresh band at the bottom, so it has a real cell
            // from the moment it appears.
            const columns =
                layoutRef.current[cat]?.columns ?? DEFAULT_TEMPLATE_COLUMNS;
            const curLayout = layoutRef.current[cat] ?? emptyLayout();
            const maxRowEnd = Object.keys(curLayout.rowStarts ?? {}).reduce(
                (m, name) =>
                    Math.max(
                        m,
                        (curLayout.rowStarts[name] ?? 1) +
                            (curLayout.rowSpans?.[name] ??
                                ROW_SPAN_BY_TYPE[
                                    merged.find((f) => f.name === name)?.type ??
                                        'text'
                                ] ??
                                1) -
                            1
                    ),
                0
            );
            patchLayoutOnly(cat, {
                spans: {
                    ...(curLayout.spans ?? {}),
                    [field.name]: clampSpan(
                        WIDTH_BY_TYPE[field.type] ?? 1,
                        columns
                    ),
                },
                rowSpans: {
                    ...(curLayout.rowSpans ?? {}),
                    [field.name]: clampRowSpan(
                        ROW_SPAN_BY_TYPE[field.type] ?? 1
                    ),
                },
                rowStarts: {
                    ...(curLayout.rowStarts ?? {}),
                    [field.name]: maxRowEnd + 1,
                },
                cols: { ...(curLayout.cols ?? {}), [field.name]: 1 },
                version: LAYOUT_VERSION,
            });
            await commitMerged(
                cat,
                next,
                addTarget === 'series' ? new Set([field.name]) : undefined
            );
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
        const s = series[cat]?.fields.length || 0;
        const inherited = getSeriesInheritedNames(series[cat]?.fields ?? null);
        const merged = projectFields[cat] ?? [];
        const p = merged.filter((f) => !inherited.has(f.name)).length;
        return `${s} series · ${p} project`;
    }

    function renderFields(cat: CompendiumCategory) {
        const fields = projectFields[cat] ?? [];
        const inherited = getSeriesInheritedNames(series[cat]?.fields ?? null);
        const sharedCount = series[cat]?.fields.length ?? 0;
        const layout = layoutFor(cat);
        const columns = layout.columns ?? DEFAULT_TEMPLATE_COLUMNS;

        return (
            <div>
                <p
                    style={{
                        fontSize: '0.85em',
                        color: '#888',
                        margin: '0 0 0.5rem 0',
                    }}
                >
                    The effective template for this project. Rows marked{' '}
                    <strong style={{ color: '#FFA500' }}>INHERITED</strong> come
                    from the series and are edited once for every project in it;
                    turning one off here only affects this project. Changes save
                    automatically.
                </p>
                <div style={{ margin: '0 0 0.75rem 0' }}>
                    <LayoutToolbar
                        columns={columns}
                        onColumns={(n) => {
                            const current =
                                layoutRef.current[cat] ?? emptyLayout();
                            const packed = autoArrangeLayout(
                                projectFieldsRef.current[cat] ?? [],
                                n,
                                current
                            );
                            patchLayout(cat, {
                                columns: n,
                                order: packed.order,
                                spans: packed.spans,
                                rowSpans: packed.rowSpans,
                                cols: packed.cols,
                                rowStarts: packed.rowStarts,
                                fullWidth: packed.fullWidth,
                                version: LAYOUT_VERSION,
                            });
                        }}
                        onAutoArrange={() => autoArrange(cat)}
                    />
                </div>
                <ProjectFieldsEditor
                    key={`merged:${cat}:${loadNonce}`}
                    fields={fields}
                    layout={layout}
                    columns={columns}
                    onChange={(next) => setProjectFieldsFor(cat, next)}
                    onCommit={(next) => commitMerged(cat, next)}
                    onSpanChange={(name, span) => {
                        const cur = layoutRef.current[cat] ?? emptyLayout();
                        // Dragging the width of a full-width field drops its
                        // full-width status, otherwise the flag would keep it at
                        // 100% and the drag would look dead.
                        const fullWidth = { ...(cur.fullWidth ?? {}) };
                        delete fullWidth[name];
                        patchLayoutOnly(cat, {
                            spans: {
                                ...(cur.spans ?? {}),
                                [name]: span,
                            },
                            fullWidth,
                        });
                        scheduleLayoutCommit(cat);
                    }}
                    onRowSpanChange={(name, rowSpan) => {
                        patchLayoutOnly(cat, {
                            rowSpans: {
                                ...(layoutRef.current[cat]?.rowSpans ?? {}),
                                [name]: rowSpan,
                            },
                        });
                        scheduleLayoutCommit(cat);
                    }}
                    onFullWidthChange={(name, on) => {
                        const fullWidth = {
                            ...(layoutRef.current[cat]?.fullWidth ?? {}),
                        };
                        if (on) fullWidth[name] = true;
                        else delete fullWidth[name];
                        patchLayoutOnly(cat, { fullWidth });
                        scheduleLayoutCommit(cat);
                    }}
                    onColChange={(name, col) => {
                        const cols = {
                            ...(layoutRef.current[cat]?.cols ?? {}),
                        };
                        if (col == null) delete cols[name];
                        else cols[name] = col;
                        patchLayoutOnly(cat, { cols });
                        scheduleLayoutCommit(cat);
                    }}
                    onMove={(name, target) => {
                        const result = applyDrop(
                            placedFields(cat),
                            name,
                            target,
                            layoutRef.current[cat]?.columns ??
                                DEFAULT_TEMPLATE_COLUMNS
                        );
                        patchLayoutOnly(cat, {
                            rowStarts: result.rowStarts,
                            cols: result.cols,
                            rowSpans: result.rowSpans,
                            version: LAYOUT_VERSION,
                        });
                        scheduleLayoutCommit(cat);
                    }}
                    onRemove={(index) => removeField(cat, index)}
                    inheritedNames={inherited}
                />
                {sharedCount > 0 && (
                    <button
                        type="button"
                        className="danger"
                        onClick={() => removeAllSeriesFields(cat)}
                        style={{ color: '#e74c3c', marginTop: '0.5rem' }}
                    >
                        Delete {sharedCount} shared{' '}
                        {categoryLabels[cat].toLowerCase()} field
                        {sharedCount === 1 ? '' : 's'}
                    </button>
                )}
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

                    <div className={styles.fieldsContent}>
                        {renderFields(activeCat)}
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
    layout,
    columns,
    onChange,
    onCommit,
    onSpanChange,
    onRowSpanChange,
    onFullWidthChange,
    onColChange,
    onMove,
    onRemove,
    inheritedNames,
}: {
    fields: FieldDefinition[];
    layout: TemplateLayout;
    columns: number;
    onChange: (fields: FieldDefinition[]) => void;
    onCommit: (fields: FieldDefinition[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowSpanChange: (name: string, rowSpan: number) => void;
    onFullWidthChange: (name: string, on: boolean) => void;
    onColChange: (name: string, col: number | null) => void;
    onMove: (name: string, target: DropTarget) => void;
    onRemove: (index: number) => void;
    inheritedNames: Set<string>;
}) {
    const {
        editField,
        commitField,
        commitPending,
        commitOnEnter,
        removeField,
    } = useFieldEditorHandlers({ fields, onChange, onCommit, onRemove });

    if (fields.length === 0) {
        return (
            <div style={{ color: '#888', fontSize: '0.85em' }}>
                No fields defined.
            </div>
        );
    }

    return (
        <FieldLayoutGrid
            fields={fields}
            layout={layout}
            columns={columns}
            interactive
            onMove={onMove}
            onSpanChange={onSpanChange}
            onRowSpanChange={onRowSpanChange}
            renderItem={(field, index, dragHandleProps) => (
                <TemplateField
                    mode="edit"
                    field={field}
                    index={index}
                    fields={fields}
                    columns={columns}
                    inherited={inheritedNames.has(field.name)}
                    editField={editField}
                    commitField={commitField}
                    commitPending={commitPending}
                    commitOnEnter={commitOnEnter}
                    onRemove={removeField}
                    onToggleFullWidth={onFullWidthChange}
                    onColumnChange={onColChange}
                    dragHandleProps={dragHandleProps}
                />
            )}
        />
    );
}
