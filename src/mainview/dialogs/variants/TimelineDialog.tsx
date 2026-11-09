import {
    Fragment,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { DataSet } from 'vis-data';
import { Timeline } from 'vis-timeline';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import OldTimeLine from '@/mainview/components/timeline/OldTimeLine';
import TimelineBottomDock, {
    getCheckedSectionKeys,
} from '@/mainview/ui/comps/TimelineBottomDock';
import {
    BASE_ORDER_MS,
    BUFFER_SIZE,
    COLUMN_WIDTH,
    DAY_MS,
    ENTITY_SECTIONS,
    EVENT_COLORS,
    EVENT_LABELS,
    ROW_HEIGHT,
} from '@/shared/constants/template';
import type { ManuscriptDataType } from '@/shared/types/project/manuscript';
import type { FileTab } from '@/shared/types/project/templates';
import type {
    TimelineDataItem,
    TimelineEventDraft,
    timelineFilterBtn,
    TimelineLane,
} from '@/shared/types/timeline';
import type {
    CompendiumCategory,
    CompendiumDataType,
} from '../../../shared/types/project/compendium';
import type { TimelineEvent } from '../../../shared/types/project/timeline';
import TimelineEventEditor from '../../components/TimelineEventEditor';
import TimelineEventPanel from '../../components/TimelineEventPanel';
import { useRPC } from '../../contexts/RPCContext';
import Dialog from '../Dialog';
import styles from './TimelineDialog.module.css';

function dateFromOrder(order: number): Date {
    const base = new Date('2000-01-01T00:00:00Z');
    base.setDate(base.getDate() + order);
    return base;
}

interface TimelineDialogProps {
    open: boolean;
    onClose: () => void;
    projectId: string;

    tabs: FileTab[];
    onOpenEntity: (id: string, type: CompendiumCategory) => void;
    manuscriptData: ManuscriptDataType;
    compendiumData: CompendiumDataType;
}

export default function TimelineDialog({
    open,
    onClose,
    projectId,
    tabs,
    onOpenEntity,
    manuscriptData,
    compendiumData,
}: TimelineDialogProps) {
    const rpc = useRPC();
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<Timeline | null>(null);
    const itemsRef = useRef<DataSet<any> | null>(null);
    const groupsRef = useRef<DataSet<any> | null>(null);

    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(
        null
    );
    const [showEditor, setShowEditor] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(
        null
    );
    const [loading, setLoading] = useState(false);
    const initializedRef = useRef(false);

    const entityOptions = [
        ...compendiumData.characters.map((c) => ({
            id: c.id,
            name: c.name,
            type: 'character' as CompendiumCategory,
        })),
        ...compendiumData.organizations.map((o) => ({
            id: o.id,
            name: o.name,
            type: 'organization' as CompendiumCategory,
        })),
    ];

    const chapterOptions = manuscriptData.chapters.map((c) => ({
        id: c.id,
        title: c.title,
    }));

    function buildTimeline() {
        if (!containerRef.current) return;
        if (timelineRef.current) {
            timelineRef.current.destroy();
            timelineRef.current = null;
        }

        const groupsData: any[] = [
            {
                id: 'novel',
                content: 'Novel Timeline',
                className: 'group-novel',
            },
            {
                id: 'milestones',
                content: 'Milestones',
                className: 'group-milestones',
            },
        ];

        for (const ch of compendiumData.characters) {
            groupsData.push({
                id: `char-${ch.id}`,
                content: ch.name,
                className: 'group-character',
            });
        }

        for (const org of compendiumData.organizations) {
            groupsData.push({
                id: `org-${org.id}`,
                content: org.name,
                className: 'group-organization',
            });
        }

        const itemsData: any[] = events.map((ev) => {
            const color = EVENT_COLORS[ev.eventType] || EVENT_COLORS.milestone;
            let groupId: string;
            if (ev.eventType === 'chapter') {
                groupId = 'novel';
            } else if (ev.entityType === 'character' && ev.entityId) {
                groupId = `char-${ev.entityId}`;
            } else if (ev.entityType === 'organization' && ev.entityId) {
                groupId = `org-${ev.entityId}`;
            } else {
                groupId = 'milestones';
            }

            return {
                id: ev.id,
                content: ev.title,
                start: dateFromOrder(ev.dateOrder),
                group: groupId,
                type: 'box' as const,
                className: `event-${ev.eventType}`,
                style: `background: ${color}; border-color: ${color}; color: #fff;`,
                title: `${ev.title}${ev.inStoryDate ? ` (${ev.inStoryDate})` : ''}`,
            };
        });

        const items = new DataSet(itemsData);
        const groups = new DataSet(groupsData);
        itemsRef.current = items;
        groupsRef.current = groups;

        function formatLabel(d: any): string {
            try {
                const ms =
                    typeof d === 'number'
                        ? d
                        : (d?.valueOf?.() ?? d?.getTime?.() ?? 0);
                const base = new Date('2000-01-01').getTime();
                const diff = Math.round((ms - base) / 86400000);
                return `#${diff}`;
            } catch {
                return '';
            }
        }

        const options = {
            groupOrder: 'content',
            editable: false,
            selectable: true,
            multiselect: false,
            zoomable: true,
            moveable: true,
            stack: true,
            maxHeight: '100%',
            width: '100%',
            format: {
                majorLabels: (d: any) => formatLabel(d),
                minorLabels: () => '',
            },
        };

        const timeline = new Timeline(
            containerRef.current,
            items,
            groups,
            options as any
        );
        timelineRef.current = timeline;

        timeline.on('select', (props: any) => {
            if (props.items && props.items.length > 0) {
                const ev = events.find((e) => e.id === props.items[0]);
                setSelectedEvent(ev || null);
            } else {
                setSelectedEvent(null);
            }
        });

        timeline.on('doubleClick', (props: any) => {
            if (props.item) {
                const ev = events.find((e) => e.id === props.item);
                if (ev) {
                    setEditingEvent(ev);
                    setShowEditor(true);
                }
            }
        });
    }

    const loadEvents = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const data = await rpc.request['db:get-timeline-events'](projectId);
            setEvents(data || []);
        } catch (e) {
            console.error('Failed to load timeline events:', e);
        } finally {
            setLoading(false);
        }
    }, [projectId, rpc]);

    useEffect(() => {
        if (open) {
            initializedRef.current = false;
            loadEvents();
        }
    }, [open, loadEvents]);

    useEffect(() => {
        if (!open || !containerRef.current) return;
        buildTimeline();
        return () => {
            if (timelineRef.current) {
                timelineRef.current.destroy();
                timelineRef.current = null;
            }
        };
    }, [open, events, compendiumData.characters, compendiumData.organizations]);

    async function handleAutoGenerate(): Promise<number | null> {
        if (!projectId) return null;
        try {
            const created =
                await rpc.request['db:auto-generate-timeline-events'](
                    projectId
                );
            await loadEvents();
            return created;
        } catch (e) {
            console.error('Failed to auto-generate events:', e);
            return null;
        }
    }

    function handleAddEvent() {
        setEditingEvent(null);
        setShowEditor(true);
    }

    function handleEditEvent(ev: TimelineEvent) {
        setEditingEvent(ev);
        setShowEditor(true);
    }

    const persistTimelineEvent = useCallback(
        async (
            data: Partial<TimelineEvent>,
            id?: string
        ): Promise<TimelineEvent | undefined> => {
            try {
                const saved = id
                    ? await rpc.request['db:update-timeline-event']({
                          id,
                          data: data as any,
                      })
                    : await rpc.request['db:create-timeline-event']({
                          id: crypto.randomUUID(),
                          projectId,
                          title: data.title || 'Untitled Event',
                          description: data.description || null,
                          inStoryDate: data.inStoryDate || null,
                          dateOrder: data.dateOrder ?? 0,
                          entityType: data.entityType || null,
                          entityId: data.entityId || null,
                          eventType: data.eventType || 'milestone',
                          chapterId: data.chapterId || null,
                          metadata: null,
                      });
                await loadEvents();
                return saved;
            } catch (e) {
                console.error('Failed to save event:', e);
                return undefined;
            }
        },
        [rpc, projectId, loadEvents]
    );

    async function handleSaveEvent(data: Partial<TimelineEvent>) {
        await persistTimelineEvent(data, editingEvent?.id);
    }

    const deleteTimelineEvent = useCallback(
        async (id: string) => {
            try {
                await rpc.request['db:delete-timeline-event'](id);
                await loadEvents();
            } catch (e) {
                console.error('Failed to delete event:', e);
            }
        },
        [rpc, loadEvents]
    );

    async function handleDeleteEvent() {
        if (!selectedEvent) return;
        await deleteTimelineEvent(selectedEvent.id);
        setSelectedEvent(null);
    }

    function openEntityForEvent(ev: TimelineEvent) {
        if (ev.entityType && ev.entityId) {
            onOpenEntity(ev.entityId, ev.entityType as CompendiumCategory);
            onClose();
        }
    }

    function handleOpenEntity() {
        if (selectedEvent) openEntityForEvent(selectedEvent);
    }

    const eventTypeColor = (type: string) =>
        EVENT_COLORS[type] || EVENT_COLORS.milestone;

    const [overhaulToggle, SetOverhaulToggle] = useState(true);

    const categoryData = useMemo<Record<string, TimelineDataItem[]>>(
        () => ({
            chapters: manuscriptData.chapters.map((c) => ({
                id: c.id,
                label: c.title,
            })),
            acts: manuscriptData.storyActs.map((a) => ({
                id: a.id,
                label: a.title,
            })),
            'plot threads': manuscriptData.plotThreads.map((p) => ({
                id: p.id,
                label: p.name,
            })),
            'story beats': manuscriptData.storyBeats.map((b) => ({
                id: b.id,
                label: b.title,
            })),
            character: compendiumData.characters.map((c) => ({
                id: c.id,
                label: c.name,
            })),
            location: compendiumData.locations.map((l) => ({
                id: l.id,
                label: l.name,
            })),
            organization: compendiumData.organizations.map((o) => ({
                id: o.id,
                label: o.name,
            })),
            item: compendiumData.items.map((i) => ({
                id: i.id,
                label: i.name,
            })),
            lore: compendiumData.loreEntries.map((l) => ({
                id: l.id,
                label: l.name,
            })),
        }),
        [manuscriptData, compendiumData]
    );

    return (
        <>
            <Dialog open={open} onClose={onClose} title="Timeline" large={true}>
                <>
                    {!overhaulToggle && (
                        <OldTimeLine
                            loading={loading}
                            events={events}
                            handleAddEvent={handleAddEvent}
                            handleEditEvent={handleEditEvent}
                            handleDeleteEvent={handleDeleteEvent}
                            handleAutoGenerate={handleAutoGenerate}
                            overhaulToggle={overhaulToggle}
                            SetOverhaulToggle={SetOverhaulToggle}
                            containerRef={containerRef}
                            handleOpenEntity={handleOpenEntity}
                            selectedEvent={selectedEvent}
                            eventTypeColor={eventTypeColor}
                        />
                    )}
                    {overhaulToggle && (
                        <NewTimeline
                            projectId={projectId}
                            tabs={tabs}
                            categoryData={categoryData}
                            events={events}
                            entityOptions={entityOptions}
                            chapterOptions={chapterOptions}
                            onSwitchLayout={() =>
                                SetOverhaulToggle(!overhaulToggle)
                            }
                            onAutoDetect={handleAutoGenerate}
                            onSaveEvent={persistTimelineEvent}
                            onDeleteEvent={deleteTimelineEvent}
                            onOpenEntityForEvent={openEntityForEvent}
                        />
                    )}
                </>
            </Dialog>

            <TimelineEventEditor
                open={showEditor}
                onClose={() => {
                    setShowEditor(false);
                    setEditingEvent(null);
                }}
                onSave={handleSaveEvent}
                event={editingEvent}
                entityOptions={entityOptions}
                chapterOptions={chapterOptions}
            />
        </>
    );
}

