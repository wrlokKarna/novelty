import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Timeline } from 'vis-timeline';
import { DataSet } from 'vis-data';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { useRPC } from '../../contexts/RPCContext';

import TimelineEventEditor from '../../components/TimelineEventEditor';
import Dialog from '../Dialog';

import type {
    CompendiumCategory,
    CompendiumDataType,
} from '../../../shared/types/project/compendium';
import styles from './TimelineDialog.module.css';
import type { TimelineEvent } from '../../../shared/types/project/timeline';
import type { FileTab } from '@/shared/types/project/templates';
import TimelineBottomDock, {
    getCheckedSectionKeys,
} from '@/mainview/ui/comps/TimelineBottomDock';
import type {
    PlacedEvent,
    //TimeLineChip,
    TimelineDataItem,
    timelineFilterBtn,
} from '@/shared/types/timeline';
import type { ManuscriptDataType } from '@/shared/types/project/manuscript';

const EVENT_COLORS: Record<string, string> = {
    chapter: '#4a9eff',
    character_introduction: '#4ae04a',
    character_death: '#e04a4a',
    character_transformation: '#e0a04a',
    organization_founding: '#d4a853',
    organization_dissolution: '#8b0000',
    battle: '#e04ae0',
    relationship: '#4ae0e0',
    travel: '#a0a0a0',
    milestone: '#e0e04a',
    custom: '#888888',
};

