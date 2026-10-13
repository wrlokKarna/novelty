import { useState, useCallback, useMemo, Fragment } from 'react';
import type { Character, StoryScene, StorySequence } from '../types/index';
import {
    IconPlus,
    IconTrash,
    IconGripVertical,
    IconChevronDown,
    IconChevronRight,
} from '@tabler/icons-react';
import SceneCardEditor from './SceneCardEditor';
import type { CollapseState } from '../hooks/useCollapseState';

export type DragItemType = 'scene' | 'sequence';

export interface DropTarget {
    type: 'before' | 'after' | 'inside';
    containerKey: string | null;
    index: number;
}

export type StructureItem = {
    id: string;
    type: 'sequence' | 'scene';
    displayOrder: number;
    sequenceId?: string | null;
};

interface Props {
    projectId: string;
    characters: Character[];
    scenes: StoryScene[];
    sequences: StorySequence[];
    collapsed: CollapseState;
    toggle: (kind: 'sequences' | 'scenes', id: string) => void;
    onSceneCreate: (sequenceId: string | null) => void;
    onSceneDelete: (id: string) => void;
    onSceneUpdate: (id: string, field: string, value: unknown) => void;
    onSceneReorder: (
        targetContainer: string | null,
        orderedIds: string[],
        movedSceneId?: string,
        sourceContainer?: string | null
    ) => void;
    onSequenceCreate: () => void;
    onSequenceDelete: (id: string) => void;
    onSequenceUpdate: (id: string, field: string, value: unknown) => void;
    onStructureReorder?: (unifiedItems: StructureItem[]) => void;
}

type UnifiedItem =
    | {
          kind: 'sequence';
          id: string;
          seq: StorySequence;
          displayOrder: number;
      }
    | {
          kind: 'scene';
          id: string;
          scene: StoryScene;
          displayOrder: number;
      };

function DropZoneDiv({
    className,
    onDragOver,
    onDragLeave,
    onDrop,
}: {
    className: string;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: () => void;
}) {
    return (
        <div
            className={className}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        />
    );
}