export type TimeGranularity = 'year' | 'month' | 'week' | 'day';

interface ColumnPeriod {
    key: string;
    label: string;
    subLabel?: string;
    startDate: Date;
    endDate: Date;
}

// ----------------- DATE UTILITIES -----------------

function addUnits(
    date: Date,
    granularity: TimeGranularity,
    count: number
): Date {
    const d = new Date(date);
    switch (granularity) {
        case 'year':
            d.setFullYear(d.getFullYear() + count);
            break;
        case 'month':
            d.setMonth(d.getMonth() + count);
            break;
        case 'week':
            d.setDate(d.getDate() + count * 7);
            break;
        case 'day':
            d.setDate(d.getDate() + count);
            break;
    }
    return d;
}

function startOfUnit(date: Date, granularity: TimeGranularity): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    switch (granularity) {
        case 'year':
            d.setMonth(0, 1);
            break;
        case 'month':
            d.setDate(1);
            break;
        case 'week': {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            break;
        }
        case 'day':
            break;
    }
    return d;
}

function createPeriod(
    startDate: Date,
    granularity: TimeGranularity
): ColumnPeriod {
    const start = startOfUnit(startDate, granularity);
    const end = addUnits(start, granularity, 1);

    let label = '';
    let subLabel: string | undefined = undefined;

    switch (granularity) {
        case 'year':
            label = `${start.getFullYear()}`;
            break;
        case 'month':
            label = start.toLocaleString('default', { month: 'short' });
            subLabel = `${start.getFullYear()}`;
            break;
        case 'week': {
            const firstJan = new Date(start.getFullYear(), 0, 1);
            const weekNum = Math.ceil(
                ((start.getTime() - firstJan.getTime()) / 86400000 +
                    firstJan.getDay() +
                    1) /
                    7
            );
            label = `W${weekNum}`;
            subLabel = start.toLocaleString('default', {
                month: 'short',
                day: 'numeric',
            });
            break;
        }
        case 'day':
            label = `${start.getDate()}`;
            subLabel = start.toLocaleString('default', { weekday: 'short' });
            break;
    }

    return {
        key: `${granularity}-${start.toISOString()}`,
        label,
        subLabel,
        startDate: start,
        endDate: end,
    };
}

// Converts a date period into a [startOrder, endOrder) range of dateOrder days.
function periodOrderRange(period: ColumnPeriod): {
    startOrder: number;
    endOrder: number;
} {
    const start = period.startDate;
    const end = period.endDate;
    const startOrder = Math.round(
        (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) -
            BASE_ORDER_MS) /
            DAY_MS
    );
    const endOrder = Math.round(
        (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
            BASE_ORDER_MS) /
            DAY_MS
    );
    return { startOrder, endOrder };
}

