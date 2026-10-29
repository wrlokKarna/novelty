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
    compactLayout,
    withBandPositions,
    type DropTarget,
    type PlacedField,
} from '../../templates/autoArrange';

import { DEFAULT_TEMPLATE_COLUMNS, LAYOUT_VERSION } from '../../types/index';
import { FieldLayoutGrid } from './layout/FieldLayoutGrid';
import { LayoutMatrix } from './layout/LayoutMatrix';
import { LayoutToolbar } from './layout/LayoutToolbar';
import TemplateField from './TemplateField';
import styles from './TemplateManagerTab.module.css';
import type { CompendiumCategory } from '../../../shared/types/project/compendium';
import type {
    FieldDefinition,
    TemplateLayout,
    TemplateSpan,
} from '../../../shared/types/project/templates';
import type { SeriesTemplate } from '../../../shared/types/series';

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
    const [activeField, setActiveField] = useState<string | null>(null);

    const seriesRef = useRef<SeriesByCategory>({});
    const projectFieldsRef = useRef<FieldsByCategory>({});

    const savedProjectRef = useRef<FieldsByCategory>({});

    const layoutRef = useRef<LayoutsByCategory>(defaultLayouts());
    const savedLayoutRef = useRef<LayoutsByCategory>(defaultLayouts());
    const commitQueueRef = useRef<
        Partial<Record<CompendiumCategory, Promise<void>>>
    >({});

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

    const spanCommitTimerRef = useRef<
        Partial<Record<CompendiumCategory, number>>
    >({});

    const [showAddCard, setShowAddCard] = useState(false);
    const [addTarget, setAddTarget] = useState<AddTarget>('project');
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] =
        useState<FieldDefinition['type']>('text');
    const [addingField, setAddingField] = useState(false);
    const newFieldNameRef = useRef<HTMLInputElement | null>(null);

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

    function compactLayoutFor(
        cat: CompendiumCategory,
        fields: FieldDefinition[]
    ) {
        const cur = layoutRef.current[cat] ?? emptyLayout();
        patchLayoutOnly(cat, compactLayout(fields, cur));
    }

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
    function layoutCells(cat: CompendiumCategory): {
        cells: Map<string, string>;
        rowCount: number;
    } {
        const cells = new Map<string, string>();
        let rowCount = 0;
        for (const p of placedFields(cat)) {
            const span = Math.max(1, Math.round(p.span));
            const rowSpan = Math.max(1, Math.round(p.rowSpan));
            for (let r = p.row; r < p.row + rowSpan; r++)
                for (let c = p.col; c < p.col + span; c++)
                    cells.set(`${r},${c}`, p.name);
            rowCount = Math.max(rowCount, p.row + rowSpan - 1);
        }
        return { cells, rowCount };
    }

    function scrollToField(name: string) {
        const el = document.querySelector(`[data-field="${CSS.escape(name)}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    function commitMerged(
        cat: CompendiumCategory,
        fields: FieldDefinition[],
        forceSeriesNames?: Set<string>
    ): Promise<void> {
        return enqueueCommit(cat, async () => {
            const seriesFields = seriesRef.current[cat]?.fields ?? [];
            const inherited = getSeriesInheritedNames(seriesFields);

            if (forceSeriesNames)
                for (const name of forceSeriesNames) inherited.add(name);
            const seriesByName = new Map(
                seriesFields.map((f) => [f.name, f] as const)
            );

            const nextSeries = fields
                .filter((f) => inherited.has(f.name))
                .map((f) => {
                    const base = f.disabled
                        ? (seriesByName.get(f.name) ?? f)
                        : f;
                    return withoutKey(base, 'disabled');
                })
                .filter((f) => f.name.trim());

            const projectPayload = (
                merged: FieldDefinition[]
            ): FieldDefinition[] =>
                merged
                    .filter((f) => !inherited.has(f.name) || f.disabled)
                    .filter((f) => f.name.trim() && f.label.trim())
                    .map((f) => f);
            const nextProject = projectPayload(fields);
            const mergedNow = projectFieldsRef.current[cat] ?? [];
            if (!fieldsEqual(mergedNow, fields))
                setProjectFieldsFor(cat, fields);

            const seriesChanged =
                !!seriesId && !fieldsEqual(seriesFields, nextSeries);
            const layoutChanged = !layoutsEqual(
                savedLayoutRef.current[cat],
                layoutRef.current[cat]
            );
            const projectChanged =
                layoutChanged ||
                !fieldsEqual(savedProjectRef.current[cat] ?? [], nextProject);

            if (seriesChanged) {
                if (nextSeries.length === 0) {
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
            const nextSavedLayouts: LayoutsByCategory = defaultLayouts();
            CATEGORIES.forEach((cat, i) => {
                const stored = results[i]?.projectTemplate?.customFields || [];
                nextProject[cat] = fullMerge(
                    stored,
                    nextSeries[cat]?.fields ?? null
                );
                nextSavedProject[cat] = stored;
                const rawLayout: TemplateLayout = {
                    ...emptyLayout(
                        results[i]?.columns ?? DEFAULT_TEMPLATE_COLUMNS
                    ),
                    ...(results[i]?.layout ?? null),
                };
                nextSavedLayouts[cat] = rawLayout;
                nextLayouts[cat] = compactLayout(
                    nextProject[cat] ?? [],
                    rawLayout.version === LAYOUT_VERSION
                        ? rawLayout
                        : autoArrangeLayout(
                              nextProject[cat] ?? [],
                              rawLayout.columns ?? DEFAULT_TEMPLATE_COLUMNS,
                              rawLayout
                          )
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

        const definition = withoutKey(removed, 'disabled');

        const next = merged.filter((_, i) => i !== index);
        setProjectFieldsFor(cat, next);
        compactLayoutFor(cat, next);
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
        setProjectFieldsFor(cat, next);
        compactLayoutFor(cat, next);
        await commitMerged(cat, next);
    }

    function toggleAddCard() {
        const next = !showAddCard;
        setShowAddCard(next);
        if (!next) return;
        setAddTarget('project');
        setNewFieldName('');
        setNewFieldType('text');
        requestAnimationFrame(() => newFieldNameRef.current?.focus());
    }

    function canSubmitField() {
        if (!newFieldName.trim() || addingField) return false;
        if (addTarget === 'series' && !seriesId) return false;
        return true;
    }

    function resetAddCard() {
        setNewFieldName('');
        requestAnimationFrame(() => newFieldNameRef.current?.focus());
    }

    async function handleAddFieldSubmit() {
        const cat = activeCat;
        if (!newFieldName.trim()) return;
        const field = buildFieldDefinition(newFieldName.trim(), newFieldType);

        if (addTarget === 'series' && !seriesId) return;

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
            const next = [...merged, field];
            setProjectFieldsFor(cat, next);
            const curLayout = layoutRef.current[cat] ?? emptyLayout();
            const columns = curLayout.columns ?? DEFAULT_TEMPLATE_COLUMNS;
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
            const withNewField: TemplateLayout = {
                ...curLayout,
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
            };
            patchLayoutOnly(cat, compactLayout(next, withNewField));
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
        const { cells, rowCount } = layoutCells(cat);

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
                        matrix={
                            <LayoutMatrix
                                columns={columns}
                                rowCount={rowCount}
                                cells={cells}
                                activeField={activeField}
                                onHoverField={setActiveField}
                                onPickField={(name) => {
                                    setActiveField(name);
                                    scrollToField(name);
                                }}
                            />
                        }
                    />
                </div>
                <ProjectFieldsEditor
                    key={`merged:${cat}:${loadNonce}`}
                    fields={fields}
                    layout={layout}
                    columns={columns}
                    activeField={activeField}
                    onHoverField={setActiveField}
                    onChange={(next) => setProjectFieldsFor(cat, next)}
                    onCommit={(next) => commitMerged(cat, next)}
                    onSpanChange={(name, span) => {
                        const cur = layoutRef.current[cat] ?? emptyLayout();
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
                    onMove={(name, target) => {
                        const result = applyDrop(
                            placedFields(cat),
                            name,
                            target,
                            layoutRef.current[cat]?.columns ??
                                DEFAULT_TEMPLATE_COLUMNS
                        );
                        const dropped: TemplateLayout = {
                            ...(layoutRef.current[cat] ?? emptyLayout()),
                            rowStarts: result.rowStarts,
                            cols: result.cols,
                            rowSpans: result.rowSpans,
                            columns: result.columns,
                            version: LAYOUT_VERSION,
                        };
                        patchLayoutOnly(
                            cat,
                            compactLayout(
                                projectFieldsRef.current[cat] ?? [],
                                dropped
                            )
                        );
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
        setShowAddCard(false);
        setActiveField(null);
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
                        <div className={styles.headerActions}>
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
                    </div>

                    {showAddCard && (
                        <div className={styles.addField}>
                            {seriesId && (
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
                                        title="Shared across every project in this series"
                                    >
                                        Series field
                                    </button>
                                </div>
                            )}
                            <div>
                                <label className={styles.addFieldLabel}>
                                    Field name
                                </label>
                                <input
                                    ref={newFieldNameRef}
                                    className={styles.addFieldInput}
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
                                    This project is not assigned to a series, so
                                    only project fields can be added.
                                </span>
                            )}
                            <div className={styles.addCardFooter}>
                                <span>Saved automatically.</span>
                                <button
                                    type="button"
                                    className={styles.addCardSubmit}
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
        <div className={styles.fieldTypeGroups}>
            {FIELD_TYPE_GROUPS.map((group) => (
                <div key={group.label} className={styles.fieldTypeGroup}>
                    <div className={styles.fieldTypeGroupLabel}>
                        {group.label}
                    </div>
                    <div className={styles.fieldTypePills}>
                        {group.types.map(({ type, label }) => {
                            const selected = value === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => onChange(type)}
                                    className={`${styles.fieldTypePill} ${
                                        selected
                                            ? styles.fieldTypePillSelected
                                            : ''
                                    }`}
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
    activeField,
    onHoverField,
    onChange,
    onCommit,
    onSpanChange,
    onRowSpanChange,
    onMove,
    onRemove,
    inheritedNames,
}: {
    fields: FieldDefinition[];
    layout: TemplateLayout;
    columns: number;
    activeField: string | null;
    onHoverField: (name: string | null) => void;
    onChange: (fields: FieldDefinition[]) => void;
    onCommit: (fields: FieldDefinition[]) => void;
    onSpanChange: (name: string, span: TemplateSpan) => void;
    onRowSpanChange: (name: string, rowSpan: number) => void;
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
            activeField={activeField}
            onHoverField={onHoverField}
            onMove={onMove}
            onSpanChange={onSpanChange}
            onRowSpanChange={onRowSpanChange}
            renderItem={(field, index, dragHandleProps) => (
                <TemplateField
                    mode="edit"
                    field={field}
                    index={index}
                    fields={fields}
                    inherited={inheritedNames.has(field.name)}
                    editField={editField}
                    commitField={commitField}
                    commitPending={commitPending}
                    commitOnEnter={commitOnEnter}
                    onRemove={removeField}
                    dragHandleProps={dragHandleProps}
                />
            )}
        />
    );
}
