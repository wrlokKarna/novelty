import { useState, useEffect } from 'react';
import SubDialog from './SubDialog';
import type { TimelineEvent, CompendiumCategory } from '../types/index';

interface TimelineEventEditorProps {
    open: boolean;
    onClose: () => void;
    onSave: (event: Partial<TimelineEvent>) => void;
    event?: TimelineEvent | null;
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
}

const EVENT_TYPES = [
    { value: 'milestone', label: 'Milestone' },
    { value: 'chapter', label: 'Chapter' },
    { value: 'character_introduction', label: 'Character Introduction' },
    { value: 'character_death', label: 'Character Death' },
    { value: 'character_transformation', label: 'Character Transformation' },
    { value: 'organization_founding', label: 'Organization Founding' },
    { value: 'organization_dissolution', label: 'Organization Dissolution' },
    { value: 'battle', label: 'Battle / Conflict' },
    { value: 'relationship', label: 'Relationship Change' },
    { value: 'travel', label: 'Travel / Move' },
    { value: 'custom', label: 'Custom' },
];

export default function TimelineEventEditor({
    open,
    onClose,
    onSave,
    event,
    entityOptions,
    chapterOptions,
}: TimelineEventEditorProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [inStoryDate, setInStoryDate] = useState('');
    const [dateOrder, setDateOrder] = useState(0);
    const [eventType, setEventType] = useState('milestone');
    const [entityId, setEntityId] = useState('');
    const [chapterId, setChapterId] = useState('');

    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setDescription(event.description || '');
            setInStoryDate(event.inStoryDate || '');
            setDateOrder(event.dateOrder);
            setEventType(event.eventType);
            setEntityId(event.entityId || '');
            setChapterId(event.chapterId || '');
        } else {
            setTitle('');
            setDescription('');
            setInStoryDate('');
            setDateOrder(0);
            setEventType('milestone');
            setEntityId('');
            setChapterId('');
        }
    }, [event, open]);

    function handleSave() {
        onSave({
            title,
            description: description || null,
            inStoryDate: inStoryDate || null,
            dateOrder,
            eventType,
            entityId: entityId || null,
            entityType: entityId
                ? (entityOptions.find((o) => o.id === entityId)?.type ?? null)
                : null,
            chapterId: chapterId || null,
        });
        onClose();
    }

    return (
        <SubDialog
            open={open}
            onClose={onClose}
            title={event ? 'Edit Event' : 'New Event'}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minWidth: '400px',
                }}
            >
                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#888',
                        }}
                    >
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Event title"
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#fff',
                            borderRadius: '4px',
                        }}
                    />
                </div>
                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#888',
                        }}
                    >
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Event details..."
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#fff',
                            borderRadius: '4px',
                            resize: 'vertical',
                        }}
                    />
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}
                >
                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '4px',
                                fontSize: '12px',
                                color: '#888',
                            }}
                        >
                            In-Story Date
                        </label>
                        <input
                            type="text"
                            value={inStoryDate}
                            onChange={(e) => setInStoryDate(e.target.value)}
                            placeholder='e.g. "Year 3, Spring"'
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                color: '#fff',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '4px',
                                fontSize: '12px',
                                color: '#888',
                            }}
                        >
                            Sort Order
                        </label>
                        <input
                            type="number"
                            value={dateOrder}
                            onChange={(e) =>
                                setDateOrder(Number(e.target.value))
                            }
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                color: '#fff',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                </div>
                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#888',
                        }}
                    >
                        Event Type
                    </label>
                    <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#fff',
                            borderRadius: '4px',
                        }}
                    >
                        {EVENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#888',
                        }}
                    >
                        Linked Entity (optional)
                    </label>
                    <select
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#fff',
                            borderRadius: '4px',
                        }}
                    >
                        <option value="">None</option>
                        {entityOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name} ({o.type})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '4px',
                            fontSize: '12px',
                            color: '#888',
                        }}
                    >
                        Linked Chapter (optional)
                    </label>
                    <select
                        value={chapterId}
                        onChange={(e) => setChapterId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            color: '#fff',
                            borderRadius: '4px',
                        }}
                    >
                        <option value="">None</option>
                        {chapterOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                        marginTop: '8px',
                    }}
                >
                    <button
                        className="btn"
                        onClick={onClose}
                        style={{ background: '#333' }}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn"
                        onClick={handleSave}
                        disabled={!title.trim()}
                    >
                        Save
                    </button>
                </div>
            </div>
        </SubDialog>
    );
}
