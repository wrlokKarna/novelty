import { IconPlus, IconTrash } from '@tabler/icons-react';
import styles from '../PlotArchitectureView.module.css';
import BeatDescriptionMentionInput from './BeatDescriptionMentionInput';
import { BEAT_TYPES } from './constants';
import { usePlotArchitectureContext } from './usePlotArchitecture';

export function StoryBeatsTab() {
    const {
        storyBeats,
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
        handleDeleteBeat,
        handleAddStoryBeat,
        onNavigateChapter,
        onSelectCharacter,
        onSelectLocation,
        onSelectCategory,
        onSelectSidebarChapter,
        onSelectSidebarEntity,
    } = usePlotArchitectureContext();

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
                        <button
                            className={`${styles['icon-btn']} ${styles['icon-btn-sm']}`}
                            onClick={() => handleDeleteBeat(beat.id)}
                        >
                            <IconTrash size={14} />
                        </button>
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
