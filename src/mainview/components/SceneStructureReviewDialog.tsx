import { useState, useCallback } from 'react';
import Dialog from './Dialog';
import {
    IconPlus,
    IconTrash,
    IconEye,
    IconEyeOff,
    IconChevronDown,
    IconChevronRight,
    IconSwords,
} from '@tabler/icons-react';

export interface ReviewScene {
    title: string;
    summary: string;
    setting: string;
    charactersPresent: string[];
    keyEvents: string[];
    conflict: string;
    duration: string;
    included: boolean;
    id?: string;
    diffStatus?: 'new' | 'modified' | 'unchanged' | 'removed';
}

export interface ReviewSequence {
    title: string;
    summary: string;
    sceneIndices: number[];
    included: boolean;
    id?: string;
    diffStatus?: 'new' | 'modified' | 'unchanged' | 'removed';
}

interface Props {
    open: boolean;
    onClose: () => void;
    initialScenes: ReviewScene[];
    initialSequences: ReviewSequence[];
    mode?: 'create' | 'merge' | 'replace';
    onConfirm: (scenes: ReviewScene[], sequences: ReviewSequence[]) => void;
}

function makeScene(): ReviewScene {
    return {
        title: '',
        summary: '',
        setting: '',
        charactersPresent: [],
        keyEvents: [],
        conflict: '',
        duration: '',
        included: true,
    };
}

function makeSequence(): ReviewSequence {
    return {
        title: '',
        summary: '',
        sceneIndices: [],
        included: true,
    };
}

