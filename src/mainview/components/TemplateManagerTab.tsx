import { useState, useEffect, type ReactNode } from 'react';
import { useRPC } from '../contexts/RPCContext';
import VisibilityEditor from './VisibilityEditor';
import TreeRelationsEditor from './TreeRelationsEditor';
import { describeVisibility } from '../templates/fieldVisibility';
import { TREE_PRESETS } from '../templates/tree';
import {
    getInheritedNames,
    getSeriesInheritedNames,
    mergeGlobalFields,
    fullMerge,
} from '../templates/mergeFields';
import type {
    CompendiumCategory,
    FieldDefinition,
    GlobalTemplate,
    SeriesTemplate,
    NewGlobalTemplate,
    NewSeriesTemplate,
} from '../types/index';
import { IconTrash } from '@tabler/icons-react';

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
    refGlobalId: string | null;
    fields: FieldDefinition[];
}

interface GlobalEditorState {
    id: string | null;
    name: string;
    description: string;
    fields: FieldDefinition[];
}

interface CategoryDraft {
    globalTemplateId: string | null;
    seriesTemplateId: string | null;
    projectFields: FieldDefinition[];
    seriesEditor: SeriesEditorState | null;
    globalEditor: GlobalEditorState | null;
    seriesDeletes: string[];
    dirty: boolean;
}

