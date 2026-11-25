import { useState } from 'react';
import {
    IconArrowBackUp,
    IconExternalLink,
    IconPencil,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import type { CompendiumCategory } from '../../shared/types/project/compendium';
import type { StoryBeat } from '../../shared/types/project/manuscript';
import type { TimelineItemDraft } from '../../shared/types/timeline';
import TimelineItemFormFields, {
    EMPTY_ITEM_FORM,
    formValuesFromItem,
    formValuesFromPartial,
    formValuesToPartial,
    type ItemFormValues,
} from './TimelineItemForm';
import styles from './TimelineItemPanel.module.css';

const ITEM_LABELS: Record<string, string> = {
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
    story_beat: 'Story Beat',
    custom: 'Custom',
};

const ITEM_COLORS: Record<string, string> = {
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
    story_beat: '#f59e0b',
    custom: '#888888',
};

export interface TimelineItemPanelProps {
    item: StoryBeat | null;
    draft: TimelineItemDraft | null;
    createValues: Partial<StoryBeat> | null;
    startEditing: boolean;
    /** Title of the tray draft that is armed for placement, if any. */
    placementHint: string | null;
    entityOptions: { id: string; name: string; type: CompendiumCategory }[];
    chapterOptions: { id: string; title: string }[];
    onClose: () => void;
    /** Persist an existing item edit or a create-at-cell. */
    onSave: (values: Partial<StoryBeat>) => void;
    /** Live-update the tray draft as the user types. */
    onDraftChange: (patch: Partial<StoryBeat>) => void;
    onDiscardDraft: () => void;
    onDelete: () => void;
    onOpenEntity: () => void;
    onOpenChapter: () => void;
}

export default function TimelineItemPanel({
    item,
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
}: TimelineItemPanelProps) {
    const isDraft = !!draft;
    const isCreate = !item && !draft && !!createValues;

    const [editing, setEditing] = useState(
        !item || startEditing || isDraft || isCreate
    );
    const [values, setValues] = useState<ItemFormValues>(() => {
        if (item) return formValuesFromItem(item);
        if (draft) {
            return {
                title: draft.title,
                description: draft.description || '',
                inStoryDate: draft.inStoryDate || '',
                dateOrder: draft.dateOrder,
                endInStoryDate: (draft as any).endInStoryDate || '',
                endDateOrder: (draft as any).endDateOrder ?? '',
                eventType: draft.eventType,
                beatType: (draft as any).beatType || 'custom',
                entityId: draft.entityId || '',
                chapterId: draft.chapterId || '',
            };
        }
        if (createValues) return formValuesFromPartial(createValues);
        return EMPTY_ITEM_FORM;
    });

    const accent = item
        ? ITEM_COLORS[item.eventType] || ITEM_COLORS.milestone
        : ITEM_COLORS.milestone;

    function handleCreateChange(patch: Partial<ItemFormValues>) {
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
                endInStoryDate:
                    patch.endInStoryDate !== undefined
                        ? patch.endInStoryDate || null
                        : (values.endInStoryDate || null),
                endDateOrder:
                    patch.endDateOrder !== undefined
                        ? (patch.endDateOrder === '' ? null : Number(patch.endDateOrder))
                        : (values.endDateOrder === '' ? null : Number(values.endDateOrder)),
                eventType: patch.eventType ?? values.eventType,
                beatType: (patch.beatType as any) ?? (values.beatType as any),
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
            } as any);
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
                            ? 'item Details'
                            : isCreate
                              ? 'New item'
                              : 'Edit item'
                        : item?.title || 'item Details'}
                </strong>
                <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="Close item panel"
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
                    <TimelineItemFormFields
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
                        {item && (
                            <button
                                type="button"
                                className={styles.btn}
                                onClick={() => {
                                    setValues(formValuesFromItem(item));
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
                item && (
                    <>
                        <div className={styles.detail}>
                            <div>
                                <span className={styles.label}>Type</span>
                                <p>
                                    {ITEM_LABELS[item.eventType] ||
                                        item.eventType}
                                    {item.beatType && item.beatType !== 'custom'
                                        ? ` (${item.beatType})`
                                        : ''}
                                </p>
                            </div>
                            {(item.inStoryDate || item.endInStoryDate || item.endDateOrder !== null) && (
                                <div>
                                    <span className={styles.label}>Date</span>
                                    <p>
                                        {item.inStoryDate || `Order ${item.dateOrder}`}
                                        {item.endDateOrder !== null && item.endDateOrder !== item.dateOrder
                                            ? ` — ${item.endInStoryDate || `Order ${item.endDateOrder}`}`
                                            : ''}
                                    </p>
                                </div>
                            )}
                            {item.description && (
                                <div className={styles.wide}>
                                    <span className={styles.label}>
                                        Description
                                    </span>
                                    <p>{item.description}</p>
                                </div>
                            )}
                            {item.chapterId && (
                                <div>
                                    <span className={styles.label}>
                                        Chapter
                                    </span>
                                    <p>
                                        {chapterOptions.find(
                                            (c) => c.id === item.chapterId
                                        )?.title || 'Unknown chapter'}
                                    </p>
                                </div>
                            )}
                            {item.entityId && (
                                <div>
                                    <span className={styles.label}>Entity</span>
                                    <p>
                                        {entityOptions.find(
                                            (o) => o.id === item.entityId
                                        )?.name || 'Unknown entity'}
                                    </p>
                                </div>
                            )}
                            {item.autoGenerated && (
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
                            {item.chapterId && (
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
                            {item.entityId && item.entityType && (
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