export default function SceneStructureReviewDialog({
    open,
    onClose,
    initialScenes,
    initialSequences,
    mode = 'create',
    onConfirm,
}: Props) {
    const [scenes, setScenes] = useState<ReviewScene[]>(() =>
        initialScenes.map((s) => ({ ...s }))
    );
    const [sequences, setSequences] = useState<ReviewSequence[]>(() =>
        initialSequences.map((s) => ({
            ...s,
            sceneIndices: [...s.sceneIndices],
        }))
    );
    const [expandedScenes, setExpandedScenes] = useState<Set<number>>(
        () => new Set(scenes.map((_, i) => i))
    );
    const [expandedSequences, setExpandedSequences] = useState<Set<number>>(
        () => new Set(sequences.map((_, i) => i))
    );

    const includedSceneCount = scenes.filter((s) => s.included).length;
    const includedSequenceCount = sequences.filter((s) => s.included).length;

    const toggleSceneExpand = useCallback((idx: number) => {
        setExpandedScenes((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }, []);

    const toggleSequenceExpand = useCallback((idx: number) => {
        setExpandedSequences((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }, []);

    const updateScene = useCallback(
        (idx: number, field: keyof ReviewScene, value: unknown) => {
            setScenes((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], [field]: value };
                return next;
            });
        },
        []
    );

    const updateSequence = useCallback(
        (idx: number, field: keyof ReviewSequence, value: unknown) => {
            setSequences((prev) => {
                const next = [...prev];
                next[idx] = { ...next[idx], [field]: value };
                return next;
            });
        },
        []
    );

    const addScene = useCallback(() => {
        setScenes((prev) => [...prev, makeScene()]);
        setExpandedScenes((prev) => new Set([...prev, scenes.length]));
    }, [scenes.length]);

    const removeScene = useCallback((idx: number) => {
        setScenes((prev) => prev.filter((_, i) => i !== idx));
        setSequences((prev) =>
            prev.map((seq) => ({
                ...seq,
                sceneIndices: seq.sceneIndices
                    .filter((si) => si !== idx)
                    .map((si) => (si > idx ? si - 1 : si)),
            }))
        );
        setExpandedScenes((prev) => {
            const next = new Set<number>();
            for (const i of prev) {
                if (i < idx) next.add(i);
                else if (i > idx) next.add(i - 1);
            }
            return next;
        });
    }, []);

    const addSequence = useCallback(() => {
        setSequences((prev) => [...prev, makeSequence()]);
        setExpandedSequences((prev) => new Set([...prev, sequences.length]));
    }, [sequences.length]);

    const removeSequence = useCallback((idx: number) => {
        setSequences((prev) => prev.filter((_, i) => i !== idx));
        setExpandedSequences((prev) => {
            const next = new Set<number>();
            for (const i of prev) {
                if (i < idx) next.add(i);
                else if (i > idx) next.add(i - 1);
            }
            return next;
        });
    }, []);

    const assignSceneToSequence = useCallback(
        (sceneIdx: number, seqIdx: number) => {
            setSequences((prev) =>
                prev.map((seq, i) => {
                    if (i !== seqIdx) return seq;
                    if (seq.sceneIndices.includes(sceneIdx)) return seq;
                    return {
                        ...seq,
                        sceneIndices: [...seq.sceneIndices, sceneIdx].sort(
                            (a, b) => a - b
                        ),
                    };
                })
            );
        },
        []
    );

    const unassignSceneFromSequence = useCallback(
        (sceneIdx: number, seqIdx: number) => {
            setSequences((prev) =>
                prev.map((seq, i) => {
                    if (i !== seqIdx) return seq;
                    return {
                        ...seq,
                        sceneIndices: seq.sceneIndices.filter(
                            (si) => si !== sceneIdx
                        ),
                    };
                })
            );
        },
        []
    );

    const moveSceneInSequence = useCallback(
        (seqIdx: number, fromLocalIdx: number, direction: -1 | 1) => {
            setSequences((prev) => {
                const seq = prev[seqIdx];
                const indices = [...seq.sceneIndices];
                const toLocalIdx = fromLocalIdx + direction;
                if (toLocalIdx < 0 || toLocalIdx >= indices.length) return prev;
                const temp = indices[fromLocalIdx];
                indices[fromLocalIdx] = indices[toLocalIdx];
                indices[toLocalIdx] = temp;
                const next = [...prev];
                next[seqIdx] = { ...seq, sceneIndices: indices };
                return next;
            });
        },
        []
    );

    const moveSequence = useCallback(
        (fromIdx: number, direction: -1 | 1) => {
            const toIdx = fromIdx + direction;
            if (toIdx < 0 || toIdx >= sequences.length) return;
            setSequences((prev) => {
                const next = [...prev];
                const temp = next[fromIdx];
                next[fromIdx] = next[toIdx];
                next[toIdx] = temp;
                return next;
            });
            setExpandedSequences((prev) => {
                const next = new Set<number>();
                for (const i of prev) {
                    if (i === fromIdx) next.add(toIdx);
                    else if (i === toIdx) next.add(fromIdx);
                    else next.add(i);
                }
                return next;
            });
        },
        [sequences.length]
    );

    const addKeyEventToScene = useCallback((sceneIdx: number) => {
        setScenes((prev) => {
            const next = [...prev];
            next[sceneIdx] = {
                ...next[sceneIdx],
                keyEvents: [...next[sceneIdx].keyEvents, ''],
            };
            return next;
        });
    }, []);

    const updateSceneKeyEvent = useCallback(
        (sceneIdx: number, eventIdx: number, value: string) => {
            setScenes((prev) => {
                const next = [...prev];
                const events = [...next[sceneIdx].keyEvents];
                events[eventIdx] = value;
                next[sceneIdx] = { ...next[sceneIdx], keyEvents: events };
                return next;
            });
        },
        []
    );

    const removeSceneKeyEvent = useCallback(
        (sceneIdx: number, eventIdx: number) => {
            setScenes((prev) => {
                const next = [...prev];
                next[sceneIdx] = {
                    ...next[sceneIdx],
                    keyEvents: next[sceneIdx].keyEvents.filter(
                        (_, i) => i !== eventIdx
                    ),
                };
                return next;
            });
        },
        []
    );

    const assignedSceneIndices = new Set(
        sequences.flatMap((seq) => seq.sceneIndices)
    );

    const unassignedScenes = scenes
        .map((s, i) => ({ scene: s, idx: i }))
        .filter(({ idx }) => !assignedSceneIndices.has(idx));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Review Chapter Structure"
            large
        >
            <div className="structure-review-dialog">
                <div className="structure-review-summary">
                    {includedSceneCount} scene
                    {includedSceneCount !== 1 ? 's' : ''}
                    {' · '}
                    {includedSequenceCount} sequence
                    {includedSequenceCount !== 1 ? 's' : ''}
                    {' to add'}
                </div>

                {mode === 'replace' && (
                    <div className="structure-review-warning">
                        This will replace all existing chapter structure.
                    </div>
                )}

                {sequences.length > 0 && (
                    <div className="structure-review-section">
                        <div className="structure-review-section-header">
                            <IconSwords size={16} />
                            <span>Sequences</span>
                        </div>
                        {sequences.map((seq, seqIdx) => (
                            <div
                                key={seqIdx}
                                className={`structure-review-card sequence-card ${!seq.included ? 'excluded' : ''}`}
                            >
                                <div className="structure-review-card-header">
                                    <button
                                        className="collapse-toggle"
                                        onClick={() =>
                                            toggleSequenceExpand(seqIdx)
                                        }
                                    >
                                        {expandedSequences.has(seqIdx) ? (
                                            <IconChevronDown size={16} />
                                        ) : (
                                            <IconChevronRight size={16} />
                                        )}
                                    </button>
                                    <span className="item-number">
                                        Seq {seqIdx + 1}
                                        {mode === 'merge' &&
                                            seq.diffStatus === 'new' && (
                                                <span className="diff-badge diff-new">
                                                    new
                                                </span>
                                            )}
                                        {mode === 'merge' &&
                                            seq.diffStatus === 'modified' && (
                                                <span className="diff-badge diff-modified">
                                                    modified
                                                </span>
                                            )}
                                        {mode === 'merge' &&
                                            seq.diffStatus === 'removed' && (
                                                <span className="diff-badge diff-removed">
                                                    removed
                                                </span>
                                            )}
                                    </span>
                                    <input
                                        className="structure-review-title-input"
                                        value={seq.title}
                                        onChange={(e) =>
                                            updateSequence(
                                                seqIdx,
                                                'title',
                                                e.target.value
                                            )
                                        }
                                        placeholder="Sequence title..."
                                    />
                                    <div className="structure-review-card-actions">
                                        {seqIdx > 0 && (
                                            <button
                                                className="icon-btn icon-btn-sm"
                                                onClick={() =>
                                                    moveSequence(seqIdx, -1)
                                                }
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                        )}
                                        {seqIdx < sequences.length - 1 && (
                                            <button
                                                className="icon-btn icon-btn-sm"
                                                onClick={() =>
                                                    moveSequence(seqIdx, 1)
                                                }
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                        )}
                                        <button
                                            className="icon-btn icon-btn-sm"
                                            onClick={() =>
                                                updateSequence(
                                                    seqIdx,
                                                    'included',
                                                    !seq.included
                                                )
                                            }
                                            title={
                                                seq.included
                                                    ? 'Exclude'
                                                    : 'Include'
                                            }
                                        >
                                            {seq.included ? (
                                                <IconEye size={14} />
                                            ) : (
                                                <IconEyeOff size={14} />
                                            )}
                                        </button>
                                        <button
                                            className="icon-btn icon-btn-sm"
                                            onClick={() =>
                                                removeSequence(seqIdx)
                                            }
                                            title="Remove sequence"
                                        >
                                            <IconTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                                {expandedSequences.has(seqIdx) && (
                                    <div className="structure-review-card-body">
                                        <textarea
                                            className="structure-review-textarea"
                                            value={seq.summary}
                                            onChange={(e) =>
                                                updateSequence(
                                                    seqIdx,
                                                    'summary',
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Sequence summary..."
                                            rows={2}
                                        />
                                        <div className="structure-review-assigned-scenes">
                                            <label>Assigned scenes:</label>
                                            {seq.sceneIndices.length === 0 ? (
                                                <span className="no-items-hint">
                                                    No scenes assigned
                                                </span>
                                            ) : (
                                                seq.sceneIndices.map(
                                                    (sceneIdx, localIdx) => (
                                                        <div
                                                            key={`${sceneIdx}-${localIdx}`}
                                                            className="assigned-scene-row"
                                                        >
                                                            <span className="assigned-scene-label">
                                                                {scenes[
                                                                    sceneIdx
                                                                ]
                                                                    ? `Scene ${sceneIdx + 1}: ${scenes[sceneIdx].title || '(untitled)'}`
                                                                    : `Scene ${sceneIdx + 1}`}
                                                            </span>
                                                            <div className="assigned-scene-actions">
                                                                {localIdx >
                                                                    0 && (
                                                                    <button
                                                                        className="icon-btn icon-btn-sm"
                                                                        onClick={() =>
                                                                            moveSceneInSequence(
                                                                                seqIdx,
                                                                                localIdx,
                                                                                -1
                                                                            )
                                                                        }
                                                                        title="Move up"
                                                                    >
                                                                        ↑
                                                                    </button>
                                                                )}
                                                                {localIdx <
                                                                    seq
                                                                        .sceneIndices
                                                                        .length -
                                                                        1 && (
                                                                    <button
                                                                        className="icon-btn icon-btn-sm"
                                                                        onClick={() =>
                                                                            moveSceneInSequence(
                                                                                seqIdx,
                                                                                localIdx,
                                                                                1
                                                                            )
                                                                        }
                                                                        title="Move down"
                                                                    >
                                                                        ↓
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="icon-btn icon-btn-sm"
                                                                    onClick={() =>
                                                                        unassignSceneFromSequence(
                                                                            sceneIdx,
                                                                            seqIdx
                                                                        )
                                                                    }
                                                                    title="Unassign"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button
                            className="structure-review-add-btn"
                            onClick={addSequence}
                        >
                            <IconPlus size={14} /> Add Sequence
                        </button>
                    </div>
                )}

                <div className="structure-review-section">
                    <div className="structure-review-section-header">
                        <span>Scenes</span>
                        {sequences.length > 0 && (
                            <span className="section-subtitle">
                                {unassignedScenes.length} unassigned
                            </span>
                        )}
                    </div>

                    {unassignedScenes.length > 0 && sequences.length > 0 && (
                        <div className="unassigned-label">
                            Unassigned scenes:
                        </div>
                    )}

                    {scenes.map((scene, sceneIdx) => {
                        const isAssigned = assignedSceneIndices.has(sceneIdx);
                        if (isAssigned && sequences.length > 0) return null;

                        return (
                            <div
                                key={sceneIdx}
                                className={`structure-review-card scene-card ${!scene.included ? 'excluded' : ''}`}
                            >
                                <div className="structure-review-card-header">
                                    <button
                                        className="collapse-toggle"
                                        onClick={() =>
                                            toggleSceneExpand(sceneIdx)
                                        }
                                    >
                                        {expandedScenes.has(sceneIdx) ? (
                                            <IconChevronDown size={16} />
                                        ) : (
                                            <IconChevronRight size={16} />
                                        )}
                                    </button>
                                    <span className="item-number">
                                        Scene {sceneIdx + 1}
                                        {mode === 'merge' &&
                                            scene.diffStatus === 'new' && (
                                                <span className="diff-badge diff-new">
                                                    new
                                                </span>
                                            )}
                                        {mode === 'merge' &&
                                            scene.diffStatus === 'modified' && (
                                                <span className="diff-badge diff-modified">
                                                    modified
                                                </span>
                                            )}
                                        {mode === 'merge' &&
                                            scene.diffStatus === 'removed' && (
                                                <span className="diff-badge diff-removed">
                                                    removed
                                                </span>
                                            )}
                                    </span>
                                    <input
                                        className="structure-review-title-input"
                                        value={scene.title}
                                        onChange={(e) =>
                                            updateScene(
                                                sceneIdx,
                                                'title',
                                                e.target.value
                                            )
                                        }
                                        placeholder="Scene title..."
                                    />
                                    <div className="structure-review-card-actions">
                                        {sequences.length > 0 && (
                                            <select
                                                className="structure-review-assign-select"
                                                value=""
                                                onChange={(e) => {
                                                    const target = Number(
                                                        e.target.value
                                                    );
                                                    if (!isNaN(target)) {
                                                        assignSceneToSequence(
                                                            sceneIdx,
                                                            target
                                                        );
                                                    }
                                                }}
                                                title="Assign to sequence"
                                            >
                                                <option value="" disabled>
                                                    Assign...
                                                </option>
                                                {sequences.map((seq, i) => (
                                                    <option key={i} value={i}>
                                                        Seq {i + 1}:{' '}
                                                        {seq.title ||
                                                            '(untitled)'}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            className="icon-btn icon-btn-sm"
                                            onClick={() =>
                                                updateScene(
                                                    sceneIdx,
                                                    'included',
                                                    !scene.included
                                                )
                                            }
                                            title={
                                                scene.included
                                                    ? 'Exclude'
                                                    : 'Include'
                                            }
                                        >
                                            {scene.included ? (
                                                <IconEye size={14} />
                                            ) : (
                                                <IconEyeOff size={14} />
                                            )}
                                        </button>
                                        <button
                                            className="icon-btn icon-btn-sm"
                                            onClick={() =>
                                                removeScene(sceneIdx)
                                            }
                                            title="Remove scene"
                                        >
                                            <IconTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                                {expandedScenes.has(sceneIdx) && (
                                    <div className="structure-review-card-body">
                                        <textarea
                                            className="structure-review-textarea"
                                            value={scene.summary}
                                            onChange={(e) =>
                                                updateScene(
                                                    sceneIdx,
                                                    'summary',
                                                    e.target.value
                                                )
                                            }
                                            placeholder="What happens in this scene?"
                                            rows={2}
                                        />
                                        <div className="structure-review-fields">
                                            <input
                                                placeholder="Setting (e.g. The Throne Room)"
                                                value={scene.setting}
                                                onChange={(e) =>
                                                    updateScene(
                                                        sceneIdx,
                                                        'setting',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <input
                                                placeholder="Duration (e.g. 10 minutes)"
                                                value={scene.duration}
                                                onChange={(e) =>
                                                    updateScene(
                                                        sceneIdx,
                                                        'duration',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <input
                                                placeholder="Core conflict..."
                                                value={scene.conflict}
                                                onChange={(e) =>
                                                    updateScene(
                                                        sceneIdx,
                                                        'conflict',
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <input
                                                placeholder="Characters present (comma-separated)"
                                                value={scene.charactersPresent.join(
                                                    ', '
                                                )}
                                                onChange={(e) =>
                                                    updateScene(
                                                        sceneIdx,
                                                        'charactersPresent',
                                                        e.target.value
                                                            .split(',')
                                                            .map((s) =>
                                                                s.trim()
                                                            )
                                                            .filter(Boolean)
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="structure-review-key-events">
                                            <label>Key events:</label>
                                            {scene.keyEvents.map(
                                                (event, eventIdx) => (
                                                    <div
                                                        key={eventIdx}
                                                        className="key-event-row"
                                                    >
                                                        <input
                                                            value={event}
                                                            onChange={(e) =>
                                                                updateSceneKeyEvent(
                                                                    sceneIdx,
                                                                    eventIdx,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="e.g. Protagonist discovers the hidden letter"
                                                        />
                                                        <button
                                                            className="icon-btn icon-btn-sm"
                                                            onClick={() =>
                                                                removeSceneKeyEvent(
                                                                    sceneIdx,
                                                                    eventIdx
                                                                )
                                                            }
                                                        >
                                                            <IconTrash
                                                                size={12}
                                                            />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                            <button
                                                className="icon-btn"
                                                onClick={() =>
                                                    addKeyEventToScene(sceneIdx)
                                                }
                                            >
                                                <IconPlus size={12} /> Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button
                        className="structure-review-add-btn"
                        onClick={addScene}
                    >
                        <IconPlus size={14} /> Add Scene
                    </button>
                </div>

                <div className="structure-review-footer">
                    <button
                        className="structure-review-cancel-btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="structure-review-confirm-btn"
                        onClick={() => onConfirm(scenes, sequences)}
                        disabled={
                            includedSceneCount === 0 &&
                            includedSequenceCount === 0
                        }
                    >
                        Add{' '}
                        {includedSceneCount > 0 &&
                            `${includedSceneCount} Scene${includedSceneCount !== 1 ? 's' : ''}`}
                        {includedSceneCount > 0 &&
                            includedSequenceCount > 0 &&
                            ', '}
                        {includedSequenceCount > 0 &&
                            `${includedSequenceCount} Sequence${includedSequenceCount !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