export default function TemplateManagerTab({
    projectId,
    seriesId,
    onTemplatesChanged,
    initialCategory,
}: TemplateManagerTabProps) {
    const rpc = useRPC();
    const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>(
        []
    );
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
            const [globals, seriesRes] = await Promise.all([
                rpc.request['db:list-global-templates'](),
                seriesId
                    ? rpc.request['db:list-series-templates']({ seriesId })
                    : (Promise.resolve([]) as Promise<SeriesTemplate[]>),
            ]);
            const gl = Array.isArray(globals) ? globals : [];
            const sl = Array.isArray(seriesRes) ? seriesRes : [];
            setGlobalTemplates(gl);
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
                const globalId =
                    info?.projectTemplate?.globalTemplateId ?? null;
                const seriesIdApplied =
                    info?.projectTemplate?.seriesTemplateId ?? null;
                next[cat] = {
                    globalTemplateId: globalId,
                    seriesTemplateId: seriesIdApplied,
                    projectFields: fullMerge(
                        info?.projectTemplate?.customFields || [],
                        globalId,
                        gl,
                        seriesIdApplied,
                        sl
                    ),
                    seriesEditor: null,
                    globalEditor: null,
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
        const [globals, seriesRes, info] = await Promise.all([
            rpc.request['db:list-global-templates'](),
            seriesId
                ? rpc.request['db:list-series-templates']({ seriesId })
                : (Promise.resolve([]) as Promise<SeriesTemplate[]>),
            rpc.request['db:get-resolved-template']({
                projectId,
                baseType: cat,
            }),
        ]);
        const gl = Array.isArray(globals) ? globals : [];
        const sl = Array.isArray(seriesRes) ? seriesRes : [];
        setGlobalTemplates(gl);
        setSeriesTemplates(sl);
        const globalId = info?.projectTemplate?.globalTemplateId ?? null;
        const seriesIdApplied = info?.projectTemplate?.seriesTemplateId ?? null;
        setDrafts((prev) => ({
            ...prev,
            [cat]: {
                globalTemplateId: globalId,
                seriesTemplateId: seriesIdApplied,
                projectFields: fullMerge(
                    info?.projectTemplate?.customFields || [],
                    globalId,
                    gl,
                    seriesIdApplied,
                    sl
                ),
                seriesEditor: null,
                globalEditor: null,
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
        section: 'global' | 'series' | 'project'
    ) {
        return !!collapsedSections[`${cat}:${section}`];
    }

    function toggleSection(
        cat: CompendiumCategory,
        section: 'global' | 'series' | 'project'
    ) {
        setCollapsedSections((prev) => ({
            ...prev,
            [`${cat}:${section}`]: !prev[`${cat}:${section}`],
        }));
    }

    function handleGlobalChange(cat: CompendiumCategory, newId: string) {
        const id = newId || null;
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            const oldInherited = getInheritedNames(
                d.globalTemplateId,
                globalTemplates
            );
            const cleaned = d.projectFields.filter(
                (f) => !oldInherited.has(f.name)
            );
            return {
                ...prev,
                [cat]: {
                    ...d,
                    globalTemplateId: id,
                    projectFields: fullMerge(
                        cleaned,
                        id,
                        globalTemplates,
                        d.seriesTemplateId,
                        seriesTemplates
                    ),
                    dirty: true,
                },
            };
        });
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
                    projectFields: fullMerge(
                        cleaned,
                        d.globalTemplateId,
                        globalTemplates,
                        id,
                        seriesTemplates
                    ),
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
                refGlobalId: null,
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
                refGlobalId: null,
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

    function handleSeriesEditorRefGlobal(
        cat: CompendiumCategory,
        newId: string
    ) {
        const id = newId || null;
        setDrafts((prev) => {
            const d = prev[cat];
            const se = d?.seriesEditor;
            if (!se) return prev;
            const oldInherited = getInheritedNames(
                se.refGlobalId,
                globalTemplates
            );
            const cleaned = se.fields.filter((f) => !oldInherited.has(f.name));
            return {
                ...prev,
                [cat]: {
                    ...d,
                    seriesEditor: {
                        ...se,
                        refGlobalId: id,
                        fields: mergeGlobalFields(cleaned, id, globalTemplates),
                    },
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
                projectFields = fullMerge(
                    cleaned,
                    d.globalTemplateId,
                    globalTemplates,
                    null,
                    seriesTemplates
                );
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

    function openGlobalCreate(cat: CompendiumCategory) {
        updateDraft(cat, {
            globalEditor: { id: null, name: '', description: '', fields: [] },
        });
    }

    function openGlobalEdit(cat: CompendiumCategory, tpl: GlobalTemplate) {
        updateDraft(cat, {
            globalEditor: {
                id: tpl.id,
                name: tpl.name,
                description: tpl.description || '',
                fields: tpl.customFields || [],
            },
        });
    }
    /*
    function handleCreateTemplate(
        type: 'global' | 'series',
        cat: CompendiumCategory
    ) {
        if (type === 'global') {
            openGlobalCreate(cat);
        } else {
            openSeriesCreate(cat);
        }
    }
    */

    function cancelGlobalEditor(cat: CompendiumCategory) {
        updateDraft(cat, { globalEditor: null });
    }

    function updateGlobalEditor(
        cat: CompendiumCategory,
        patch: Partial<GlobalEditorState>
    ) {
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d?.globalEditor) return prev;
            return {
                ...prev,
                [cat]: {
                    ...d,
                    globalEditor: { ...d.globalEditor, ...patch },
                    dirty: true,
                },
            };
        });
    }

    async function saveGlobalEditor(cat: CompendiumCategory) {
        const d = drafts[cat];
        const ge = d?.globalEditor;
        if (!ge) return;
        try {
            const savable = ge.fields.filter(
                (f) => f.name.trim() && f.label.trim()
            );
            if (ge.id) {
                await rpc.request['db:update-global-template']({
                    id: ge.id,
                    data: {
                        name: ge.name.trim(),
                        description: ge.description.trim() || null,
                        baseType: cat,
                        customFields: savable,
                    },
                });
            } else if (ge.name.trim()) {
                const data: NewGlobalTemplate = {
                    id: crypto.randomUUID(),
                    name: ge.name.trim(),
                    description: ge.description.trim() || null,
                    baseType: cat,
                    customFields: savable,
                };
                await rpc.request['db:create-global-template'](data);
            }
            await refreshGlobals(cat, null);
        } catch (e) {
            console.error('Failed to save global template:', e);
        }
    }

    async function handleDeleteGlobal(cat: CompendiumCategory, id: string) {
        const d = drafts[cat];
        if (!d) return;
        if (
            !confirm(
                `Delete this global template? Projects using it will lose the inherited fields.`
            )
        )
            return;
        try {
            await rpc.request['db:delete-global-template'](id);
            await refreshGlobals(cat, id);
        } catch (e) {
            console.error('Failed to delete global template:', e);
        }
    }

    async function refreshGlobals(
        cat: CompendiumCategory,
        deletedGlobalId: string | null
    ) {
        const res = await rpc.request['db:list-global-templates']();
        const gl = Array.isArray(res) ? res : [];
        setGlobalTemplates(gl);
        setDrafts((prev) => {
            const d = prev[cat];
            if (!d) return prev;
            const appliedDeleted =
                deletedGlobalId !== null &&
                d.globalTemplateId === deletedGlobalId;
            let globalTemplateId = d.globalTemplateId;
            let projectFields = d.projectFields;
            if (appliedDeleted) {
                const deleted = globalTemplates.find(
                    (g) => g.id === deletedGlobalId
                );
                const removedNames = new Set(
                    (deleted?.customFields || []).map((f) => f.name)
                );
                const cleaned = d.projectFields.filter(
                    (f) => !(f.disabled && removedNames.has(f.name))
                );
                globalTemplateId = null;
                projectFields = fullMerge(
                    cleaned,
                    null,
                    gl,
                    d.seriesTemplateId,
                    seriesTemplates
                );
            } else {
                const cleaned = d.projectFields.filter(
                    (f) =>
                        !getInheritedNames(d.globalTemplateId, gl).has(f.name)
                );
                projectFields = fullMerge(
                    cleaned,
                    d.globalTemplateId,
                    gl,
                    d.seriesTemplateId,
                    seriesTemplates
                );
            }
            return {
                ...prev,
                [cat]: {
                    ...d,
                    globalTemplateId,
                    projectFields,
                    globalEditor: null,
                    dirty: d.dirty || appliedDeleted,
                },
            };
        });
    }

    async function persistSeriesEditor(cat: CompendiumCategory) {
        const d = drafts[cat];
        const se = d?.seriesEditor;
        if (!se || !seriesId) return false;
        /*const inheritedNames = getInheritedNames(se.refGlobalId, globalTemplates);*/
        const savable = se.fields
            .filter((f) => {
                /*if (!inheritedNames.has(f.name)) return true;*/
                if (!f.disabled) return true;
                return false;
            })
            .filter((f) => f.name.trim() && f.label.trim());

        if (se.id) {
            const data = {
                name: se.name.trim(),
                description: se.description.trim() || null,
                customFields: savable,
                globalTemplateId: se.refGlobalId,
            };
            console.log('[data to save]', se.refGlobalId, data);
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
            globalTemplateId: se.refGlobalId,
            baseType: cat,
            customFields: savable,
        };
        console.log('[new series temp data]', data);
        await rpc.request['db:create-series-template'](data);
        return true;
    }

    async function refreshSeries(cat: CompendiumCategory) {
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
                    projectFields: fullMerge(
                        cleaned,
                        d.globalTemplateId,
                        globalTemplates,
                        d.seriesTemplateId,
                        sl
                    ),
                    seriesEditor: null,
                },
            };
        });
    }

    async function saveSeriesEditor(cat: CompendiumCategory) {
        console.log('[saving]', cat);
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

            const globalInherited = getInheritedNames(
                d.globalTemplateId,
                globalTemplates
            );
            const seriesInherited = getSeriesInheritedNames(
                d.seriesTemplateId,
                seriesTemplates
            );
            const savableProject = d.projectFields
                .filter((f) => {
                    if (
                        !globalInherited.has(f.name) &&
                        !seriesInherited.has(f.name)
                    )
                        return true;
                    if (f.disabled) return true;
                    return false;
                })
                .filter((f) => f.name.trim() && f.label.trim());

            await rpc.request['db:save-template']({
                projectId,
                baseType: cat,
                customFields: savableProject,
                globalTemplateId: d.globalTemplateId,
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

    function summaryFor(d: CategoryDraft): string {
        const g =
            globalTemplates.find((x) => x.id === d.globalTemplateId)
                ?.customFields?.length || 0;
        const s =
            seriesTemplates.find((x) => x.id === d.seriesTemplateId)
                ?.customFields?.length || 0;
        const inherited = new Set([
            ...Array.from(
                getInheritedNames(d.globalTemplateId, globalTemplates)
            ),
            ...Array.from(
                getSeriesInheritedNames(d.seriesTemplateId, seriesTemplates)
            ),
        ]);
        const p = d.projectFields.filter((f) => !inherited.has(f.name)).length;
        return `${g} global · ${s} series · ${p} project`;
    }

    function globalSummary(d: CategoryDraft): string {
        const g = globalTemplates.find((x) => x.id === d.globalTemplateId);
        return g ? `${g.name} (${g.customFields?.length || 0} fields)` : 'None';
    }

    function seriesSummary(d: CategoryDraft): string {
        if (!seriesId) return 'Not applicable';
        const s = seriesTemplates.find((x) => x.id === d.seriesTemplateId);
        return s ? `${s.name} (${s.customFields?.length || 0} fields)` : 'None';
    }

    function projectSummary(d: CategoryDraft): string {
        const inherited = new Set([
            ...Array.from(
                getInheritedNames(d.globalTemplateId, globalTemplates)
            ),
            ...Array.from(
                getSeriesInheritedNames(d.seriesTemplateId, seriesTemplates)
            ),
        ]);
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

    function renderGlobalSection(cat: CompendiumCategory, d: CategoryDraft) {
        const globalsForCat = globalTemplates.filter((g) => g.baseType === cat);
        const selected = globalTemplates.find(
            (g) => g.id === d.globalTemplateId
        );
        return (
            <div>
                <div style={{ marginBottom: '0.5rem' }}>
                    <label>Apply a global template to this project</label>
                    <select
                        value={d.globalTemplateId || ''}
                        onChange={(e) =>
                            handleGlobalChange(cat, e.target.value)
                        }
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        <option value="">None (no global template)</option>
                        {globalsForCat.map((gt) => (
                            <option key={gt.id} value={gt.id}>
                                {gt.name}
                                {gt.description ? ` — ${gt.description}` : ''} (
                                {gt.customFields?.length || 0} fields)
                            </option>
                        ))}
                    </select>
                </div>
                <p
                    style={{
                        fontSize: '0.8em',
                        color: '#888',
                        margin: '0 0 0.5rem 0',
                    }}
                >
                    Global templates apply to every project. Inherited fields
                    appear in the Project Fields section below.
                </p>
                {selected ? (
                    <div
                        style={{
                            padding: '0.5rem',
                            background: 'var(--bg-secondary, #1a1a1a)',
                            borderRadius: '4px',
                        }}
                    >
                        {renderFieldPreview(
                            selected.customFields,
                            (name) =>
                                d.projectFields.find((p) => p.name === name)
                                    ?.label || name
                        )}
                    </div>
                ) : (
                    <div style={{ color: '#888', fontSize: '0.85em' }}>
                        No global template applied to this project.
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
                            Global templates for {categoryLabels[cat]} (shared
                            across all projects)
                        </span>
                        <button
                            type="button"
                            onClick={() => openGlobalCreate(cat)}
                        >
                            + New Global Template
                        </button>
                    </div>
                    {globalsForCat.length === 0 ? (
                        <div style={{ color: '#888', fontSize: '0.85em' }}>
                            No global templates for this category yet.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                            }}
                        >
                            {globalsForCat.map((g) => (
                                <div
                                    key={g.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem',
                                        border: '1px solid var(--border, #333)',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <div>
                                        <strong>{g.name}</strong>
                                        {g.description && (
                                            <span
                                                style={{
                                                    marginLeft: '0.5rem',
                                                    color: '#888',
                                                    fontSize: '0.85em',
                                                }}
                                            >
                                                — {g.description}
                                            </span>
                                        )}
                                        <span
                                            style={{
                                                marginLeft: '0.5rem',
                                                color: '#888',
                                                fontSize: '0.85em',
                                            }}
                                        >
                                            ({g.customFields?.length || 0}{' '}
                                            fields)
                                        </span>
                                        {g.id === d.globalTemplateId && (
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
                                                openGlobalEdit(cat, g)
                                            }
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className="danger"
                                            onClick={() =>
                                                handleDeleteGlobal(cat, g.id)
                                            }
                                            style={{ color: '#e74c3c' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {d.globalEditor && renderGlobalEditor(cat, d)}
            </div>
        );
    }

    function renderGlobalEditor(cat: CompendiumCategory, d: CategoryDraft) {
        const ge = d.globalEditor!;
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
                        {ge.id
                            ? 'Editing Global Template'
                            : 'New Global Template'}
                    </strong>
                    <button
                        type="button"
                        onClick={() => cancelGlobalEditor(cat)}
                    >
                        Cancel
                    </button>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                    <label>Template Name</label>
                    <input
                        type="text"
                        value={ge.name}
                        onChange={(e) =>
                            updateGlobalEditor(cat, { name: e.target.value })
                        }
                        style={{ width: '100%' }}
                    />
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                    <label>Description</label>
                    <textarea
                        value={ge.description}
                        onChange={(e) =>
                            updateGlobalEditor(cat, {
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
                        fields={ge.fields}
                        onChange={(fields) =>
                            updateGlobalEditor(cat, { fields })
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
                        onClick={() => cancelGlobalEditor(cat)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="save-btn"
                        onClick={() => saveGlobalEditor(cat)}
                        disabled={!ge.name.trim()}
                    >
                        Save Global Template
                    </button>
                </div>
            </div>
        );
    }

    function renderSeriesEditor(cat: CompendiumCategory, d: CategoryDraft) {
        const se = d.seriesEditor!;
        const globalsForCat = globalTemplates.filter((g) => g.baseType === cat);
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
                <div style={{ marginBottom: '0.5rem' }}>
                    <label>
                        Reference Global Template (optional, for inherited
                        fields)
                    </label>
                    {/*Need Work 1 */}
                    <select
                        value={
                            se.refGlobalId ||
                            seriesTemplates?.[0]?.globalTemplateId ||
                            ''
                        }
                        onChange={(e) =>
                            handleSeriesEditorRefGlobal(cat, e.target.value)
                        }
                        style={{ width: '100%' }}
                    >
                        <option value="">— None —</option>
                        {globalsForCat.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Fields</label>
                    <SimpleFieldsEditor
                        fields={se.fields}
                        onChange={(fields) =>
                            updateSeriesEditor(cat, { fields })
                        }
                        inheritedNames={getInheritedNames(
                            se.refGlobalId,
                            globalTemplates
                        )}
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
                    from the global and series templates are shown with an
                    INHERITED badge.
                </p>
                <ProjectFieldsEditor
                    fields={d.projectFields}
                    onChange={(fields) =>
                        updateDraft(cat, { projectFields: fields })
                    }
                    inheritedNames={getInheritedNames(
                        d.globalTemplateId,
                        globalTemplates
                    )}
                    seriesInheritedNames={getSeriesInheritedNames(
                        d.seriesTemplateId,
                        seriesTemplates
                    )}
                />
            </div>
        );
    }

    return (
        <div
            style={{
                flex: 1,
                overflowY: 'auto',
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
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.4rem',
                            borderBottom: '1px solid var(--border, #333)',
                            paddingBottom: '0.5rem',
                            flexWrap: 'wrap',
                            flexShrink: 0,
                        }}
                    >
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
                                        <strong>{categoryLabels[cat]}</strong>
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
                    {(() => {
                        const d = drafts[activeCat];
                        if (!d) return null;
                        const seriesForCat = seriesTemplates.filter(
                            (s) => s.baseType === activeCat
                        );
                        /*console.log("[series temp]", seriesTemplates, activeCat)*/
                        console.log(
                            '[series temp]',
                            seriesTemplates,
                            activeCat,
                            seriesTemplates?.[0]?.globalTemplateId
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
                                {!seriesTemplates?.[0]?.globalTemplateId ? (
                                    <CollapsibleSection
                                        title="Global Template"
                                        collapsed={isSectionCollapsed(
                                            activeCat,
                                            'global'
                                        )}
                                        onToggle={() =>
                                            toggleSection(activeCat, 'global')
                                        }
                                        summary={globalSummary(d)}
                                    >
                                        {renderGlobalSection(activeCat, d)}
                                    </CollapsibleSection>
                                ) : (
                                    ''
                                )}
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
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        gap: '0.5rem',
                                    }}
                                >
                                    {d.dirty && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                reloadCategory(activeCat)
                                            }
                                        >
                                            Discard
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="save-btn"
                                        onClick={() =>
                                            handleSaveCategory(activeCat)
                                        }
                                        disabled={
                                            !d.dirty || savingCat === activeCat
                                        }
                                    >
                                        {savingCat === activeCat
                                            ? 'Saving...'
                                            : `Save ${categoryLabels[activeCat]}`}
                                    </button>
                                </div>
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
    seriesInheritedNames,
}: {
    fields: FieldDefinition[];
    onChange: (fields: FieldDefinition[]) => void;
    inheritedNames: Set<string>;
    seriesInheritedNames: Set<string>;
}) {
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] =
        useState<FieldDefinition['type']>('text');
    const [showAddField, setShowAddField] = useState(false);

    function addField() {
        if (!newFieldName.trim()) return;
        const field: FieldDefinition = {
            name: newFieldName.trim().toLowerCase().replace(/\s+/g, '_'),
            type: newFieldType,
            label: newFieldName.trim(),
            required: false,
            ...(newFieldType === 'select' || newFieldType === 'multiselect'
                ? { options: [] }
                : {}),
            ...(newFieldType === 'range'
                ? { rangeMin: 0, rangeMax: 100, rangeStep: 1 }
                : {}),
            ...(newFieldType === 'entitylink'
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
            ...(newFieldType === 'tree'
                ? {
                      entitylinkCategories: ['character'],
                      treeRelations: TREE_PRESETS.family,
                  }
                : {}),
        };
        onChange([...fields, field]);
        setNewFieldName('');
        setShowAddField(false);
    }

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
        return (
            inheritedNames.has(fieldName) || seriesInheritedNames.has(fieldName)
        );
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
            {showAddField ? (
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
                            placeholder="Field name"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addField()}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                background: '#2a2b2c',
                                border: '1px solid #393a3b',
                                borderRadius: '6px',
                                color: '#fff',
                                fontSize: '14px',
                            }}
                        />
                        <button
                            type="button"
                            onClick={addField}
                            disabled={!newFieldName.trim()}
                        >
                            Create
                        </button>
                    </div>
                    <FieldTypePills
                        value={newFieldType}
                        onChange={setNewFieldType}
                    />
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowAddField(true)}
                    style={{ marginBottom: '0.5rem' }}
                >
                    + Add New Field
                </button>
            )}

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
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] =
        useState<FieldDefinition['type']>('text');
    const [showAddField, setShowAddField] = useState(false);

    function addField() {
        if (!newFieldName.trim()) return;
        const field: FieldDefinition = {
            name: newFieldName.trim().toLowerCase().replace(/\s+/g, '_'),
            type: newFieldType,
            label: newFieldName.trim(),
            required: false,
            ...(newFieldType === 'select' || newFieldType === 'multiselect'
                ? { options: [] }
                : {}),
            ...(newFieldType === 'range'
                ? { rangeMin: 0, rangeMax: 100, rangeStep: 1 }
                : {}),
            ...(newFieldType === 'entitylink'
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
            ...(newFieldType === 'tree'
                ? {
                      entitylinkCategories: ['character'],
                      treeRelations: TREE_PRESETS.family,
                  }
                : {}),
        };
        onChange([...fields, field]);
        setNewFieldName('');
        setShowAddField(false);
    }

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
            {showAddField ? (
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
                            placeholder="Field name"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addField()}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="button"
                            onClick={addField}
                            disabled={!newFieldName.trim()}
                        >
                            Add
                        </button>
                    </div>
                    <FieldTypePills
                        value={newFieldType}
                        onChange={setNewFieldType}
                    />
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => setShowAddField(true)}
                    style={{ marginBottom: '0.5rem' }}
                >
                    + Add New Field
                </button>
            )}
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