export default function ChapterStructureEditor({
    characters,
    scenes,
    sequences,
    collapsed,
    toggle,
    onSceneCreate,
    onSceneDelete,
    onSceneUpdate,
    onSceneReorder,
    onSequenceCreate,
    onSequenceDelete,
    onSequenceUpdate,
    onStructureReorder,
}: Props) {
    const [dragItemType, setDragItemType] = useState<DragItemType | null>(null);
    const [dragItemId, setDragItemId] = useState<string | null>(null);
    const [dragSourceContainer, setDragSourceContainer] = useState<
        string | null
    >(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

    const sortedSequences = [...sequences].sort(
        (a, b) => a.displayOrder - b.displayOrder
    );
    const directScenes = scenes
        .filter((s) => !s.sequenceId)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    const scenesOfSequence = (seqId: string) =>
        scenes
            .filter((s) => s.sequenceId === seqId)
            .sort((a, b) => a.orderIndex - b.orderIndex);

    const unifiedItems: UnifiedItem[] = useMemo(() => {
        const items: UnifiedItem[] = [
            ...sortedSequences.map((s) => ({
                kind: 'sequence' as const,
                id: s.id,
                seq: s,
                displayOrder: s.displayOrder,
            })),
            ...directScenes.map((s) => ({
                kind: 'scene' as const,
                id: s.id,
                scene: s,
                displayOrder: s.displayOrder,
            })),
        ];
        return items.sort((a, b) => a.displayOrder - b.displayOrder);
    }, [sortedSequences, directScenes]);

    function toggleSequence(id: string) {
        toggle('sequences', id);
    }

    const canDropSceneOnTarget = useCallback(
        (target: DropTarget): boolean => {
            if (dragItemType !== 'scene') return false;
            if (!dragItemId) return false;
            if (target.type === 'inside') return true;
            if (target.index >= unifiedItems.length) return true;
            const targetItem = unifiedItems[target.index];
            if (!targetItem) return true;
            if (targetItem.kind === 'sequence') return true;
            if (targetItem.kind === 'scene') {
                if (targetItem.id === dragItemId) return false;
            }
            return true;
        },
        [dragItemType, dragItemId, unifiedItems]
    );

    const canDropSequenceOnTarget = useCallback(
        (target: DropTarget): boolean => {
            if (dragItemType !== 'sequence') return false;
            if (!dragItemId) return false;
            if (target.type === 'inside') return false;
            if (target.index >= unifiedItems.length) return true;
            const targetItem = unifiedItems[target.index];
            if (!targetItem) return true;
            if (targetItem.kind === 'sequence' && targetItem.id === dragItemId)
                return false;
            return true;
        },
        [dragItemType, dragItemId, unifiedItems]
    );

    const handleUnifiedDrop = useCallback(
        (target: DropTarget) => {
            if (!dragItemId) return;
            if (dragItemType === 'scene') {
                if (!canDropSceneOnTarget(target)) return;
                const sourceScene = scenes.find((s) => s.id === dragItemId);
                if (!sourceScene) return;

                if (target.type === 'inside') {
                    onSceneReorder(
                        target.containerKey,
                        [dragItemId],
                        dragItemId,
                        dragSourceContainer
                    );
                    resetDragState();
                    return;
                }

                if (!onStructureReorder) return;

                const newItems = unifiedItems.filter(
                    (item) => !(item.kind === 'scene' && item.id === dragItemId)
                );
                const rawIdx =
                    target.type === 'after' ? target.index + 1 : target.index;
                const dragIdx = unifiedItems.findIndex(
                    (item) => item.id === dragItemId
                );
                const adjustedIdx =
                    dragIdx >= 0 && dragIdx < rawIdx ? rawIdx - 1 : rawIdx;
                newItems.splice(adjustedIdx, 0, {
                    kind: 'scene',
                    id: dragItemId,
                    scene: sourceScene,
                    displayOrder: adjustedIdx,
                });

                const updates = newItems.map((item, idx) => ({
                    id: item.id,
                    type: item.kind as 'sequence' | 'scene',
                    displayOrder: idx,
                    sequenceId:
                        item.kind === 'scene'
                            ? sourceScene.id === item.id
                                ? (target.containerKey ?? null)
                                : item.scene.sequenceId
                            : undefined,
                }));

                if (target.containerKey !== dragSourceContainer) {
                    onSceneReorder(
                        target.containerKey,
                        newItems
                            .filter(
                                (item) =>
                                    item.kind === 'scene' &&
                                    (target.containerKey
                                        ? item.scene.sequenceId ===
                                              target.containerKey ||
                                          item.id === dragItemId
                                        : !item.scene.sequenceId ||
                                          item.id === dragItemId)
                            )
                            .map((item) => item.id),
                        dragItemId,
                        dragSourceContainer
                    );
                }

                onStructureReorder(updates);
                resetDragState();
            } else if (dragItemType === 'sequence') {
                if (!canDropSequenceOnTarget(target)) return;
                if (!onStructureReorder) return;

                const seq = sortedSequences.find((s) => s.id === dragItemId);
                if (!seq) return;

                const newItems = unifiedItems.filter(
                    (item) =>
                        !(item.kind === 'sequence' && item.id === dragItemId)
                );
                const rawIdx =
                    target.type === 'after' ? target.index + 1 : target.index;
                const dragIdx = unifiedItems.findIndex(
                    (item) => item.id === dragItemId
                );
                const adjustedIdx =
                    dragIdx >= 0 && dragIdx < rawIdx ? rawIdx - 1 : rawIdx;
                newItems.splice(adjustedIdx, 0, {
                    kind: 'sequence',
                    id: dragItemId,
                    seq,
                    displayOrder: adjustedIdx,
                });

                const updates = newItems.map((item, idx) => ({
                    id: item.id,
                    type: item.kind as 'sequence' | 'scene',
                    displayOrder: idx,
                }));

                onStructureReorder(updates);
                resetDragState();
            }
        },
        [
            dragItemId,
            dragItemType,
            dragSourceContainer,
            scenes,
            sortedSequences,
            unifiedItems,
            canDropSceneOnTarget,
            canDropSequenceOnTarget,
            onSceneReorder,
            onStructureReorder,
        ]
    );

    function resetDragState() {
        setDragItemType(null);
        setDragItemId(null);
        setDragSourceContainer(null);
        setDropTarget(null);
    }

    const getDropClassName = (target: DropTarget): string => {
        if (!dropTarget) return '';
        if (
            dropTarget.type !== target.type ||
            dropTarget.containerKey !== target.containerKey ||
            dropTarget.index !== target.index
        )
            return '';
        if (dragItemType === 'scene' && !canDropSceneOnTarget(target))
            return 'drop-target-invalid';
        if (dragItemType === 'sequence' && !canDropSequenceOnTarget(target))
            return 'drop-target-invalid';
        return 'drop-target-active';
    };

    const isEmpty = unifiedItems.length === 0;

    function renderUnifiedBeforeZone(unifiedIdx: number) {
        const target: DropTarget = {
            type: 'before',
            containerKey: null,
            index: unifiedIdx,
        };
        return (
            <DropZoneDiv
                key={`drop-before-${unifiedIdx}`}
                className={`structure-drop-zone ${getDropClassName(target)}`}
                onDragOver={(e) => {
                    if (!dragItemType) return;
                    e.preventDefault();
                    setDropTarget(target);
                }}
                onDragLeave={() => {
                    if (
                        dropTarget?.index === unifiedIdx &&
                        dropTarget?.type === 'before'
                    )
                        setDropTarget(null);
                }}
                onDrop={() => handleUnifiedDrop(target)}
            />
        );
    }

    function renderSequenceSceneDropZones(seqId: string, sceneIdx: number) {
        const beforeTarget: DropTarget = {
            type: 'before',
            containerKey: seqId,
            index: sceneIdx,
        };
        return (
            <Fragment key={`scene-drop-${seqId}-${sceneIdx}`}>
                <DropZoneDiv
                    className={`structure-drop-zone ${getDropClassName(beforeTarget)}`}
                    onDragOver={(e) => {
                        if (dragItemType !== 'scene') return;
                        e.preventDefault();
                        setDropTarget(beforeTarget);
                    }}
                    onDragLeave={() => {
                        if (
                            dropTarget?.containerKey === seqId &&
                            dropTarget?.index === sceneIdx &&
                            dropTarget?.type === 'before'
                        )
                            setDropTarget(null);
                    }}
                    onDrop={() => handleUnifiedDrop(beforeTarget)}
                />
            </Fragment>
        );
    }

    return (
        <div className="outline-section">
            <div className="section-header">
                <label>Chapter Structure</label>
                <button className="icon-btn" onClick={onSequenceCreate}>
                    <IconPlus size={14} /> Add Sequence
                </button>
            </div>
            {isEmpty && (
                <div className="empty-scenes">
                    No sequences or scenes in this chapter yet.
                </div>
            )}

            <div className="outline-chapter-structure">
                <div className="outline-chapter-structure-inner">
                    {unifiedItems.map((item, unifiedIdx) => (
                        <Fragment key={item.id}>
                            {renderUnifiedBeforeZone(unifiedIdx)}

                            {item.kind === 'sequence' ? (
                                <div
                                    className={`outline-sequence ${getDropClassName({ type: 'inside', containerKey: item.seq.id, index: 0 })}`}
                                    onDragOver={(e) => {
                                        if (dragItemType === 'sequence') return;
                                        if (!dragItemType) return;
                                        e.preventDefault();
                                        setDropTarget({
                                            type: 'inside',
                                            containerKey: item.seq.id,
                                            index: 0,
                                        });
                                    }}
                                    onDragLeave={() => {
                                        if (
                                            dropTarget?.containerKey ===
                                                item.seq.id &&
                                            dropTarget?.type === 'inside'
                                        )
                                            setDropTarget(null);
                                    }}
                                    onDrop={() =>
                                        handleUnifiedDrop({
                                            type: 'inside',
                                            containerKey: item.seq.id,
                                            index: 0,
                                        })
                                    }
                                >
                                    <div className="outline-sequence-header">
                                        <span
                                            className="drag-handle"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed =
                                                    'move';
                                                setDragItemType('sequence');
                                                setDragItemId(item.seq.id);
                                                setDragSourceContainer(null);
                                            }}
                                            onDragEnd={resetDragState}
                                        >
                                            <IconGripVertical size={16} />
                                        </span>
                                        <button
                                            className="collapse-btn"
                                            onClick={() =>
                                                toggleSequence(item.seq.id)
                                            }
                                            title={
                                                collapsed.sequences.includes(
                                                    item.seq.id
                                                )
                                                    ? 'Expand'
                                                    : 'Collapse'
                                            }
                                        >
                                            {collapsed.sequences.includes(
                                                item.seq.id
                                            ) ? (
                                                <IconChevronRight size={16} />
                                            ) : (
                                                <IconChevronDown size={16} />
                                            )}
                                        </button>
                                        <input
                                            className="sequence-title-input"
                                            placeholder="Sequence title..."
                                            value={item.seq.title}
                                            onChange={(e) =>
                                                onSequenceUpdate(
                                                    item.seq.id,
                                                    'title',
                                                    e.target.value
                                                )
                                            }
                                        />
                                        <span className="act-badge">
                                            {item.seq.status}
                                        </span>
                                        <button
                                            className="icon-btn icon-btn-sm"
                                            onClick={() =>
                                                onSequenceDelete(item.seq.id)
                                            }
                                        >
                                            <IconTrash size={12} />
                                        </button>
                                    </div>
                                    <textarea
                                        className="sequence-summary-input"
                                        placeholder="Sequence summary..."
                                        value={item.seq.summary || ''}
                                        onChange={(e) =>
                                            onSequenceUpdate(
                                                item.seq.id,
                                                'summary',
                                                e.target.value
                                            )
                                        }
                                        rows={1}
                                    />
                                    {!collapsed.sequences.includes(
                                        item.seq.id
                                    ) && (
                                        <div className="outline-sequence-scenes">
                                            {scenesOfSequence(item.seq.id)
                                                .length === 0 && (
                                                <div className="empty-scenes">
                                                    Drop scenes here or add new
                                                    ones.
                                                </div>
                                            )}
                                            {scenesOfSequence(item.seq.id).map(
                                                (scene, sceneIdx) => (
                                                    <Fragment key={scene.id}>
                                                        {renderSequenceSceneDropZones(
                                                            item.seq.id,
                                                            sceneIdx
                                                        )}
                                                        <div className="scene-content-wrap">
                                                            <SceneCardEditor
                                                                scene={scene}
                                                                index={sceneIdx}
                                                                characters={
                                                                    characters
                                                                }
                                                                collapsed={collapsed.scenes.includes(
                                                                    scene.id
                                                                )}
                                                                onToggleCollapsed={() =>
                                                                    toggle(
                                                                        'scenes',
                                                                        scene.id
                                                                    )
                                                                }
                                                                onChange={
                                                                    onSceneUpdate
                                                                }
                                                                onRemove={
                                                                    onSceneDelete
                                                                }
                                                                dragHandle={
                                                                    <span
                                                                        className="drag-handle"
                                                                        draggable
                                                                        onDragStart={(
                                                                            e
                                                                        ) => {
                                                                            e.dataTransfer.effectAllowed =
                                                                                'move';
                                                                            setDragItemType(
                                                                                'scene'
                                                                            );
                                                                            setDragItemId(
                                                                                scene.id
                                                                            );
                                                                            setDragSourceContainer(
                                                                                item
                                                                                    .seq
                                                                                    .id
                                                                            );
                                                                        }}
                                                                        onDragEnd={
                                                                            resetDragState
                                                                        }
                                                                    >
                                                                        <IconGripVertical
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                    </span>
                                                                }
                                                            />
                                                        </div>
                                                    </Fragment>
                                                )
                                            )}
                                            <div
                                                className={`structure-drop-zone ${getDropClassName({ type: 'inside', containerKey: item.seq.id, index: scenesOfSequence(item.seq.id).length })}`}
                                                onDragOver={(e) => {
                                                    if (
                                                        dragItemType !== 'scene'
                                                    )
                                                        return;
                                                    e.preventDefault();
                                                    setDropTarget({
                                                        type: 'inside',
                                                        containerKey:
                                                            item.seq.id,
                                                        index: scenesOfSequence(
                                                            item.seq.id
                                                        ).length,
                                                    });
                                                }}
                                                onDragLeave={() => {
                                                    if (
                                                        dropTarget?.containerKey ===
                                                            item.seq.id &&
                                                        dropTarget?.type ===
                                                            'inside'
                                                    )
                                                        setDropTarget(null);
                                                }}
                                                onDrop={() =>
                                                    handleUnifiedDrop({
                                                        type: 'inside',
                                                        containerKey:
                                                            item.seq.id,
                                                        index: scenesOfSequence(
                                                            item.seq.id
                                                        ).length,
                                                    })
                                                }
                                            />
                                            <button
                                                className="add-scene-btn"
                                                onClick={() =>
                                                    onSceneCreate(item.seq.id)
                                                }
                                            >
                                                <IconPlus size={12} /> Add Scene
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className={`scene-content-wrap ${getDropClassName({ type: 'after', containerKey: null, index: unifiedIdx })}`}
                                    onDragOver={(e) => {
                                        if (dragItemType !== 'scene') return;
                                        e.preventDefault();
                                        setDropTarget({
                                            type: 'after',
                                            containerKey: null,
                                            index: unifiedIdx,
                                        });
                                    }}
                                    onDragLeave={() => {
                                        if (
                                            dropTarget?.type === 'after' &&
                                            dropTarget?.containerKey === null &&
                                            dropTarget?.index === unifiedIdx
                                        )
                                            setDropTarget(null);
                                    }}
                                    onDrop={() =>
                                        handleUnifiedDrop({
                                            type: 'after',
                                            containerKey: null,
                                            index: unifiedIdx,
                                        })
                                    }
                                >
                                    <SceneCardEditor
                                        scene={item.scene}
                                        index={unifiedIdx}
                                        characters={characters}
                                        collapsed={collapsed.scenes.includes(
                                            item.scene.id
                                        )}
                                        onToggleCollapsed={() =>
                                            toggle('scenes', item.scene.id)
                                        }
                                        onChange={onSceneUpdate}
                                        onRemove={onSceneDelete}
                                        dragHandle={
                                            <span
                                                className="drag-handle"
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.effectAllowed =
                                                        'move';
                                                    setDragItemType('scene');
                                                    setDragItemId(
                                                        item.scene.id
                                                    );
                                                    setDragSourceContainer(
                                                        null
                                                    );
                                                }}
                                                onDragEnd={resetDragState}
                                            >
                                                <IconGripVertical size={16} />
                                            </span>
                                        }
                                    />
                                </div>
                            )}
                        </Fragment>
                    ))}

                    {isEmpty ? (
                        <div
                            className={`structure-drop-zone full-drop-zone ${getDropClassName({ type: 'inside', containerKey: null, index: 0 })}`}
                            onDragOver={(e) => {
                                if (!dragItemType) return;
                                e.preventDefault();
                                setDropTarget({
                                    type: 'inside',
                                    containerKey: null,
                                    index: 0,
                                });
                            }}
                            onDragLeave={() => {
                                if (dropTarget?.containerKey === null)
                                    setDropTarget(null);
                            }}
                            onDrop={() =>
                                handleUnifiedDrop({
                                    type: 'inside',
                                    containerKey: null,
                                    index: 0,
                                })
                            }
                        >
                            Drop scenes here
                        </div>
                    ) : (
                        <div
                            className={`structure-drop-zone ${getDropClassName({ type: 'after', containerKey: null, index: unifiedItems.length - 1 })}`}
                            onDragOver={(e) => {
                                if (!dragItemType) return;
                                e.preventDefault();
                                setDropTarget({
                                    type: 'after',
                                    containerKey: null,
                                    index: unifiedItems.length - 1,
                                });
                            }}
                            onDragLeave={() => {
                                if (
                                    dropTarget?.index ===
                                        unifiedItems.length - 1 &&
                                    dropTarget?.type === 'after'
                                )
                                    setDropTarget(null);
                            }}
                            onDrop={() =>
                                handleUnifiedDrop({
                                    type: 'after',
                                    containerKey: null,
                                    index: unifiedItems.length - 1,
                                })
                            }
                        />
                    )}
                </div>

                <button
                    className="add-scene-btn"
                    onClick={() => onSceneCreate(null)}
                >
                    <IconPlus size={12} /> Add Chapter Scene
                </button>
            </div>
        </div>
    );
}
