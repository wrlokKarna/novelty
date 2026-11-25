import { IconPlus, IconTrash } from '@tabler/icons-react';
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
        handleUpdateThread,
        handleDeleteBeat,
        handleAddStoryBeat,
        onNavigateChapter,
        onSelectCharacter,
        onSelectLocation,
        onSelectCategory,
        onSelectSidebarChapter,
        onSelectSidebarEntity,
        loadData,
    } = usePlotArchitectureContext();

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

    return (
        <div className={styles['beats-list']}>
            {storyBeats.length === 0 && (
                <div className={styles['empty-state']}>
                    No story beats defined. Add structural beats like "Inciting
                    Incident" or "Midpoint".
                </div>
            )}
            {storyBeats.map((beat) => (
                <div
                    key={beat.id}
                    className={styles['beat-card']}
                    style={{ overflow: 'visible' }}
                >
                    <div className={styles['beat-header']}>
                        <select
                            value={beat.beatType}
                            onChange={(e) =>
                                handleUpdateBeat(
                                    beat.id,
                                    'beatType',
                                    e.target.value
                                )
                            }
                            className={styles['beat-type-select']}
                        >
                            {BEAT_TYPES.map((bt) => (
                                <option key={bt} value={bt}>
                                    {bt.replace(/-/g, ' ')}
                                </option>
                            ))}
                        </select>
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

                        <select
                            onChange={(e) =>
                                addStoryBeat(e.target.value, beat.id)
                            }
                        >
                            {plotThreads.map((pt) => (
                                <option key={pt.id}>{pt.name.replace(/-/g, ' ')}</option>
                            ))}
                        </select>

                        <button
                            className={`${styles['icon-btn']} ${styles['icon-btn-sm']}`}
                            onClick={() => handleDeleteBeat(beat.id)}
                        >
                            <IconTrash size={14} />
                        </button>
                    </div>
                    <div className={styles['beat-header']} style={{ gap: 8, flexWrap: 'wrap' }}>
                        <input
                            type="date"
                            value={beat.inStoryDate || ''}
                            onChange={(e) => handleUpdateBeat(beat.id, 'inStoryDate', e.target.value || null)}
                            title="Start date"
                        />
                        <input
                            type="number"
                            value={beat.dateOrder ?? 0}
                            onChange={(e) => handleUpdateBeat(beat.id, 'dateOrder', Number(e.target.value) || 0)}
                            title="Start order"
                            style={{ width: 88 }}
                        />
                        <input
                            type="date"
                            value={beat.endInStoryDate || ''}
                            onChange={(e) => handleUpdateBeat(beat.id, 'endInStoryDate', e.target.value || null)}
                            title="End date"
                        />
                        <input
                            type="number"
                            value={beat.endDateOrder ?? ''}
                            onChange={(e) => handleUpdateBeat(beat.id, 'endDateOrder', e.target.value === '' ? null : Number(e.target.value) || 0)}
                            title="End order"
                            style={{ width: 88 }}
                        />
                        <select
                            value={beat.eventType || 'story_beat'}
                            onChange={(e) => handleUpdateBeat(beat.id, 'eventType', e.target.value)}
                            title="Event type"
                        >
                            {EVENT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <BeatDescriptionMentionInput
                        value={beat.description || ''}
                        onChange={(newVal) =>
                            handleUpdateBeat(beat.id, 'description', newVal)
                        }
                        chapters={chapters}
                        characters={effectiveCharacters}
                        locations={effectiveLocations}
                        organizations={effectiveOrganizations}
                        items={effectiveItems}
                        lore={effectiveLore}
                        pendingEntities={pendingEntities}
                        knownCategoryMap={knownCategoryMap}
                        onRegisterPending={handleRegisterPending}
                        onRegisterKnownCategory={handleRegisterKnownCategory}
                        onRemovePending={handleRemovePending}
                        onCreateAndOpenEntity={handleCreateAndOpenEntity}
                        onNavigateChapter={onNavigateChapter}
                        onSelectCharacter={onSelectCharacter}
                        onSelectLocation={onSelectLocation}
                        onSelectCategory={onSelectCategory}
                        onSelectSidebarChapter={onSelectSidebarChapter}
                        onSelectSidebarEntity={onSelectSidebarEntity}
                        placeholder="Description... (Type @ to mention)"
                    />
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
                    <div className="">
                        {plotThreads.map((pt) => (
                            <button
                                className={`${JSON.parse(pt.linked_beats ?? '[]').includes(beat.id) ? styles.linked : ''}`}
                                onClick={() => {
                                    console.log(
                                        'ptId',
                                        pt.id,
                                        'pt.linkedbeats',
                                        pt.linked_beats
                                    );
                                    const prevBeats = JSON.parse(
                                        pt.linked_beats ?? '[]'
                                    ) as string[];
                                    handleUpdateThread(
                                        pt.id,
                                        'linked_beats',
                                        JSON.stringify(
                                            Array.from(
                                                new Set([...prevBeats, beat.id])
                                            )
                                        )
                                    );
                                    loadData();
                                }}
                            >
                                {pt.name}
                            </button>
                        ))}
                    </div>
                    <div className={styles['beat-chapter']}>
                        {beat.chapterId ? (
                            <span>
                                Assigned to:{' '}
                                {chapters.find((c) => c.id === beat.chapterId)
                                    ?.title || 'Unknown'}
                            </span>
                        ) : (
                            <span className={styles['unassigned']}>
                                Not assigned to a chapter
                            </span>
                        )}
                    </div>
                </div>
            ))}
            <button
                className={styles['add-beat-btn']}
                onClick={handleAddStoryBeat}
            >
                <IconPlus size={16} /> Add Story Beat
            </button>
        </div>
    );
}