// When empty columns are hidden the timeline becomes a compact, event-only
// axis. The scope keeps zooming intuitive: a year shows every event year,
// zooming into a year shows only that year's event months, and so on.
function compactScopeRange(
    granularity: TimeGranularity,
    anchor: Date
): { start: Date; end: Date } | null {
    const anchorStart = startOfUnit(anchor, granularity);

    switch (granularity) {
        case 'year':
            return null;
        case 'month': {
            const start = new Date(anchorStart.getFullYear(), 0, 1);
            const end = new Date(anchorStart.getFullYear() + 1, 0, 1);
            return { start, end };
        }
        case 'week': {
            const start = new Date(
                anchorStart.getFullYear(),
                anchorStart.getMonth(),
                1
            );
            const end = new Date(
                anchorStart.getFullYear(),
                anchorStart.getMonth() + 1,
                1
            );
            return { start, end };
        }
        case 'day': {
            const start = startOfUnit(anchorStart, 'week');
            const end = addUnits(start, 'week', 1);
            return { start, end };
        }
    }
}

// ---- TIMELINE UI PERSISTENCE ----

const TIMELINE_PREFS_VERSION = 1;

function timelineStorageKey(projectId: string) {
    return `novelty:timeline:${projectId}`;
}

function defaultTimelineFilters(): timelineFilterBtn[] {
    return [
        { cat: 'opened tabs', hasitem: true, checked: false },
        {
            cat: 'manuscript',
            checked: false,
            hasitem: false,
            subCat: [
                { key: 'chapters', hasitem: true, checked: false },
                { key: 'acts', hasitem: true, checked: false },
                { key: 'plot threads', hasitem: true, checked: false },
                { key: 'story beats', hasitem: true, checked: false },
            ],
        },
        {
            cat: 'compendium',
            checked: false,
            hasitem: false,
            subCat: [
                { key: 'character', hasitem: true, checked: false },
                { key: 'location', hasitem: true, checked: false },
                { key: 'organization', hasitem: true, checked: false },
                { key: 'item', hasitem: true, checked: false },
                { key: 'lore', hasitem: true, checked: false },
            ],
        },
    ];
}

// Merge stored filters into the current defaults so new categories still
// appear while checked (nodeIndicator) state is preserved.
function mergeStoredFilters(stored: unknown): timelineFilterBtn[] {
    const base = defaultTimelineFilters();
    if (!Array.isArray(stored)) return base;

    return base.map((cat) => {
        const savedCat = stored.find((item) => item && item.cat === cat.cat) as
            timelineFilterBtn | undefined;
        return {
            ...cat,
            checked:
                typeof savedCat?.checked === 'boolean'
                    ? savedCat.checked
                    : cat.checked,
            subCat: cat.subCat?.map((sub) => {
                const savedSub = savedCat?.subCat?.find(
                    (item) => item.key === sub.key
                );
                return {
                    ...sub,
                    checked:
                        typeof savedSub?.checked === 'boolean'
                            ? savedSub.checked
                            : sub.checked,
                };
            }),
        };
    });
}

function isEventDraft(value: unknown): value is TimelineEventDraft {
    if (!value || typeof value !== 'object') return false;
    const draft = value as Partial<TimelineEventDraft>;
    return typeof draft.id === 'string' && typeof draft.title === 'string';
}

type TimelinePrefs = {
    openTabsChecked: boolean;
    timelineFilters: timelineFilterBtn[];
    selectedItems: string[];
    drafts: TimelineEventDraft[];
};

function loadTimelinePrefs(projectId: string): TimelinePrefs {
    const fallback = (): TimelinePrefs => ({
        openTabsChecked: false,
        timelineFilters: defaultTimelineFilters(),
        selectedItems: [],
        drafts: [],
    });

    try {
        const raw = localStorage.getItem(timelineStorageKey(projectId));
        if (!raw) return fallback();
        const parsed = JSON.parse(raw);
        return {
            openTabsChecked: parsed?.openTabsChecked === true,
            timelineFilters: mergeStoredFilters(parsed?.timelineFilters),
            selectedItems: Array.isArray(parsed?.selectedItems)
                ? parsed.selectedItems.filter(
                      (key: unknown): key is string => typeof key === 'string'
                  )
                : [],
            drafts: Array.isArray(parsed?.drafts)
                ? parsed.drafts.filter(isEventDraft)
                : [],
        };
    } catch {
        return fallback();
    }
}

function createEventDraft(): TimelineEventDraft {
    return {
        id: crypto.randomUUID(),
        title: 'Untitled Event',
        description: null,
        inStoryDate: null,
        dateOrder: 0,
        eventType: 'milestone',
        entityType: null,
        entityId: null,
        chapterId: null,
    };
}

function draftToPartial(draft: TimelineEventDraft): Partial<TimelineEvent> {
    return {
        title: draft.title,
        description: draft.description,
        inStoryDate: draft.inStoryDate,
        dateOrder: draft.dateOrder,
        eventType: draft.eventType,
        entityType: draft.entityType,
        entityId: draft.entityId,
        chapterId: draft.chapterId,
    };
}

type EventPanelTarget =
    | { kind: 'event'; eventId: string; startEditing: boolean }
    | { kind: 'draft'; draftId: string }
    | { kind: 'create'; values: Partial<TimelineEvent> };

// ----------------- COMPONENT -----------------

