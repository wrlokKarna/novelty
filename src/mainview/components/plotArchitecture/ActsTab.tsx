import {
    IconChevronDown,
    IconChevronRight,
    IconGripVertical,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import type { StorySequence } from '../../../shared/types';
import type { Chapter } from '../../../shared/types/project';
import type { StoryScene } from '../../../shared/types/project/manuscript';
import { ChapterCardWrapper } from '../cards/tabs/ChapterCardWrapper';
import { SceneCardWrapper } from '../cards/tabs/SceneCardWrapper';
import { SequenceCardWrapper } from '../cards/tabs/SequenceCardWrapper';
import styles from '../PlotArchitectureView.module.css';
import { usePlotArchitectureContext } from './usePlotArchitecture';

export function ActsTab() {
    const {
        chapters,
        collapsed,
        toggle,
        isCollapsed,
        actHeights,
        resizingActId,
        effectiveCharacters,
        sortedActs,
        sortedChapters,
        sortedSequences,
        scenesUnassigned,
        chaptersOfAct,
        sequencesOfChapter,
        scenesOfSequence,
        scenesOfChapter,
        handleDeleteChapter,
        handleAddSequence,
        handleAddScene,
        handleUpdateScene,
        handleDeleteScene,
        handleMoveScene,
        handleUpdateSequence,
        handleMoveSequence,
        handleDeleteSequence,
        handleAddAct,
        handleAddChapter,
        handleDeleteAct,
        handleUpdateAct,
        toggleAct,
        toggleChapter,
        toggleSequence,
        startActResize,
        cardDropClass,
        insideDropClass,
        startDrag,
        clearDrag,
        dragOverCard,
        dragOverInside,
        dragLeaveTarget,
        dropCard,
        dropInside,
        onNavigateChapter,
    } = usePlotArchitectureContext();

    const renderScene = (scene: StoryScene, index: number) => (
        <SceneCardWrapper
            key={scene.id}
            scene={scene}
            index={index}
            characters={effectiveCharacters}
            chapters={chapters}
            collapsed={isCollapsed('scenes', scene.id)}
            onToggleCollapsed={() => toggle('scenes', scene.id)}
            onChange={handleUpdateScene}
            onRemove={handleDeleteScene}
            onMoveToChapter={(chapterId) =>
                handleMoveScene(scene.id, { chapterId })
            }
            className={cardDropClass('scene', scene.id)}
            onDragStart={(e) => startDrag(e, 'scene', scene.id)}
            onDragEnd={clearDrag}
            onDragOver={(e) => dragOverCard(e, 'scene', scene.id)}
            onDrop={(e) => dropCard(e, 'scene', scene.id)}
            onDragLeave={dragLeaveTarget}
        />
    );

    const renderSequenceCard = (seq: StorySequence) => (
        <SequenceCardWrapper
            key={seq.id}
            sequence={seq}
            chapters={chapters}
            collapsed={collapsed.sequences.includes(seq.id)}
            onToggle={() => toggleSequence(seq.id)}
            onTitleChange={(value) =>
                handleUpdateSequence(seq.id, 'title', value)
            }
            onSummaryChange={(value) =>
                handleUpdateSequence(seq.id, 'summary', value)
            }
            onMoveChapter={(chapterId) => handleMoveSequence(seq.id, chapterId)}
            onDelete={() => handleDeleteSequence(seq.id)}
            onAddScene={() => handleAddScene({ sequenceId: seq.id })}
            className={cardDropClass('sequence', seq.id)}
            onDragStart={(e) => startDrag(e, 'sequence', seq.id)}
            onDragEnd={clearDrag}
            onDragOver={(e) => dragOverCard(e, 'sequence', seq.id)}
            onDrop={(e) => dropCard(e, 'sequence', seq.id)}
            onDragLeave={dragLeaveTarget}
            onScenesDragOver={(e) =>
                dragOverInside(e, 'sequence', seq.id, 'scenes')
            }
            onScenesDrop={(e) => dropInside(e, 'sequence', seq.id, 'scenes')}
        >
            {scenesOfSequence(seq.id).map((scene, idx) =>
                renderScene(scene, idx)
            )}
        </SequenceCardWrapper>
    );

    const renderChapter = (ch: Chapter) => (
        <ChapterCardWrapper
            key={ch.id}
            chapter={ch}
            collapsed={collapsed.chapters.includes(ch.id)}
            onToggle={() => toggleChapter(ch.id)}
            onNavigate={() => onNavigateChapter(ch.id)}
            onDelete={() => handleDeleteChapter(ch.id)}
            onAddSequence={() => handleAddSequence(ch.id)}
            onAddScene={() => handleAddScene({ chapterId: ch.id })}
            className={cardDropClass('chapter', ch.id)}
            onDragStart={(e) => startDrag(e, 'chapter', ch.id)}
            onDragEnd={clearDrag}
            onDragOver={(e) => dragOverCard(e, 'chapter', ch.id)}
            onDrop={(e) => dropCard(e, 'chapter', ch.id)}
            onDragLeave={dragLeaveTarget}
            onSequencesDragOver={(e) =>
                dragOverInside(e, 'chapter', ch.id, 'sequences')
            }
            onSequencesDrop={(e) =>
                dropInside(e, 'chapter', ch.id, 'sequences')
            }
            sequencesContent={sequencesOfChapter(ch.id).map((seq) =>
                renderSequenceCard(seq)
            )}
            onScenesDragOver={(e) =>
                dragOverInside(e, 'chapter', ch.id, 'scenes')
            }
            onScenesDrop={(e) => dropInside(e, 'chapter', ch.id, 'scenes')}
            scenesContent={scenesOfChapter(ch.id).map((scene, idx) =>
                renderScene(scene, idx)
            )}
        />
    );

    return (
        <div className={styles['acts-list']}>
            {sortedActs.length === 0 && (
                <div className={styles['empty-state']}>
                    No acts defined. Add one to structure your story.
                </div>
            )}
            {sortedActs.map((act) => {
                const actChapterCount = chaptersOfAct(act.id).length;
                return (
                    <div
                        key={act.id}
                        className={`${styles['act-card']} ${cardDropClass('act', act.id)}`}
                        onDragOver={(e) => dragOverCard(e, 'act', act.id)}
                        onDrop={(e) => dropCard(e, 'act', act.id)}
                        onDragLeave={dragLeaveTarget}
                    >
                        <div
                            className={styles['act-header']}
                            onClick={() => toggleAct(act.id)}
                        >
                            <span
                                className={styles['drag-handle']}
                                draggable
                                onDragStart={(e) => startDrag(e, 'act', act.id)}
                                onDragEnd={clearDrag}
                            >
                                <IconGripVertical size={16} />
                            </span>
                            {collapsed.acts.includes(act.id) ? (
                                <IconChevronRight size={16} />
                            ) : (
                                <IconChevronDown size={16} />
                            )}
                            <input
                                className={styles['act-title-input']}
                                value={act.title}
                                onChange={(e) =>
                                    handleUpdateAct(
                                        act.id,
                                        'title',
                                        e.target.value
                                    )
                                }
                                onClick={(e) => e.stopPropagation()}
                            />
                            <span className={styles['act-badge']}>
                                {act.status}
                            </span>
                            <span className={styles['act-chapter-count']}>
                                {actChapterCount} chapters
                            </span>
                            <button
                                className={`${styles['icon-btn']} ${styles['icon-btn-sm']}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAct(act.id);
                                }}
                            >
                                <IconTrash size={14} />
                            </button>
                        </div>
                        {!collapsed.acts.includes(act.id) && (
                            <div
                                className={styles['act-body']}
                                data-act-body
                                style={
                                    actHeights[act.id]
                                        ? {
                                              height: `${actHeights[act.id]}px`,
                                          }
                                        : undefined
                                }
                            >
                                <textarea
                                    className={styles['act-summary-input']}
                                    placeholder="Act summary..."
                                    value={act.summary || ''}
                                    onChange={(e) =>
                                        handleUpdateAct(
                                            act.id,
                                            'summary',
                                            e.target.value
                                        )
                                    }
                                    rows={2}
                                />
                                <div
                                    className={`${styles['chapters-list']} ${insideDropClass('act', act.id, 'chapters')}`}
                                    onDragOver={(e) =>
                                        dragOverInside(
                                            e,
                                            'act',
                                            act.id,
                                            'chapters'
                                        )
                                    }
                                    onDrop={(e) =>
                                        dropInside(e, 'act', act.id, 'chapters')
                                    }
                                >
                                    {chaptersOfAct(act.id).map((ch) =>
                                        renderChapter(ch)
                                    )}
                                    <button
                                        className={styles['add-chapter-btn']}
                                        onClick={() => handleAddChapter(act.id)}
                                    >
                                        <IconPlus size={14} /> Add Chapter
                                    </button>
                                </div>
                                <div
                                    className={`${styles['act-resize-handle']} ${resizingActId === act.id ? styles.active : ''}`}
                                    onPointerDown={(e) =>
                                        startActResize(e, act.id)
                                    }
                                    title="Drag to resize"
                                />
                            </div>
                        )}
                    </div>
                );
            })}
            <button className={styles['add-act-btn']} onClick={handleAddAct}>
                <IconPlus size={16} /> Add Act
            </button>

            {sortedChapters.filter((c) => !c.actId).length > 0 && (
                <div
                    className={`${styles['unassigned-section']} ${insideDropClass('unassigned-chapter', null, 'unassigned')}`}
                    onDragOver={(e) =>
                        dragOverInside(
                            e,
                            'unassigned-chapter',
                            null,
                            'unassigned'
                        )
                    }
                    onDrop={(e) =>
                        dropInside(e, 'unassigned-chapter', null, 'unassigned')
                    }
                >
                    <div className={styles['unassigned-header']}>
                        Unassigned Chapters
                    </div>
                    {sortedChapters
                        .filter((c) => !c.actId)
                        .map((ch) => renderChapter(ch))}
                </div>
            )}

            {sortedSequences.filter((s) => !s.chapterId).length > 0 && (
                <div
                    className={`${styles['unassigned-section']} ${insideDropClass('unassigned-sequence', null, 'unassigned')}`}
                    onDragOver={(e) =>
                        dragOverInside(
                            e,
                            'unassigned-sequence',
                            null,
                            'unassigned'
                        )
                    }
                    onDrop={(e) =>
                        dropInside(e, 'unassigned-sequence', null, 'unassigned')
                    }
                >
                    <div className={styles['unassigned-header']}>
                        Unassigned Sequences
                    </div>
                    {sortedSequences
                        .filter((s) => !s.chapterId)
                        .map((seq) => renderSequenceCard(seq))}
                </div>
            )}

            {scenesUnassigned.length > 0 && (
                <div
                    className={`${styles['unassigned-section']} ${insideDropClass('unassigned-scene', null, 'unassigned')}`}
                    onDragOver={(e) =>
                        dragOverInside(
                            e,
                            'unassigned-scene',
                            null,
                            'unassigned'
                        )
                    }
                    onDrop={(e) =>
                        dropInside(e, 'unassigned-scene', null, 'unassigned')
                    }
                >
                    <div className={styles['unassigned-header']}>
                        Unassigned Scenes
                    </div>
                    {scenesUnassigned.map((scene, idx) =>
                        renderScene(scene, idx)
                    )}
                </div>
            )}
        </div>
    );
}
