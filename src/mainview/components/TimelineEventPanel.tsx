import { useState } from 'react';
import {
    IconArrowBackUp,
    IconExternalLink,
    IconPencil,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import type { CompendiumCategory } from '../../shared/types/project/compendium';
import type { TimelineEvent } from '../../shared/types/project/timeline';
import type { TimelineEventDraft } from '../../shared/types/timeline';
import TimelineEventFormFields, {
    EMPTY_EVENT_FORM,
    formValuesFromEvent,
    formValuesFromPartial,
    formValuesToPartial,
    type EventFormValues,
} from './TimelineEventForm';
import styles from './TimelineEventPanel.module.css';

const EVENT_LABELS: Record<string, string> = {
    chapter: 'Chapter',
    character_introduction: 'Character Introduction',
    character_death: 'Character Death',
    character_transformation: 'Character Transformation',
    organization_founding: 'Organization Founding',
    organization_dissolution: 'Organization Dissolution',
    battle: 'Battle / Conflict',
    relationship: 'Relationship Change',
    travel: 'Travel / Move',
    milestone: 'Milestone',
    custom: 'Custom',
};

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

export interface TimelineEventPanelProps {
    event: TimelineEvent | null;
    draft: TimelineEventDraft | null;
    createValues: Partial<TimelineEvent> | null;
    startEditing: boolean;
    /** Title of the tray draft that is armed for placement, if any. */
    placementHint: string | null;
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
    onClose: () => void;
    /** Persist an existing event edit or a create-at-cell. */
    onSave: (values: Partial<TimelineEvent>) => void;
    /** Live-update the tray draft as the user types. */
    onDraftChange: (patch: Partial<TimelineEvent>) => void;
    onDiscardDraft: () => void;
    onDelete: () => void;
    onOpenEntity: () => void;
    onOpenChapter: () => void;
}

export default function TimelineEventPanel({
    event,
    draft,
    createValues,
    startEditing,
    placementHint,
    entityOptions,
    chapterOptions,
    onClose,
    onSave,
    onDraftChange,
    onDiscardDraft,
    onDelete,
    onOpenEntity,
    onOpenChapter,
}: TimelineEventPanelProps) {
    const isDraft = !!draft;
    const isCreate = !event && !draft && !!createValues;

    const [editing, setEditing] = useState(
        !event || startEditing || isDraft || isCreate
    );
    const [values, setValues] = useState<EventFormValues>(() => {
        if (event) return formValuesFromEvent(event);
        if (draft) {
            return {
                title: draft.title,
                description: draft.description || '',
                inStoryDate: draft.inStoryDate || '',
                dateOrder: draft.dateOrder,
                eventType: draft.eventType,
                entityId: draft.entityId || '',
                chapterId: draft.chapterId || '',
            };
        }
        if (createValues) return formValuesFromPartial(createValues);
        return EMPTY_EVENT_FORM;
    });

    const accent = event
        ? EVENT_COLORS[event.eventType] || EVENT_COLORS.milestone
        : EVENT_COLORS.milestone;

    function handleCreateChange(patch: Partial<EventFormValues>) {
        setValues((prev) => ({ ...prev, ...patch }));
        if (isDraft && draft) {
            onDraftChange({
                title: patch.title ?? values.title,
                description:
                    patch.description !== undefined
                        ? patch.description || null
                        : values.description || null,
                inStoryDate:
                    patch.inStoryDate !== undefined
                        ? patch.inStoryDate || null
                        : values.inStoryDate || null,
                dateOrder: patch.dateOrder ?? values.dateOrder,
                eventType: patch.eventType ?? values.eventType,
                entityId:
                    patch.entityId !== undefined
                        ? patch.entityId || null
                        : values.entityId || null,
                entityType:
                    patch.entityId !== undefined
                        ? (entityOptions.find((o) => o.id === patch.entityId)
                              ?.type ?? null)
                        : draft.entityType,
                chapterId:
                    patch.chapterId !== undefined
                        ? patch.chapterId || null
                        : values.chapterId || null,
            });
        }
    }

    function handleSaveEdit() {
        onSave(formValuesToPartial(values, entityOptions));
    }

    return (
        <div className={styles.panel} style={{ borderTopColor: accent }}>
            <div className={styles.header}>
                <span className={styles.dot} style={{ background: accent }} />
                <strong>
                    {editing
                        ? isDraft
                            ? 'Event Details'
                            : isCreate
                              ? 'New Event'
                              : 'Edit Event'
                        : event?.title || 'Event Details'}
                </strong>
                <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Close event panel"
                    onClick={onClose}
                >
                    <IconX size={14} />
                </button>
            </div>

            {placementHint && (
                <div className={styles.hint}>
                    Click a grid cell to place “{placementHint}”
                </div>
            )}

            {editing ? (
                <>
                    <TimelineEventFormFields
                        values={values}
                        onChange={handleCreateChange}
                        entityOptions={entityOptions}
                        chapterOptions={chapterOptions}
                        compact
                    />
                    <div className={styles.actions}>
                        {isDraft && (
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.danger}`}
                                onClick={onDiscardDraft}
                            >
                                <IconTrash size={13} />
                                Discard
                            </button>
                        )}
                        {!isDraft && !isCreate && (
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.danger}`}
                                onClick={onDelete}
                            >
                                <IconTrash size={13} />
                                Delete
                            </button>
                        )}
                        <span className={styles.spacer} />
                        {event && (
                            <button
                                type="button"
                                className={styles.btn}
                                onClick={() => {
                                    setValues(formValuesFromEvent(event));
                                    setEditing(false);
                                }}
                            >
                                <IconX size={13} />
                                Cancel
                            </button>
                        )}
                        {!isDraft && (
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.primary}`}
                                disabled={!values.title.trim()}
                                onClick={handleSaveEdit}
                            >
                                Save
                            </button>
                        )}
                    </div>
                </>
            ) : (
                event && (
                    <>
                        <div className={styles.detail}>
                            <div>
                                <span className={styles.label}>Type</span>
                                <p>
                                    {EVENT_LABELS[event.eventType] ||
                                        event.eventType}
                                </p>
                            </div>
                            {event.inStoryDate && (
                                <div>
                                    <span className={styles.label}>Date</span>
                                    <p>{event.inStoryDate}</p>
                                </div>
                            )}
                            {event.description && (
                                <div className={styles.wide}>
                                    <span className={styles.label}>
                                        Description
                                    </span>
                                    <p>{event.description}</p>
                                </div>
                            )}
                            {event.chapterId && (
                                <div>
                                    <span className={styles.label}>
                                        Chapter
                                    </span>
                                    <p>
                                        {chapterOptions.find(
                                            (c) => c.id === event.chapterId
                                        )?.title || 'Unknown chapter'}
                                    </p>
                                </div>
                            )}
                            {event.entityId && (
                                <div>
                                    <span className={styles.label}>Entity</span>
                                    <p>
                                        {entityOptions.find(
                                            (o) => o.id === event.entityId
                                        )?.name || 'Unknown entity'}
                                    </p>
                                </div>
                            )}
                            {event.autoGenerated && (
                                <div className={styles.wide}>
                                    <span className={styles.note}>
                                        Auto-generated
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.danger}`}
                                onClick={onDelete}
                            >
                                <IconTrash size={13} />
                                Delete
                            </button>
                            {event.chapterId && (
                                <button
                                    type="button"
                                    className={styles.btn}
                                    title="Open chapter in tab"
                                    aria-label="Open chapter in tab"
                                    onClick={onOpenChapter}
                                >
                                    <IconExternalLink size={13} />
                                    Open chapter
                                </button>
                            )}
                            {event.entityId && event.entityType && (
                                <button
                                    type="button"
                                    className={styles.btn}
                                    title="Open entity in tab"
                                    aria-label="Open entity in tab"
                                    onClick={onOpenEntity}
                                >
                                    <IconExternalLink size={13} />
                                    Open entity
                                </button>
                            )}
                            <span className={styles.spacer} />
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={() => setEditing(true)}
                            >
                                <IconPencil size={13} />
                                Edit
                            </button>
                        </div>
                    </>
                )
            )}

            {isDraft && (
                <div className={styles.footer}>
                    <IconArrowBackUp size={12} />
                    Unassigned — click a cell to place it
                </div>
            )}
        </div>
    );
}