const EVENT_LABELS: Record<string, string> = {
    chapter: 'Chapter',
    character_introduction: 'Intro',
    character_death: 'Death',
    character_transformation: 'Transform',
    organization_founding: 'Founded',
    organization_dissolution: 'Dissolved',
    battle: 'Battle',
    relationship: 'Relationship',
    travel: 'Travel',
    milestone: 'Milestone',
    custom: 'Custom',
};

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

    async function handleSaveEvent(data: Partial<TimelineEvent>) {
        try {
            if (editingEvent) {
                await rpc.request['db:update-timeline-event']({
                    id: editingEvent.id,
                    data: data as any,
                });
            } else {
                await rpc.request['db:create-timeline-event']({
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
            }
            await loadEvents();
        } catch (e) {
            console.error('Failed to save event:', e);
        }
    }

    async function handleDeleteEvent() {
        if (!selectedEvent) return;
        try {
            await rpc.request['db:delete-timeline-event'](selectedEvent.id);
            setSelectedEvent(null);
            await loadEvents();
        } catch (e) {
            console.error('Failed to delete event:', e);
        }
    }

    function handleOpenEntity() {
        if (!selectedEvent) return;
        if (selectedEvent.entityType && selectedEvent.entityId) {
            onOpenEntity(
                selectedEvent.entityId,
                selectedEvent.entityType as CompendiumCategory
            );
            onClose();
        }
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
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}
                        >
                            <div className={styles.timelineToolbar}>
                                <h3>
                                    {loading
                                        ? 'Loading...'
                                        : `${events.length} events`}
                                </h3>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={handleAddEvent}
                                >
                                    + Add Event
                                </button>
                                <button onClick={handleAutoGenerate}>
                                    Auto-Detect
                                </button>
                                {selectedEvent && (
                                    <>
                                        <button
                                            onClick={() =>
                                                handleEditEvent(selectedEvent)
                                            }
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className={styles.dangerBtn}
                                            onClick={handleDeleteEvent}
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                                <button
                                    className={styles.switchLayoutBtn}
                                    style={{ marginLeft: 'auto' }}
                                    onClick={() =>
                                        SetOverhaulToggle(!overhaulToggle)
                                    }
                                >
                                    Switch Layout
                                </button>
                            </div>
                            <div
                                ref={containerRef}
                                className={styles.timelineContainer}
                            />

                            {selectedEvent && (
                                <div className={styles.eventDetail}>
                                    <h3>{selectedEvent.title}</h3>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '16px',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div>
                                            <span className={styles.label}>
                                                Type
                                            </span>
                                            <p>
                                                {EVENT_LABELS[
                                                    selectedEvent.eventType
                                                ] || selectedEvent.eventType}
                                            </p>
                                        </div>
                                        {selectedEvent.inStoryDate && (
                                            <div>
                                                <span className={styles.label}>
                                                    Date
                                                </span>
                                                <p>
                                                    {selectedEvent.inStoryDate}
                                                </p>
                                            </div>
                                        )}
                                        {selectedEvent.description && (
                                            <div>
                                                <span className={styles.label}>
                                                    Description
                                                </span>
                                                <p>
                                                    {selectedEvent.description}
                                                </p>
                                            </div>
                                        )}
                                        {selectedEvent.entityId && (
                                            <div>
                                                <span className={styles.label}>
                                                    Entity
                                                </span>
                                                <p>
                                                    <button
                                                        onClick={
                                                            handleOpenEntity
                                                        }
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#4a9eff',
                                                            cursor: 'pointer',
                                                            padding: 0,
                                                            fontSize: '13px',
                                                        }}
                                                    >
                                                        Open in editor
                                                    </button>
                                                </p>
                                            </div>
                                        )}
                                        {selectedEvent.autoGenerated && (
                                            <div
                                                className={styles.autoGenNotice}
                                            >
                                                Auto-generated
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className={styles.timelineLegend}>
                                {Object.entries(EVENT_LABELS).map(
                                    ([type, label]) => (
                                        <div
                                            key={type}
                                            className={styles.legendItem}
                                        >
                                            <span
                                                className={styles.legendDot}
                                                style={{
                                                    background:
                                                        eventTypeColor(type),
                                                }}
                                            />
                                            <span>{label}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                    {overhaulToggle && (
                        <NewTimeline
                            tabs={tabs}
                            categoryData={categoryData}
                            onSwitchLayout={() =>
                                SetOverhaulToggle(!overhaulToggle)
                            }
                            onAutoDetect={handleAutoGenerate}
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

const COLUMN_WIDTH = 100;
const ROW_HEIGHT = 100;
const BUFFER_SIZE = 10;

// ----------------- COMPONENT -----------------

export function NewTimeline({
    tabs,
    categoryData,
    onSwitchLayout,
    onAutoDetect,
}: {
    tabs: FileTab[];
    categoryData: Record<string, TimelineDataItem[]>;
    onSwitchLayout: () => void;
    onAutoDetect?: () => Promise<number | null>;
}) {
    // Unassigned events waiting in the bottom tray
    const [timelineEvents, setTimeLineEvents] = useState<number[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [openTabsChecked, setOpenTabsChecked] = useState(false);

    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const [maxCol, setMaxCol] = useState<number>(7);
    const [maxRow, setMaxRow] = useState<number>(5);

    // Timeline granularity & anchor date states
    const [granularity, setGranularity] = useState<TimeGranularity>('year');
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [periods, setPeriods] = useState<ColumnPeriod[]>([]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isPrependingRef = useRef(false);

    const [placedEvents, setPlacedEvents] = useState<PlacedEvent[]>([
        { id: 'ev-1', col: 1, row: 2, title: 'Event 1' },
        { id: 'ev-2', col: 2, row: 2, title: 'Event 2' },
        { id: 'ev-3', col: 3, row: 1, title: 'Event 3' },
        { id: 'ev-4', col: 3, row: 3, title: 'Event 4' },
        { id: 'ev-5', col: 4, row: 2, title: 'Event 5' },
        { id: 'ev-6', col: 7, row: 2, title: 'Event 6' },
    ]);

    const [timelineFilters, setTimelineFilters] = useState<timelineFilterBtn[]>(
        [
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
        ]
    );

    // Build timeline column units around anchorDate
    const initializePeriods = useCallback(
        (center: Date, level: TimeGranularity) => {
            const list: ColumnPeriod[] = [];
            for (let i = -BUFFER_SIZE; i <= BUFFER_SIZE; i++) {
                list.push(createPeriod(addUnits(center, level, i), level));
            }
            setPeriods(list);
            setMaxCol(list.length);

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
                }
            });
        },
        []
    );

    useEffect(() => {
        initializePeriods(anchorDate, granularity);
    }, [granularity, anchorDate, initializePeriods]);

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

    // Infinite horizontal scroll: prepends previous periods on the left, appends feature periods on the right
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || periods.length === 0 || isPrependingRef.current)
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
            setMaxCol((prev) => prev + BATCH);

            // Shift event col indices so they keep their timeline positions
            setPlacedEvents((prev) =>
                prev.map((ev) => ({ ...ev, col: ev.col + BATCH }))
            );

            requestAnimationFrame(() => {
                container.scrollLeft += addedWidth;
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
            setMaxCol((prev) => prev + BATCH);
        }
    }, [periods, granularity]);

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

    const handleToggleItem = useCallback((key: string) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

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

    const consumeSelectedEvent = (replacedCardTitle?: string) => {
        const placedNum = Number(selectedEvent);
        setTimeLineEvents((prev) => {
            const next = prev.filter((e) => e !== placedNum);
            if (replacedCardTitle) {
                const replacedNum = parseInt(
                    replacedCardTitle.replace(/\D/g, ''),
                    10
                );
                if (!isNaN(replacedNum) && !next.includes(replacedNum)) {
                    next.push(replacedNum);
                }
            }
            return next;
        });
        setSelectedEvent('');
    };

    // 1. ADD TO EMPTY CELL OR REPLACE EXISTING CARD
    const handlePlaceOrReplace = (col: number, row: number) => {
        if (!selectedEvent) return;

        const existingEvent = placedEvents.find(
            (ev) => ev.col === col && ev.row === row
        );

        setPlacedEvents((prev) => [
            ...prev.filter((ev) => !(ev.col === col && ev.row === row)),
            {
                id: `placed-${Date.now()}`,
                col,
                row,
                title: `Event #${selectedEvent}`,
            },
        ]);

        consumeSelectedEvent(existingEvent?.title);
    };

    // 2. INSERT NEW COLUMN BETWEEN TWO COLUMNS
    const handleInsertColumn = (insertAtCol: number) => {
        if (!selectedEvent) return;

        setPlacedEvents((prev) => [
            ...prev.map((ev) =>
                ev.col >= insertAtCol ? { ...ev, col: ev.col + 1 } : ev
            ),
            {
                id: `placed-${Date.now()}`,
                col: insertAtCol,
                row: 2,
                title: `Event #${selectedEvent}`,
            },
        ]);

        setMaxCol((prev) => prev + 1);
        consumeSelectedEvent();
    };

    // 3. INSERT NEW ROW BETWEEN TWO ROWS
    const handleInsertRow = (insertAtRow: number) => {
        if (!selectedEvent) return;

        setPlacedEvents((prev) => [
            ...prev.map((ev) =>
                ev.row >= insertAtRow ? { ...ev, row: ev.row + 1 } : ev
            ),
            {
                id: `placed-${Date.now()}`,
                col: 2,
                row: insertAtRow,
                title: `Event #${selectedEvent}`,
            },
        ]);

        setMaxRow((prev) => prev + 1);
        consumeSelectedEvent();
    };

    const handleAddEvent = () => {
        const allNumbers = [
            ...timelineEvents,
            ...placedEvents.map(
                (ev) => parseInt(ev.title.replace(/\D/g, ''), 10) || 0
            ),
        ];
        const nextId = allNumbers.length > 0 ? Math.max(...allNumbers) + 1 : 1;
        setTimeLineEvents([...timelineEvents, nextId]);
    };

    const hasEntityFilter = selectedItems.size > 0;
    const matchesEntityFilter = (event: PlacedEvent) =>
        !hasEntityFilter ||
        !event.entityKeys?.length ||
        event.entityKeys.some((key) => selectedItems.has(key));
    const entityMatchCount = hasEntityFilter
        ? placedEvents.filter(
              (event) => event.entityKeys?.length && matchesEntityFilter(event)
          ).length
        : 0;

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

                <button
                    className={styles.switchLayoutBtn}
                    onClick={onSwitchLayout}
                >
                    Switch Layout
                </button>
            </div>

            {/* TIMELINE COLUMN HEADER STRIP (Positioned above the grid canvas) */}
            <div
                className={styles.gridScrollCanvas}
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${maxCol}, ${COLUMN_WIDTH}px)`,
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backgroundColor: '#1b1d24',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        width: 'max-content',
                    }}
                >
                    {periods.map((period) => (
                        <div
                            key={period.key}
                            onClick={() => handleZoomIn(period)}
                            title={
                                granularity !== 'day'
                                    ? `Click to zoom into ${period.label}`
                                    : undefined
                            }
                            style={{
                                width: COLUMN_WIDTH,
                                height: 42,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRight:
                                    '1px solid rgba(255, 255, 255, 0.08)',
                                cursor:
                                    granularity !== 'day'
                                        ? 'pointer'
                                        : 'default',
                                userSelect: 'none',
                                background:
                                    granularity !== 'day'
                                        ? 'rgba(255, 255, 255, 0.03)'
                                        : 'transparent',
                                boxSizing: 'border-box',
                            }}
                        >
                            <span style={{ fontWeight: 600, fontSize: 12 }}>
                                {period.label}
                            </span>
                            {period.subLabel && (
                                <span style={{ fontSize: 10, opacity: 0.5 }}>
                                    {period.subLabel}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div
                    className={`${styles.timelineGrid} ${selectedEvent ? styles.insertActive : ''}`}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${maxCol}, ${COLUMN_WIDTH}px)`,
                        gridTemplateRows: `repeat(${maxRow}, ${ROW_HEIGHT}px)`,
                        position: 'relative',
                        width: 'max-content',
                    }}
                >
                    {/* BACKGROUND GRID CELLS */}
                    {Array.from({ length: maxCol * maxRow }, (_, index) => {
                        const col = (index % maxCol) + 1;
                        const row = Math.floor(index / maxCol) + 1;
                        return (
                            <div
                                key={`cell-${col}-${row}`}
                                onClick={() => handlePlaceOrReplace(col, row)}
                                style={{
                                    gridColumn: col,
                                    gridRow: row,
                                    borderRight:
                                        '1px solid rgba(255, 255, 255, 0.05)',
                                    borderBottom:
                                        '1px solid rgba(255, 255, 255, 0.05)',
                                    cursor: selectedEvent
                                        ? 'pointer'
                                        : 'default',
                                    zIndex: 1,
                                    boxSizing: 'border-box',
                                }}
                            />
                        );
                    })}

                    {/* PLACED EVENT CARDS */}
                    {placedEvents.map((ev) => (
                        <div
                            key={ev.id}
                            className={`${styles.eventCard} ${
                                ev.entityKeys?.length &&
                                !matchesEntityFilter(ev)
                                    ? styles.eventCardFilteredOut
                                    : ''
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlaceOrReplace(ev.col, ev.row);
                            }}
                            style={{
                                gridColumn: `${ev.col}`,
                                gridRow: `${ev.row}`,
                                zIndex: 2,
                                cursor: selectedEvent ? 'pointer' : 'default',
                            }}
                        >
                            <span>{ev.title}</span>
                        </div>
                    ))}

                    {/* VERTICAL COLUMN INSERTION STRIPS */}
                    {selectedEvent &&
                        Array.from(
                            { length: Math.max(0, maxCol - 1) },
                            (_, i) => {
                                const insertColIndex = i + 2;
                                return (
                                    <div
                                        key={`col-split-${i}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInsertColumn(insertColIndex);
                                        }}
                                        title={`Insert column between ${i + 1} and ${i + 2}`}
                                        style={{
                                            gridColumn: i + 1,
                                            gridRow: `1 / span ${maxRow}`,
                                            position: 'relative',
                                            zIndex: 4,
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <div
                                            className={`${styles.insertLine} ${styles.insertCol}`}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: -7,
                                                width: 14,
                                                height: '100%',
                                                cursor: 'col-resize',
                                                pointerEvents: 'auto',
                                                zIndex: 5,
                                            }}
                                        />
                                    </div>
                                );
                            }
                        )}

                    {/* HORIZONTAL ROW INSERTION STRIPS */}
                    {selectedEvent &&
                        Array.from(
                            { length: Math.max(0, maxRow - 1) },
                            (_, i) => {
                                const insertRowIndex = i + 2;
                                return (
                                    <div
                                        key={`row-split-${i}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInsertRow(insertRowIndex);
                                        }}
                                        title={`Insert row between ${i + 1} and ${i + 2}`}
                                        style={{
                                            gridColumn: `1 / span ${maxCol}`,
                                            gridRow: i + 1,
                                            position: 'relative',
                                            zIndex: 4,
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <div
                                            className={`${styles.insertLine} ${styles.insertRow}`}
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                bottom: -7,
                                                width: '100%',
                                                height: 14,
                                                cursor: 'row-resize',
                                                pointerEvents: 'auto',
                                                zIndex: 5,
                                            }}
                                        />
                                    </div>
                                );
                            }
                        )}
                </div>
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
                onAddEvent={handleAddEvent}
                onAutoDetect={onAutoDetect}
                unassignedEvents={timelineEvents}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
            />
        </div>
    );
}
