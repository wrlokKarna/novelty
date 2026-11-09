import type { TimelineEvent } from '../../shared/types/project/timeline';
import type { CompendiumCategory } from '../../shared/types/project/compendium';

export const EVENT_TYPES = [
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

export type EventFormValues = {
    title: string;
    description: string;
    inStoryDate: string;
    dateOrder: number;
    eventType: string;
    entityId: string;
    chapterId: string;
};

export const EMPTY_EVENT_FORM: EventFormValues = {
    title: '',
    description: '',
    inStoryDate: '',
    dateOrder: 0,
    eventType: 'milestone',
    entityId: '',
    chapterId: '',
};

export function formValuesFromEvent(ev: TimelineEvent): EventFormValues {
    return {
        title: ev.title,
        description: ev.description || '',
        inStoryDate: ev.inStoryDate || '',
        dateOrder: ev.dateOrder,
        eventType: ev.eventType,
        entityId: ev.entityId || '',
        chapterId: ev.chapterId || '',
    };
}

export function formValuesFromPartial(
    draft: Partial<TimelineEvent>
): EventFormValues {
    return {
        title: draft.title ?? '',
        description: draft.description ?? '',
        inStoryDate: draft.inStoryDate ?? '',
        dateOrder: draft.dateOrder ?? 0,
        eventType: draft.eventType ?? 'milestone',
        entityId: draft.entityId ?? '',
        chapterId: draft.chapterId ?? '',
    };
}

export function formValuesToPartial(
    values: EventFormValues,
    entityOptions: { id: string; name: string; type: CompendiumCategory }[]
): Partial<TimelineEvent> {
    return {
        title: values.title,
        description: values.description || null,
        inStoryDate: values.inStoryDate || null,
        dateOrder: values.dateOrder,
        eventType: values.eventType,
        entityId: values.entityId || null,
        entityType: values.entityId
            ? (entityOptions.find((o) => o.id === values.entityId)?.type ??
              null)
            : null,
        chapterId: values.chapterId || null,
    };
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    color: '#888',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#fff',
    borderRadius: '4px',
    boxSizing: 'border-box',
};

interface TimelineEventFormFieldsProps {
    values: EventFormValues;
    onChange: (patch: Partial<EventFormValues>) => void;
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
    compact?: boolean;
}

export default function TimelineEventFormFields({
    values,
    onChange,
    entityOptions,
    chapterOptions,
    compact = false,
}: TimelineEventFormFieldsProps) {
    const descriptionRows = compact ? 2 : 3;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: compact ? '8px' : '12px',
            }}
        >
            <div>
                <label style={labelStyle}>Title</label>
                <input
                    type="text"
                    value={values.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="Event title"
                    style={inputStyle}
                />
            </div>
            <div>
                <label style={labelStyle}>Description</label>
                <textarea
                    value={values.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder="Event details..."
                    rows={descriptionRows}
                    style={{ ...inputStyle, resize: 'vertical' }}
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
                    <label style={labelStyle}>In-Story Date</label>
                    <input
                        type="text"
                        value={values.inStoryDate}
                        onChange={(e) =>
                            onChange({ inStoryDate: e.target.value })
                        }
                        placeholder='e.g. "Year 3, Spring"'
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Sort Order</label>
                    <input
                        type="number"
                        value={values.dateOrder}
                        onChange={(e) =>
                            onChange({ dateOrder: Number(e.target.value) })
                        }
                        style={inputStyle}
                    />
                </div>
            </div>
            <div>
                <label style={labelStyle}>Event Type</label>
                <select
                    value={values.eventType}
                    onChange={(e) => onChange({ eventType: e.target.value })}
                    style={inputStyle}
                >
                    {EVENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label style={labelStyle}>Linked Entity (optional)</label>
                <select
                    value={values.entityId}
                    onChange={(e) => onChange({ entityId: e.target.value })}
                    style={inputStyle}
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
                <label style={labelStyle}>Linked Chapter (optional)</label>
                <select
                    value={values.chapterId}
                    onChange={(e) => onChange({ chapterId: e.target.value })}
                    style={inputStyle}
                >
                    <option value="">None</option>
                    {chapterOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
