import { useEffect, useRef, useState } from 'react';
import {
    IconCheck,
    IconChevronDown,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import ThreadsAddAccordion from '@/mainview/ui/wrappers/ThreadsAddAccordion';
import styles from '../PlotArchitectureView.module.css';
import BeatDescriptionMentionInput from './BeatDescriptionMentionInput';
import { BEAT_TYPES } from './constants';
import { usePlotArchitectureContext } from './usePlotArchitecture';

const EVENT_TYPES = [
    'story_beat',
    'milestone',
    'chapter',
    'character',
    'location',
    'organization',
    'item',
    'lore',
];

function dateOrderFromInput(date: string): number | null {
    if (!date) return null;
    const d = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    const base = new Date('2000-01-01T00:00:00Z');
    return Math.floor((d.getTime() - base.getTime()) / 86400000);
}

interface CustomSelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    options: CustomSelectOption[];
    onChange: (value: string) => void;
    triggerClassName?: string;
    align?: 'left' | 'right';
    title?: string;
    placeholder?: string;
}

function CustomSelect({
    value,
    options,
    onChange,
    triggerClassName = '',
    align = 'left',
    title,
    placeholder = 'Select...',
}: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div
            ref={containerRef}
            className={styles['custom-select-wrapper']}
            title={title}
        >
            <button
                type="button"
                className={`${styles['custom-select-trigger']} ${triggerClassName} ${open ? styles['custom-select-open'] : ''}`}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className={styles['custom-select-label']}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <IconChevronDown
                    size={12}
                    className={styles['custom-select-chevron']}
                />
            </button>

            {open && (
                <div
                    className={`${styles['custom-select-menu']} ${
                        align === 'right'
                            ? styles['custom-select-menu-right']
                            : ''
                    }`}
                >
                    {options.length === 0 ? (
                        <div className={styles['custom-select-empty']}>
                            No options
                        </div>
                    ) : (
                        options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={`${opt.value}-${opt.label}`}
                                    type="button"
                                    className={`${styles['custom-select-option']} ${
                                        isSelected
                                            ? styles[
                                                  'custom-select-option-selected'
                                              ]
                                            : ''
                                    }`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <span
                                        className={
                                            styles['custom-select-check']
                                        }
                                    >
                                        {isSelected && <IconCheck size={12} />}
                                    </span>
                                    <span>{opt.label}</span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function autoScrollCaretInBox(boxEl: HTMLDivElement | null) {
    if (!boxEl) return;

    requestAnimationFrame(() => {
        const textarea = boxEl.querySelector('textarea');
        if (textarea) {
            const pos = textarea.selectionStart ?? textarea.value.length;
            const textBeforeCaret = textarea.value.slice(0, pos);
            const lineIndex = textBeforeCaret.split('\n').length - 1;
            const computed = window.getComputedStyle(textarea);
            const lineHeight = parseFloat(computed.lineHeight) || 19.5;
            const caretTop = lineIndex * lineHeight;
            const caretBottom = caretTop + lineHeight;
            const visibleHeight = textarea.clientHeight;

            if (caretBottom > textarea.scrollTop + visibleHeight) {
                textarea.scrollTop = caretBottom - visibleHeight;
            } else if (caretTop < textarea.scrollTop) {
                textarea.scrollTop = caretTop;
            }

            // Keep any highlight backdrop/mirror layer synced with textarea scrollTop
            const siblings = boxEl.querySelectorAll('div, pre');
            siblings.forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (
                    htmlEl !== textarea &&
                    htmlEl.scrollHeight > htmlEl.clientHeight
                ) {
                    htmlEl.scrollTop = textarea.scrollTop;
                }
            });
            return;
        }

        const editable = boxEl.querySelector(
            '[contenteditable="true"]'
        ) as HTMLElement | null;
        if (editable) {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0).cloneRange();
            range.collapse(false);

            const rect = range.getBoundingClientRect();
            const containerRect = editable.getBoundingClientRect();

            if (rect.height > 0) {
                if (rect.bottom > containerRect.bottom) {
                    editable.scrollTop += rect.bottom - containerRect.bottom;
                } else if (rect.top < containerRect.top) {
                    editable.scrollTop -= containerRect.top - rect.top;
                }
            } else {
                // Fallback when pressing Enter creates an empty line with 0-height rect
                const tempSpan = document.createElement('span');
                tempSpan.textContent = '\u200b';
                range.insertNode(tempSpan);
                const spanRect = tempSpan.getBoundingClientRect();
                if (spanRect.bottom > containerRect.bottom) {
                    editable.scrollTop +=
                        spanRect.bottom - containerRect.bottom;
                } else if (spanRect.top < containerRect.top) {
                    editable.scrollTop -= containerRect.top - spanRect.top;
                }
                tempSpan.remove();
                editable.normalize();
            }
        }
    });
}

export function StoryBeatsTab() {
    const {
        storyBeats,
        plotThreads,
        chapters,
        effectiveCharacters,
        effectiveLocations,
        effectiveOrganizations,
        effectiveItems,
        effectiveLore,
        pendingEntities,
        knownCategoryMap,
        handleRegisterPending,
        handleRegisterKnownCategory,
        handleRemovePending,
        handleCreateAndOpenEntity,
        handleUpdateBeat,
        handlePatchBeat,
        handleUpdateThread,
        handleDeleteBeat,
        handleAddStoryBeat,
        onNavigateChapter,
        onSelectCharacter,
        onSelectLocation,
        onSelectCategory,
        onSelectSidebarChapter,
        onSelectSidebarEntity,
    } = usePlotArchitectureContext();

    const descBoxRefs = useRef<Record<string, HTMLDivElement | null>>({});

    function addStoryBeat(value: string, beatId: string) {
        plotThreads.map((pt) => {
            if (value === pt.name) {
                handleUpdateThread(
                    pt.id,
                    'linked_beats',
                    JSON.stringify(Array.from(new Set([beatId])))
                );
            }
        });
    }

    const beatTypeOptions: CustomSelectOption[] = BEAT_TYPES.map((bt) => ({
        value: bt,
        label: bt.replace(/-/g, ' '),
    }));

    const eventTypeOptions: CustomSelectOption[] = EVENT_TYPES.map((t) => ({
        value: t,
        label: t,
    }));

    const plotThreadOptions: CustomSelectOption[] = plotThreads.map((pt) => ({
        value: pt.name,
        label: pt.name.replace(/-/g, ' '),
    }));

    return (
        <div className={styles['beats-list']}>
            {storyBeats.length === 0 && (
                <div className={styles['empty-state']}>
                    No story beats defined. Add structural beats like "Inciting
                    Incident" or "Midpoint".
                </div>
            )}
            {storyBeats.map((beat) => {
                const activeThread = plotThreads.find((pt) =>
                    JSON.parse(pt.linked_beats ?? '[]').includes(beat.id)
                );

                return (
                    <div
                        key={beat.id}
                        className={styles['beat-card']}
                        style={{ overflow: 'visible' }}
                    >
                        <div className={styles['beat-header']}>
                            <CustomSelect
                                value={beat.beatType}
                                options={beatTypeOptions}
                                onChange={(val) =>
                                    handleUpdateBeat(beat.id, 'beatType', val)
                                }
                                triggerClassName={styles['beat-type-select']}
                            />

                            <input
                                className={styles['beat-title-input']}
                                value={beat.title}
                                onChange={(e) =>
                                    handleUpdateBeat(
                                        beat.id,
                                        'title',
                                        e.target.value
                                    )
                                }
                            />

                            <CustomSelect
                                value={
                                    activeThread?.name ??
                                    plotThreads[0]?.name ??
                                    ''
                                }
                                options={plotThreadOptions}
                                onChange={(val) => addStoryBeat(val, beat.id)}
                                triggerClassName={styles['beat-thread-select']}
                                align="right"
                            />

                            <button
                                className={`${styles['icon-btn']} ${styles['icon-btn-sm']} ${styles['delete-beat-btn']}`}
                                onClick={() => handleDeleteBeat(beat.id)}
                            >
                                <IconTrash size={14} />
                            </button>
                        </div>

                        <div className={styles['beat-meta-row']}>
                            <input
                                type="date"
                                className={styles['beat-date-input']}
                                value={beat.inStoryDate || ''}
                                onChange={(e) => {
                                    const inStoryDate = e.target.value || null;
                                    const dateOrder = dateOrderFromInput(
                                        e.target.value
                                    );
                                    const patch: any = { inStoryDate };
                                    if (dateOrder !== null)
                                        patch.dateOrder = dateOrder;
                                    if (
                                        beat.endDateOrder != null &&
                                        dateOrder !== null &&
                                        beat.endDateOrder < dateOrder
                                    ) {
                                        patch.endDateOrder = dateOrder;
                                        patch.endInStoryDate = inStoryDate;
                                    }
                                    handlePatchBeat(beat.id, patch);
                                }}
                                title="Start date"
                            />
                            <input
                                type="number"
                                className={styles['beat-order-input']}
                                value={beat.dateOrder ?? 0}
                                onChange={(e) =>
                                    handleUpdateBeat(
                                        beat.id,
                                        'dateOrder',
                                        Number(e.target.value) || 0
                                    )
                                }
                                title="Start order"
                            />
                            <input
                                type="date"
                                className={styles['beat-date-input']}
                                value={beat.endInStoryDate || ''}
                                onChange={(e) => {
                                    const endInStoryDate =
                                        e.target.value || null;
                                    const endDateOrder = dateOrderFromInput(
                                        e.target.value
                                    );
                                    const patch: any = {
                                        endInStoryDate,
                                        endDateOrder,
                                    };
                                    if (
                                        endDateOrder != null &&
                                        endDateOrder < (beat.dateOrder ?? 0)
                                    ) {
                                        patch.dateOrder = endDateOrder;
                                        patch.inStoryDate = endInStoryDate;
                                    }
                                    handlePatchBeat(beat.id, patch);
                                }}
                                title="End date"
                            />
                            <input
                                type="number"
                                className={styles['beat-order-input']}
                                value={beat.endDateOrder ?? ''}
                                onChange={(e) =>
                                    handleUpdateBeat(
                                        beat.id,
                                        'endDateOrder',
                                        e.target.value === ''
                                            ? null
                                            : Number(e.target.value) || 0
                                    )
                                }
                                title="End order"
                            />
                            <CustomSelect
                                value={beat.eventType || 'story_beat'}
                                options={eventTypeOptions}
                                onChange={(val) =>
                                    handleUpdateBeat(beat.id, 'eventType', val)
                                }
                                triggerClassName={styles['beat-event-select']}
                                title="Event type"
                            />
                        </div>

                        <div
                            ref={(el) => {
                                descBoxRefs.current[beat.id] = el;
                            }}
                            className={styles['beat-desc-box']}
                            onKeyUp={() =>
                                autoScrollCaretInBox(
                                    descBoxRefs.current[beat.id]
                                )
                            }
                            onInput={() =>
                                autoScrollCaretInBox(
                                    descBoxRefs.current[beat.id]
                                )
                            }
                            onClick={() =>
                                autoScrollCaretInBox(
                                    descBoxRefs.current[beat.id]
                                )
                            }
                        >
                            <BeatDescriptionMentionInput
                                value={beat.description || ''}
                                onChange={(newVal) => {
                                    handleUpdateBeat(
                                        beat.id,
                                        'description',
                                        newVal
                                    );
                                    autoScrollCaretInBox(
                                        descBoxRefs.current[beat.id]
                                    );
                                }}
                                chapters={chapters}
                                characters={effectiveCharacters}
                                locations={effectiveLocations}
                                organizations={effectiveOrganizations}
                                items={effectiveItems}
                                lore={effectiveLore}
                                pendingEntities={pendingEntities}
                                knownCategoryMap={knownCategoryMap}
                                onRegisterPending={handleRegisterPending}
                                onRegisterKnownCategory={
                                    handleRegisterKnownCategory
                                }
                                onRemovePending={handleRemovePending}
                                onCreateAndOpenEntity={
                                    handleCreateAndOpenEntity
                                }
                                onNavigateChapter={onNavigateChapter}
                                onSelectCharacter={onSelectCharacter}
                                onSelectLocation={onSelectLocation}
                                onSelectCategory={onSelectCategory}
                                onSelectSidebarChapter={onSelectSidebarChapter}
                                onSelectSidebarEntity={onSelectSidebarEntity}
                                placeholder="Description... (Type @ to mention)"
                            />
                        </div>

                        {/*
                            handleUpdateThread(
                                            pt.id,
                                            'linked_beats',
                                            JSON.stringify([
                                                ...JSON.parse(
                                                    pt.linked_beats ?? ''
                                                ),
                                                beat.id,
                                            ])
                                        )
                        */}
                        <div className={styles['beat-threads-row']}>
                            <ThreadsAddAccordion
                                beatId={beat.id}
                                threads={plotThreads}
                            />
                        </div>
                        <div className={styles['beat-chapter']}>
                            {beat.chapterId ? (
                                <span>
                                    Assigned to:{' '}
                                    {chapters.find(
                                        (c) => c.id === beat.chapterId
                                    )?.title || 'Unknown'}
                                </span>
                            ) : (
                                <span className={styles['unassigned']}>
                                    Not assigned to a chapter
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
            <button
                className={styles['add-beat-btn']}
                onClick={handleAddStoryBeat}
            >
                <IconPlus size={16} /> Add Story Beat
            </button>
        </div>
    );
}
