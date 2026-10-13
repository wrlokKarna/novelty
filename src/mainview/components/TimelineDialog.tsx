import { useEffect, useRef, useState, useCallback } from 'react';
import { Timeline } from 'vis-timeline';
import { DataSet } from 'vis-data';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { useRPC } from '../contexts/RPCContext';
import type {
    TimelineEvent,
    Character,
    Organization,
    Chapter,
    CompendiumCategory,
} from '../types/index';
import TimelineEventEditor from './TimelineEventEditor';
import Dialog from './Dialog';
import '../ui/timeline.css';

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
    characters: Character[];
    organizations: Organization[];
    chapters: Chapter[];
    onOpenEntity: (id: string, type: CompendiumCategory) => void;
}

export default function TimelineDialog({
    open,
    onClose,
    projectId,
    characters,
    organizations,
    chapters,
    onOpenEntity,
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
        ...characters.map((c) => ({
            id: c.id,
            name: c.name,
            type: 'character' as CompendiumCategory,
        })),
        ...organizations.map((o) => ({
            id: o.id,
            name: o.name,
            type: 'organization' as CompendiumCategory,
        })),
    ];

    const chapterOptions = chapters.map((c) => ({ id: c.id, title: c.title }));

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

        for (const ch of characters) {
            groupsData.push({
                id: `char-${ch.id}`,
                content: ch.name,
                className: 'group-character',
            });
        }

        for (const org of organizations) {
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
    }, [open, events, characters, organizations]);

    async function handleAutoGenerate() {
        if (!projectId) return;
        try {
            await rpc.request['db:auto-generate-timeline-events'](projectId);
            await loadEvents();
        } catch (e) {
            console.error('Failed to auto-generate events:', e);
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

    return (
        <>
            <Dialog open={open} onClose={onClose} title="Timeline" large={true}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                    }}
                >
                    <div className="timelineToolbar">
                        <h3>
                            {loading ? 'Loading...' : `${events.length} events`}
                        </h3>
                        <button className="primaryBtn" onClick={handleAddEvent}>
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
                                    className="dangerBtn"
                                    onClick={handleDeleteEvent}
                                >
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                    <div ref={containerRef} className="timelineContainer" />

                    {selectedEvent && (
                        <div className="eventDetail">
                            <h3>{selectedEvent.title}</h3>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '16px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div>
                                    <span className="label">Type</span>
                                    <p>
                                        {EVENT_LABELS[
                                            selectedEvent.eventType
                                        ] || selectedEvent.eventType}
                                    </p>
                                </div>
                                {selectedEvent.inStoryDate && (
                                    <div>
                                        <span className="label">Date</span>
                                        <p>{selectedEvent.inStoryDate}</p>
                                    </div>
                                )}
                                {selectedEvent.description && (
                                    <div>
                                        <span className="label">
                                            Description
                                        </span>
                                        <p>{selectedEvent.description}</p>
                                    </div>
                                )}
                                {selectedEvent.entityId && (
                                    <div>
                                        <span className="label">Entity</span>
                                        <p>
                                            <button
                                                onClick={handleOpenEntity}
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
                                    <div className="autoGenNotice">
                                        Auto-generated
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="timelineLegend">
                        {Object.entries(EVENT_LABELS).map(([type, label]) => (
                            <div key={type} className="legendItem">
                                <span
                                    className="legendDot"
                                    style={{ background: eventTypeColor(type) }}
                                />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
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