export function NewTimeline({
    projectId,
    tabs,
    categoryData,
    events,
    entityOptions,
    chapterOptions,
    onSwitchLayout,
    onAutoDetect,
    onSaveEvent,
    onDeleteEvent,
    onOpenEntityForEvent,
}: {
    projectId: string;
    tabs: FileTab[];
    categoryData: Record<string, TimelineDataItem[]>;
    events: TimelineEvent[];
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
    onSwitchLayout: () => void;
    onAutoDetect?: () => Promise<number | null>;
    onSaveEvent: (
        data: Partial<TimelineEvent>,
        id?: string
    ) => Promise<TimelineEvent | undefined>;
    onDeleteEvent: (id: string) => Promise<void>;
    onOpenEntityForEvent: (ev: TimelineEvent) => void;
}) {
    const [openTabsChecked, setOpenTabsChecked] = useState<boolean>(
        () => loadTimelinePrefs(projectId).openTabsChecked
    );

    // Lane selection — each key is `${section}::${id}`; one lane per key.
    // Restored from localStorage (active categoryDataChips).
    const [selectedItems, setSelectedItems] = useState<Set<string>>(
        () => new Set(loadTimelinePrefs(projectId).selectedItems)
    );

    // Unassigned tray events (persisted per project)
    const [drafts, setDrafts] = useState<TimelineEventDraft[]>(
        () => loadTimelinePrefs(projectId).drafts
    );
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

    // Floating event panel
    const [panelTarget, setPanelTarget] = useState<EventPanelTarget | null>(
        null
    );
    const [panelKey, setPanelKey] = useState(0);
    const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

    // Timeline granularity & anchor date states
    const [granularity, setGranularity] = useState<TimeGranularity>('year');
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [periods, setPeriods] = useState<ColumnPeriod[]>([]);

    // Grid view toggles
    const [hideEmptyCellVisuals, setHideEmptyCellVisuals] = useState(false);
    const [skipEmptyCells, setSkipEmptyCells] = useState(false);
    const [hideEmptyColumns, setHideEmptyColumns] = useState(false);
    const [hideEmptyLanes, setHideEmptyLanes] = useState(false);

    // Row focus requested by clicking a categoryDataChip
    const [pendingRowFocus, setPendingRowFocus] = useState<{
        key: string;
        nonce: number;
    } | null>(null);
    const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const colLabelsPaneRef = useRef<HTMLDivElement>(null);
    const rowLabelsPaneRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const focusTimerRef = useRef<number | null>(null);
    const rowFocusTimerRef = useRef<number | null>(null);
    const rowLabelRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const isPrependingRef = useRef(false);

    // Anchor the timeline on the earliest real event the first time events load,
    // so the grid opens showing content instead of an arbitrary "today".
    const autoAnchoredRef = useRef(false);

    // Restored from localStorage (nodeIndicator / checked filter state).
    const [timelineFilters, setTimelineFilters] = useState<timelineFilterBtn[]>(
        () => loadTimelinePrefs(projectId).timelineFilters
    );

    // Persist chips, filter checks and unassigned drafts per project.
    const stateProjectIdRef = useRef(projectId);
    useEffect(() => {
        stateProjectIdRef.current = projectId;
        const prefs = loadTimelinePrefs(projectId);
        setOpenTabsChecked(prefs.openTabsChecked);
        setTimelineFilters(prefs.timelineFilters);
        setSelectedItems(new Set(prefs.selectedItems));
        setDrafts(prefs.drafts);
        setActiveDraftId(null);
        setPanelTarget(null);
    }, [projectId]);

    useEffect(() => {
        if (stateProjectIdRef.current !== projectId) return;
        try {
            localStorage.setItem(
                timelineStorageKey(projectId),
                JSON.stringify({
                    version: TIMELINE_PREFS_VERSION,
                    openTabsChecked,
                    timelineFilters,
                    selectedItems: [...selectedItems],
                    drafts,
                })
            );
        } catch {
            // ignore storage failures
        }
    }, [projectId, openTabsChecked, timelineFilters, selectedItems, drafts]);

    // Keep the detached label panes aligned with the grid's scroll position.
    const syncLabelPanes = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        if (colLabelsPaneRef.current) {
            colLabelsPaneRef.current.scrollLeft = container.scrollLeft;
        }
        if (rowLabelsPaneRef.current) {
            rowLabelsPaneRef.current.scrollTop = container.scrollTop;
        }
    }, []);

    // Build timeline column units around anchorDate
    const initializePeriods = useCallback(
        (center: Date, level: TimeGranularity) => {
            const list: ColumnPeriod[] = [];
            for (let i = -BUFFER_SIZE; i <= BUFFER_SIZE; i++) {
                list.push(createPeriod(addUnits(center, level, i), level));
            }
            setPeriods(list);

            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    const targetLeft =
                        BUFFER_SIZE * COLUMN_WIDTH -
                        scrollContainerRef.current.clientWidth / 2 +
                        COLUMN_WIDTH / 2;
                    scrollContainerRef.current.scrollLeft = Math.max(
                        0,
                        targetLeft
                    );
                    syncLabelPanes();
                }
            });
        },
        [syncLabelPanes]
    );

    useEffect(() => {
        initializePeriods(anchorDate, granularity);
    }, [granularity, anchorDate, initializePeriods]);

    // Compact columns start at the first event instead of the buffer centre.
    useEffect(() => {
        if (!hideEmptyColumns) return;
        const id = requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (container) {
                container.scrollLeft = 0;
                syncLabelPanes();
            }
        });
        return () => cancelAnimationFrame(id);
    }, [hideEmptyColumns, granularity, anchorDate, syncLabelPanes]);

    // Anchor on the first real event once it arrives (per mount)
    useEffect(() => {
        if (events.length === 0 || autoAnchoredRef.current) return;
        autoAnchoredRef.current = true;
        const minOrder = Math.min(...events.map((e) => e.dateOrder));
        setAnchorDate(dateFromOrder(minOrder));
    }, [events]);

    // Invert scrolling: standard wheel = horizontal, Shift + wheel = vertical
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.shiftKey) {
                // Shift key is held: scroll vertically
                container.scrollTop += e.deltaY !== 0 ? e.deltaY : e.deltaX;
            } else {
                // Normal wheel: scroll horizontally
                container.scrollLeft += e.deltaY !== 0 ? e.deltaY : e.deltaX;
            }
            e.preventDefault();
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Wheel over the row labels should scroll the grid vertically (the labels
    // are a detached mirror of the grid's vertical scroll position).
    useEffect(() => {
        const labels = rowLabelsPaneRef.current;
        if (!labels) return;

        const handleWheel = (e: WheelEvent) => {
            const container = scrollContainerRef.current;
            if (!container) return;
            const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
            if (delta === 0) return;
            e.preventDefault();
            container.scrollTop += delta;
            syncLabelPanes();
        };

        labels.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            labels.removeEventListener('wheel', handleWheel);
        };
    }, [syncLabelPanes]);

    // Infinite horizontal scroll: prepends previous periods on the left, appends feature periods on the right
    const handleScroll = useCallback(() => {
        // Keep labels aligned even while a prepend is in flight.
        syncLabelPanes();

        const container = scrollContainerRef.current;

        if (
            !container ||
            hideEmptyColumns ||
            periods.length === 0 ||
            isPrependingRef.current
        )
            return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const THRESHOLD = 250;

        // SCROLL LEFT: add previous periods without jumping
        if (scrollLeft < THRESHOLD) {
            isPrependingRef.current = true;
            const first = periods[0].startDate;
            const additions: ColumnPeriod[] = [];
            const BATCH = 6;

            for (let i = BATCH; i >= 1; i--) {
                additions.push(
                    createPeriod(addUnits(first, granularity, -i), granularity)
                );
            }

            const addedWidth = BATCH * COLUMN_WIDTH;
            setPeriods((prev) => [...additions, ...prev]);

            requestAnimationFrame(() => {
                container.scrollLeft += addedWidth;
                syncLabelPanes();
                isPrependingRef.current = false;
            });
        }
        // SCROLL RIGHT: add future periods
        else if (scrollWidth - (scrollLeft + clientWidth) < THRESHOLD) {
            const last = periods[periods.length - 1].startDate;
            const additions: ColumnPeriod[] = [];
            const BATCH = 6;

            for (let i = 1; i <= BATCH; i++) {
                additions.push(
                    createPeriod(addUnits(last, granularity, i), granularity)
                );
            }

            setPeriods((prev) => [...prev, ...additions]);
        }
    }, [periods, granularity, syncLabelPanes, hideEmptyColumns]);

    // Hierarchy zoom: year -> month -> week -> day
    const handleZoomIn = (period: ColumnPeriod) => {
        const zoomOrder: Record<TimeGranularity, TimeGranularity | null> = {
            year: 'month',
            month: 'week',
            week: 'day',
            day: null,
        };
        const next = zoomOrder[granularity];
        if (next) {
            setAnchorDate(period.startDate);
            setGranularity(next);
        }
    };

    const handleZoomOut = () => {
        const zoomBack: Record<TimeGranularity, TimeGranularity | null> = {
            day: 'week',
            week: 'month',
            month: 'year',
            year: null,
        };
        const prev = zoomBack[granularity];
        if (prev) {
            setGranularity(prev);
        }
    };

    useEffect(() => {
        const active = new Set(
            getCheckedSectionKeys(timelineFilters, openTabsChecked)
        );

        setSelectedItems((prev) => {
            let changed = false;
            const next = new Set<string>();

            for (const key of prev) {
                const separator = key.indexOf('::');
                const section =
                    separator === -1 ? key : key.slice(0, separator);

                if (active.has(section)) {
                    next.add(key);
                } else {
                    changed = true;
                }
            }

            return changed ? next : prev;
        });
    }, [timelineFilters, openTabsChecked]);

    const handleToggleItem = useCallback(
        (key: string) => {
            const isAdding = !selectedItems.has(key);
            setSelectedItems((prev) => {
                const next = new Set(prev);
                if (next.has(key)) {
                    next.delete(key);
                } else {
                    next.add(key);
                }
                return next;
            });

            // A chip click that creates a lane should reveal its row label.
            if (isAdding) {
                setPendingRowFocus((prev) => ({
                    key,
                    nonce: (prev?.nonce ?? 0) + 1,
                }));
            }
        },
        [selectedItems]
    );

    const hasAnySelected =
        openTabsChecked ||
        timelineFilters.some(
            (filt) =>
                filt.checked ||
                (filt.subCat && filt.subCat.some((sub) => sub.checked))
        );

    const handleToggleAllOrClear = () => {
        if (hasAnySelected) {
            setOpenTabsChecked(false);
            setTimelineFilters((prev) =>
                prev.map((item) => ({
                    ...item,
                    checked: false,
                    subCat: item.subCat?.map((sub) => ({
                        ...sub,
                        checked: false,
                    })),
                }))
            );
        } else {
            setOpenTabsChecked(true);
            setTimelineFilters((prev) =>
                prev.map((item) => ({
                    ...item,
                    checked: true,
                    subCat: item.subCat?.map((sub) => ({
                        ...sub,
                        checked: true,
                    })),
                }))
            );
        }
    };

    // ---- LANES (rows) & EVENT-TO-CELL RESOLUTION ----

    // One lane per selected dock item. Rows are "the data", columns are dates.
    // Opened tabs are a convenience lane, so skip one when the same underlying
    // chapter/entity already has its own lane selected (and dedupe tabs).
    const visibleRows = useMemo<TimelineLane[]>(() => {
        const nonTabIds = new Set<string>();
        for (const key of selectedItems) {
            const sep = key.indexOf('::');
            if (sep === -1) continue;
            const section = key.slice(0, sep);
            if (section === 'opened tabs') continue;
            const id = key.slice(sep + 2);
            if ((categoryData[section] ?? []).some((i) => i.id === id)) {
                nonTabIds.add(id);
            }
        }

        const rows: TimelineLane[] = [];
        const seenTabIds = new Set<string>();
        for (const key of selectedItems) {
            const sep = key.indexOf('::');
            if (sep === -1) continue;
            const section = key.slice(0, sep);
            const id = key.slice(sep + 2);

            if (section === 'opened tabs') {
                if (nonTabIds.has(id) || seenTabIds.has(id)) continue;
                const tab = tabs.find((t) => t.id === id);
                if (tab) {
                    seenTabIds.add(id);
                    rows.push({ key, section, id, label: tab.name });
                }
                continue;
            }

            const item = (categoryData[section] ?? []).find((i) => i.id === id);
            if (item) rows.push({ key, section, id, label: item.label });
        }
        return rows;
    }, [selectedItems, categoryData, tabs]);

    // Raw ids referenced by events, used to evaluate whether a lane has events.
    const eventReferencedIds = useMemo(() => {
        const ids = new Set<string>();
        for (const ev of events) {
            if (ev.chapterId) ids.add(ev.chapterId);
            if (ev.entityId) ids.add(ev.entityId);
        }
        return ids;
    }, [events]);

    const lanesWithEvents = useMemo(() => {
        const keys = new Set<string>();
        for (const ev of events) {
            if (ev.chapterId) keys.add(`chapters::${ev.chapterId}`);
            if (ev.entityType && ev.entityId) {
                keys.add(`${ev.entityType}::${ev.entityId}`);
            }
        }
        return keys;
    }, [events]);

    // "Hide empty lanes" removes lanes that have no events at all.
    const displayRows = useMemo<TimelineLane[]>(() => {
        if (!hideEmptyLanes) return visibleRows;
        return visibleRows.filter(
            (row) =>
                lanesWithEvents.has(row.key) ||
                (row.section === 'opened tabs' &&
                    eventReferencedIds.has(row.id))
        );
    }, [visibleRows, hideEmptyLanes, lanesWithEvents, eventReferencedIds]);

    // Compact, event-only periods used while "hide empty columns" is active.
    const compactPeriods = useMemo<ColumnPeriod[]>(() => {
        if (!hideEmptyColumns) return [];
        const scope = compactScopeRange(granularity, anchorDate);
        const byKey = new Map<string, ColumnPeriod>();

        for (const ev of events) {
            const date = dateFromOrder(ev.dateOrder);
            if (scope && (date < scope.start || date >= scope.end)) continue;
            const period = createPeriod(date, granularity);
            if (!byKey.has(period.key)) byKey.set(period.key, period);
        }

        return [...byKey.values()].sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime()
        );
    }, [hideEmptyColumns, events, granularity, anchorDate]);

    // The periods actually drawn in the grid.
    const gridPeriods = hideEmptyColumns ? compactPeriods : periods;

    // Each column maps to a [startOrder, endOrder) range of dateOrder values so
    // events can be resolved to a column by their real date.
    const gridPeriodOrders = useMemo(
        () => gridPeriods.map((period) => periodOrderRange(period)),
        [gridPeriods]
    );

    // Group visible events into cells keyed `${colIndex}|${laneKey}`.
    // An event renders in the lane of its entity and/or its chapter.
    const eventsByCell = useMemo(() => {
        const map = new Map<string, TimelineEvent[]>();
        const rowIndexByKey = new Map(
            displayRows.map((row, index) => [row.key, index])
        );

        for (const ev of events) {
            const colIndex = gridPeriodOrders.findIndex(
                (range) =>
                    ev.dateOrder >= range.startOrder &&
                    ev.dateOrder < range.endOrder
            );
            if (colIndex === -1) continue;

            const addTo = (laneKey: string) => {
                const cellKey = `${colIndex}|${laneKey}`;
                const list = map.get(cellKey);
                if (list) list.push(ev);
                else map.set(cellKey, [ev]);
            };

            if (rowIndexByKey.has(`chapters::${ev.chapterId}`)) {
                addTo(`chapters::${ev.chapterId}`);
            }
            if (ev.entityType && ev.entityId) {
                const laneKey = `${ev.entityType}::${ev.entityId}`;
                if (rowIndexByKey.has(laneKey)) addTo(laneKey);
            }
        }
        return map;
    }, [events, displayRows, gridPeriodOrders]);

    // Which grid columns survive the "hide empty columns" filter.
    const displayColIndexes = useMemo(() => {
        const all = gridPeriods.map((_, index) => index);
        if (!hideEmptyColumns) return all;
        return all.filter((index) =>
            displayRows.some(
                (row) =>
                    (eventsByCell.get(`${index}|${row.key}`)?.length ?? 0) > 0
            )
        );
    }, [gridPeriods, hideEmptyColumns, displayRows, eventsByCell]);

    // ---- ENTITY FILTER STATUS ----

    const hasEntityFilter = selectedItems.size > 0;

    // Distinct real events that belong to at least one selected lane. The old
    // status bar counted dummy PlacedEvent.entityKeys; this mirrors the intent.
    const entityMatchCount = useMemo(() => {
        if (!hasEntityFilter) return 0;
        const matches = new Set<string>();
        for (const ev of events) {
            if (
                ev.chapterId &&
                selectedItems.has(`chapters::${ev.chapterId}`)
            ) {
                matches.add(ev.id);
            }
            if (
                ev.entityType &&
                ev.entityId &&
                selectedItems.has(`${ev.entityType}::${ev.entityId}`)
            ) {
                matches.add(ev.id);
            }
        }
        return matches.size;
    }, [events, selectedItems, hasEntityFilter]);

    // ---- UNASSIGNED DRAFTS, FLOATING PANEL & LANE NAVIGATION ----

    // The tray draft currently armed for placement (if any).
    const activeDraft = useMemo(
        () =>
            activeDraftId
                ? (drafts.find((d) => d.id === activeDraftId) ?? null)
                : null,
        [activeDraftId, drafts]
    );

    // Belt-and-suspenders: clear the arm if its draft disappears.
    useEffect(() => {
        if (activeDraftId && !drafts.some((d) => d.id === activeDraftId)) {
            setActiveDraftId(null);
        }
    }, [activeDraftId, drafts]);

    function openPanel(target: EventPanelTarget) {
        setPanelTarget(target);
        // Remount the panel so its form state resets for the new target.
        setPanelKey((key) => key + 1);
    }

    function closePanel() {
        setPanelTarget(null);
    }

    function handleAddDraft() {
        const draft = createEventDraft();
        setDrafts((prev) => [...prev, draft]);
        setActiveDraftId(draft.id);
        openPanel({ kind: 'draft', draftId: draft.id });
    }

    function handleSelectDraft(id: string) {
        if (!id) {
            setActiveDraftId(null);
            setPanelTarget(null);
            return;
        }
        if (!drafts.some((d) => d.id === id)) return;
        setActiveDraftId(id);
        openPanel({ kind: 'draft', draftId: id });
    }

    function updateDraft(id: string, patch: Partial<TimelineEvent>) {
        setDrafts((prev) =>
            prev.map((draft) => {
                if (draft.id !== id) return draft;
                return {
                    ...draft,
                    title: patch.title ?? draft.title,
                    description:
                        patch.description !== undefined
                            ? patch.description
                            : draft.description,
                    inStoryDate:
                        patch.inStoryDate !== undefined
                            ? patch.inStoryDate
                            : draft.inStoryDate,
                    dateOrder: patch.dateOrder ?? draft.dateOrder,
                    eventType: patch.eventType ?? draft.eventType,
                    entityType:
                        patch.entityType !== undefined
                            ? patch.entityType
                            : draft.entityType,
                    entityId:
                        patch.entityId !== undefined
                            ? patch.entityId
                            : draft.entityId,
                    chapterId:
                        patch.chapterId !== undefined
                            ? patch.chapterId
                            : draft.chapterId,
                };
            })
        );
    }

    function discardDraft(id: string) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        if (activeDraftId === id) setActiveDraftId(null);
        if (panelTarget?.kind === 'draft' && panelTarget.draftId === id) {
            setPanelTarget(null);
        }
    }

    // Place an armed draft into a cell: the cell's lane wins for chapter/entity,
    // the cell's column start wins for the date.
    async function placeDraft(
        draft: TimelineEventDraft,
        row: TimelineLane,
        colIndex: number
    ) {
        const values: Partial<TimelineEvent> = {
            ...draftToPartial(draft),
            title: draft.title.trim() || 'Untitled Event',
            dateOrder: gridPeriodOrders[colIndex].startOrder,
        };
        if (row.section === 'chapters') {
            values.chapterId = row.id;
        } else if (ENTITY_SECTIONS.includes(row.section)) {
            values.entityType = row.section;
            values.entityId = row.id;
        }

        const saved = await onSaveEvent(values);
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
        setActiveDraftId(null);

        if (saved) {
            openPanel({
                kind: 'event',
                eventId: saved.id,
                startEditing: false,
            });
        } else {
            setPanelTarget(null);
        }
    }

    // Clicking a cell: armed draft → place it; occupied → open its first event;
    // empty → open a create panel prefilled with the cell's date + lane.
    function handleCellClick(colIndex: number, row: TimelineLane) {
        if (activeDraft) {
            void placeDraft(activeDraft, row, colIndex);
            return;
        }

        const cellEvents = eventsByCell.get(`${colIndex}|${row.key}`);
        if (cellEvents && cellEvents.length > 0) {
            openPanel({
                kind: 'event',
                eventId: cellEvents[0].id,
                startEditing: false,
            });
            return;
        }

        const values: Partial<TimelineEvent> = {
            title: '',
            dateOrder: gridPeriodOrders[colIndex].startOrder,
            eventType: 'milestone',
        };
        if (row.section === 'chapters') {
            values.chapterId = row.id;
        } else if (ENTITY_SECTIONS.includes(row.section)) {
            values.entityType = row.section;
            values.entityId = row.id;
        }
        openPanel({ kind: 'create', values });
    }

    // First event (leftmost rendered column) in each lane, for row-label jumps.
    const firstEventByLane = useMemo(() => {
        const map = new Map<
            string,
            { event: TimelineEvent; colIndex: number }
        >();
        for (const colIndex of displayColIndexes) {
            for (const row of displayRows) {
                if (map.has(row.key)) continue;
                const cell = eventsByCell.get(`${colIndex}|${row.key}`);
                if (cell && cell.length > 0) {
                    map.set(row.key, { event: cell[0], colIndex });
                }
            }
        }
        return map;
    }, [displayColIndexes, displayRows, eventsByCell]);

    function handleRowLabelClick(row: TimelineLane) {
        const hit = firstEventByLane.get(row.key);
        if (!hit) return;

        const container = scrollContainerRef.current;
        if (container) {
            const renderCol = displayColIndexes.indexOf(hit.colIndex);
            if (renderCol !== -1) {
                const targetLeft =
                    renderCol * COLUMN_WIDTH -
                    container.clientWidth / 2 +
                    COLUMN_WIDTH / 2;
                container.scrollTo({
                    left: Math.max(0, targetLeft),
                    behavior: 'smooth',
                });
            }
        }

        setFocusedEventId(hit.event.id);
        if (focusTimerRef.current !== null) {
            window.clearTimeout(focusTimerRef.current);
        }
        focusTimerRef.current = window.setTimeout(() => {
            setFocusedEventId(null);
            focusTimerRef.current = null;
        }, 1600);
    }

    // Reveal a lane's row label after its dock chip was clicked.
    useLayoutEffect(() => {
        if (!pendingRowFocus) return;

        const rowIndex = displayRows.findIndex(
            (row) => row.key === pendingRowFocus.key
        );
        if (rowIndex === -1) {
            setPendingRowFocus(null);
            return;
        }

        const container = scrollContainerRef.current;
        if (container) {
            const targetTop =
                rowIndex * ROW_HEIGHT -
                container.clientHeight / 2 +
                ROW_HEIGHT / 2;
            container.scrollTo({
                top: Math.max(0, targetTop),
                behavior: 'smooth',
            });
            syncLabelPanes();
        }

        rowLabelRefs.current
            .get(pendingRowFocus.key)
            ?.focus({ preventScroll: true });

        setFocusedRowKey(pendingRowFocus.key);
        if (rowFocusTimerRef.current !== null) {
            window.clearTimeout(rowFocusTimerRef.current);
        }
        rowFocusTimerRef.current = window.setTimeout(() => {
            setFocusedRowKey(null);
            rowFocusTimerRef.current = null;
        }, 1600);

        setPendingRowFocus(null);
    }, [pendingRowFocus, displayRows, syncLabelPanes]);

    useEffect(
        () => () => {
            if (focusTimerRef.current !== null) {
                window.clearTimeout(focusTimerRef.current);
            }
            if (rowFocusTimerRef.current !== null) {
                window.clearTimeout(rowFocusTimerRef.current);
            }
        },
        []
    );

    // Esc / outside click closes event/create panels. A draft panel stays put
    // until the draft is discarded, its ✕ is pressed, or another chip is picked.
    useEffect(() => {
        if (!panelTarget) return;
        if (panelTarget.kind === 'draft') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPanelTarget(null);
        };
        const handleMouseDown = (e: MouseEvent) => {
            const el = panelRef.current;
            if (el && e.target instanceof Node && el.contains(e.target)) return;
            setPanelTarget(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [panelTarget]);

    // Resolve the current panel target to real data. Falls back to null when
    // the referenced event/draft has vanished.
    const panelEvent =
        panelTarget?.kind === 'event'
            ? (events.find((ev) => ev.id === panelTarget.eventId) ?? null)
            : null;
    const panelDraft =
        panelTarget?.kind === 'draft'
            ? (drafts.find((d) => d.id === panelTarget.draftId) ?? null)
            : null;
    const panelCreate =
        panelTarget?.kind === 'create' ? panelTarget.values : null;
    const panelOpen =
        !!panelTarget && !!(panelEvent || panelDraft || panelCreate);

    async function handlePanelSave(values: Partial<TimelineEvent>) {
        if (!panelTarget || panelTarget.kind === 'draft') return;
        const id =
            panelTarget.kind === 'event' ? panelTarget.eventId : undefined;
        const saved = await onSaveEvent(values, id);
        if (saved) {
            openPanel({
                kind: 'event',
                eventId: saved.id,
                startEditing: false,
            });
        } else {
            setPanelTarget(null);
        }
    }

    async function handlePanelDelete() {
        if (panelTarget?.kind !== 'event') return;
        await onDeleteEvent(panelTarget.eventId);
        setPanelTarget(null);
    }

    function handlePanelOpenEntity() {
        if (panelEvent) onOpenEntityForEvent(panelEvent);
    }

    return (
        <div className={styles.timelineGridWrapper}>
            <div className={styles.gridControlHeader}>
                {hasEntityFilter && (
                    <div className={styles.entityFilterStatus}>
                        <span>
                            {selectedItems.size} entity filter
                            {selectedItems.size === 1 ? '' : 's'}
                            <span className={styles.entityFilterCount}>
                                {` · ${entityMatchCount} match${
                                    entityMatchCount === 1 ? '' : 'es'
                                }`}
                            </span>
                        </span>
                        <button
                            type="button"
                            className={styles.entityFilterClear}
                            onClick={() => setSelectedItems(new Set())}
                        >
                            Clear
                        </button>
                    </div>
                )}

                {/* Granularity & Zoom Out indicator */}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        marginRight: 'auto',
                        marginLeft: 12,
                    }}
                >
                    <span
                        style={{
                            fontSize: 13,
                            textTransform: 'uppercase',
                            opacity: 0.8,
                        }}
                    >
                        Scale: <strong>{granularity}</strong>
                    </span>
                    {granularity !== 'year' && (
                        <button
                            type="button"
                            className={styles.entityFilterClear}
                            onClick={handleZoomOut}
                        >
                            &larr; Zoom Out
                        </button>
                    )}
                </div>

                <div
                    className={styles.gridViewControls}
                    role="group"
                    aria-label="Grid view"
                >
                    <span className={styles.gridViewLabel}>Grid</span>
                    <button
                        type="button"
                        className={`${styles.gridToggleBtn} ${
                            hideEmptyCellVisuals ? styles.gridToggleActive : ''
                        }`}
                        aria-pressed={hideEmptyCellVisuals}
                        title="Hide borders and backgrounds on empty cells (they stay clickable)"
                        onClick={() =>
                            setHideEmptyCellVisuals((value) => !value)
                        }
                    >
                        Hide cell visuals
                    </button>
                    <button
                        type="button"
                        className={`${styles.gridToggleBtn} ${
                            skipEmptyCells ? styles.gridToggleActive : ''
                        }`}
                        aria-pressed={skipEmptyCells}
                        title="Don't render empty cells at all"
                        onClick={() => setSkipEmptyCells((value) => !value)}
                    >
                        Hide empty cells
                    </button>
                    <button
                        type="button"
                        className={`${styles.gridToggleBtn} ${
                            hideEmptyColumns ? styles.gridToggleActive : ''
                        }`}
                        aria-pressed={hideEmptyColumns}
                        title="Only show date columns that contain events"
                        onClick={() => setHideEmptyColumns((value) => !value)}
                    >
                        Hide empty columns
                    </button>
                    <button
                        type="button"
                        className={`${styles.gridToggleBtn} ${
                            hideEmptyLanes ? styles.gridToggleActive : ''
                        }`}
                        aria-pressed={hideEmptyLanes}
                        title="Only show lanes that contain events"
                        onClick={() => setHideEmptyLanes((value) => !value)}
                    >
                        Hide empty lanes
                    </button>
                </div>

                <button
                    className={styles.switchLayoutBtn}
                    onClick={onSwitchLayout}
                >
                    Switch Layout
                </button>
            </div>

            {/* TIMELINE CANVAS — labels live outside the scrolling grid */}
            <div className={styles.gridBody}>
                {/* COLUMN LABELS (detached from the grid) */}
                <div className={styles.gridHeaderRow}>
                    <div className={styles.gridCorner}>Data lanes</div>
                    <div
                        className={styles.colLabelsPane}
                        ref={colLabelsPaneRef}
                    >
                        <div
                            className={styles.colLabelsInner}
                            style={{
                                width: displayColIndexes.length * COLUMN_WIDTH,
                            }}
                        >
                            {displayColIndexes.map((colIndex) => {
                                const period = gridPeriods[colIndex];
                                return (
                                    <div
                                        key={period.key}
                                        onClick={() => handleZoomIn(period)}
                                        title={
                                            granularity !== 'day'
                                                ? `Click to zoom into ${period.label}`
                                                : undefined
                                        }
                                        className={styles.colLabel}
                                        style={{
                                            width: COLUMN_WIDTH,
                                            cursor:
                                                granularity !== 'day'
                                                    ? 'pointer'
                                                    : 'default',
                                            background:
                                                granularity !== 'day'
                                                    ? '#1f2230'
                                                    : '#1b1d24',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                fontSize: 12,
                                            }}
                                        >
                                            {period.label}
                                        </span>
                                        {period.subLabel && (
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    opacity: 0.5,
                                                }}
                                            >
                                                {period.subLabel}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ROW LABELS + GRID */}
                <div className={styles.gridBodyRow}>
                    <div
                        className={styles.rowLabelsPane}
                        ref={rowLabelsPaneRef}
                    >
                        <div className={styles.rowLabelsInner}>
                            {displayRows.map((row) => {
                                const firstEvent = firstEventByLane.get(
                                    row.key
                                );
                                return (
                                    <div
                                        key={row.key}
                                        ref={(el) => {
                                            if (el) {
                                                rowLabelRefs.current.set(
                                                    row.key,
                                                    el
                                                );
                                            } else {
                                                rowLabelRefs.current.delete(
                                                    row.key
                                                );
                                            }
                                        }}
                                        tabIndex={-1}
                                        className={`${styles.rowLabel} ${
                                            focusedRowKey === row.key
                                                ? styles.rowLabelFocused
                                                : ''
                                        }`}
                                        onClick={() => handleRowLabelClick(row)}
                                        title={
                                            firstEvent
                                                ? `Jump to first event: ${firstEvent.event.title}`
                                                : `${row.label} — no events yet`
                                        }
                                    >
                                        <span title={row.label}>
                                            {row.label}
                                        </span>
                                        <small>{row.section}</small>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div
                        className={styles.gridScrollCanvas}
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                    >
                        <div
                            className={styles.timelineGrid}
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    displayColIndexes.length > 0
                                        ? `repeat(${displayColIndexes.length}, ${COLUMN_WIDTH}px)`
                                        : undefined,
                                gridTemplateRows:
                                    displayRows.length > 0
                                        ? `repeat(${displayRows.length}, ${ROW_HEIGHT}px)`
                                        : undefined,
                                gridAutoRows: ROW_HEIGHT,
                                width: 'max-content',
                            }}
                        >
                            {/* DATE CELLS — one row per displayed data lane */}
                            {displayRows.map((row, rowIndex) => (
                                <Fragment key={row.key}>
                                    {displayColIndexes.map(
                                        (colIndex, renderCol) => {
                                            const cellKey = `${colIndex}|${row.key}`;
                                            const cellEvents =
                                                eventsByCell.get(cellKey) ?? [];
                                            const isEmptyCell =
                                                cellEvents.length === 0;

                                            if (skipEmptyCells && isEmptyCell) {
                                                return null;
                                            }

                                            const hideCellChrome =
                                                hideEmptyCellVisuals &&
                                                isEmptyCell;

                                            return (
                                                <div
                                                    key={cellKey}
                                                    onClick={() =>
                                                        handleCellClick(
                                                            colIndex,
                                                            row
                                                        )
                                                    }
                                                    title="Click to add event here"
                                                    style={{
                                                        gridColumn:
                                                            renderCol + 1,
                                                        gridRow: rowIndex + 1,
                                                        width: COLUMN_WIDTH,
                                                        height: ROW_HEIGHT,
                                                        position: 'relative',
                                                        borderRight:
                                                            hideCellChrome
                                                                ? '1px solid transparent'
                                                                : '1px solid rgba(255, 255, 255, 0.05)',
                                                        borderBottom:
                                                            hideCellChrome
                                                                ? '1px solid transparent'
                                                                : '1px solid rgba(255, 255, 255, 0.05)',
                                                        cursor: 'pointer',
                                                        boxSizing: 'border-box',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {cellEvents.map((ev) => {
                                                        const color =
                                                            EVENT_COLORS[
                                                                ev.eventType
                                                            ] ||
                                                            EVENT_COLORS.milestone;
                                                        return (
                                                            <button
                                                                key={ev.id}
                                                                className={`${styles.eventCard} ${styles.eventCardMini} ${
                                                                    focusedEventId ===
                                                                    ev.id
                                                                        ? styles.eventCardFocused
                                                                        : ''
                                                                }`}
                                                                title={`${
                                                                    ev.title
                                                                }${
                                                                    ev.inStoryDate
                                                                        ? ` (${ev.inStoryDate})`
                                                                        : ''
                                                                } — ${
                                                                    EVENT_LABELS[
                                                                        ev
                                                                            .eventType
                                                                    ] ||
                                                                    ev.eventType
                                                                }`}
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    openPanel({
                                                                        kind: 'event',
                                                                        eventId:
                                                                            ev.id,
                                                                        startEditing: false,
                                                                    });
                                                                }}
                                                                onDoubleClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    openPanel({
                                                                        kind: 'event',
                                                                        eventId:
                                                                            ev.id,
                                                                        startEditing: true,
                                                                    });
                                                                }}
                                                                style={{
                                                                    borderLeft: `3px solid ${color}`,
                                                                }}
                                                            >
                                                                <span>
                                                                    {ev.title}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        }
                                    )}
                                </Fragment>
                            ))}
                        </div>
                    </div>

                    {/* EMPTY STATES */}
                    {visibleRows.length === 0 ? (
                        <div className={styles.gridEmptyState}>
                            <p>No data selected</p>
                            <span>
                                Pick entities in the timeline dock below to
                                build data lanes.
                            </span>
                        </div>
                    ) : displayRows.length === 0 ? (
                        <div className={styles.gridEmptyState}>
                            <p>No lanes with events</p>
                            <span>
                                Turn off “Hide empty lanes” or add events to the
                                selected data.
                            </span>
                        </div>
                    ) : hideEmptyColumns && displayColIndexes.length === 0 ? (
                        <div className={styles.gridEmptyState}>
                            <p>No event columns</p>
                            <span>
                                Turn off “Hide empty columns” to show the full
                                date range.
                            </span>
                        </div>
                    ) : null}
                </div>

                {/* FLOATING EVENT PANEL — view/edit a card, edit a tray draft,
                    or create a new event at a clicked cell */}
                {panelOpen && (
                    <div ref={panelRef} style={{ display: 'contents' }}>
                        <TimelineEventPanel
                            key={panelKey}
                            event={panelEvent}
                            draft={panelDraft}
                            createValues={panelCreate}
                            startEditing={
                                panelTarget?.kind === 'event'
                                    ? panelTarget.startEditing
                                    : false
                            }
                            placementHint={
                                panelDraft
                                    ? panelDraft.title.trim() ||
                                      'Untitled Event'
                                    : null
                            }
                            entityOptions={entityOptions}
                            chapterOptions={chapterOptions}
                            onClose={closePanel}
                            onSave={handlePanelSave}
                            onDraftChange={(patch) => {
                                if (panelDraft) {
                                    updateDraft(panelDraft.id, patch);
                                }
                            }}
                            onDiscardDraft={() => {
                                if (panelDraft) discardDraft(panelDraft.id);
                            }}
                            onDelete={handlePanelDelete}
                            onOpenEntity={handlePanelOpenEntity}
                        />
                    </div>
                )}
            </div>

            <TimelineBottomDock
                hasAnySelected={hasAnySelected}
                handleToggleAllOrClear={handleToggleAllOrClear}
                openTabsChecked={openTabsChecked}
                setOpenTabsChecked={setOpenTabsChecked}
                timelineFilters={timelineFilters}
                setTimelineFilters={setTimelineFilters}
                tabs={tabs}
                categoryData={categoryData}
                onAddEvent={handleAddDraft}
                onAutoDetect={onAutoDetect}
                unassignedEvents={drafts.map((draft) => ({
                    id: draft.id,
                    label: draft.title.trim() || 'Untitled Event',
                }))}
                selectedEvent={activeDraftId ?? ''}
                onSelectEvent={handleSelectDraft}
                onDiscardEvent={discardDraft}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
            />
        </div>
    );
}
