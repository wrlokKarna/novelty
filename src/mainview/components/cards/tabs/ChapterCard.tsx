import type { DragEvent, ReactNode } from 'react';
import {
    IconChevronDown,
    IconChevronRight,
    IconGripVertical,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import type { Chapter } from '../../../../shared/types/project';
import styles from '../../PlotArchitectureView.module.css';

export interface ChapterCardProps {
    chapter: Chapter;
    collapsed: boolean;
    onToggle: () => void;
    onNavigate: () => void;
    onDelete: () => void;
    onAddSequence: () => void;
    onAddScene: () => void;
    sequencesContent?: ReactNode;
    scenesContent?: ReactNode;
    className?: string;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: (e: DragEvent) => void;
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
    sequencesContainerClassName?: string;
    onSequencesDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onSequencesDrop: (e: DragEvent<HTMLDivElement>) => void;
    scenesContainerClassName?: string;
    onScenesDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onScenesDrop: (e: DragEvent<HTMLDivElement>) => void;
}

export function ChapterCard({
    chapter,
    collapsed,
    onToggle,
    onNavigate,
    onDelete,
    onAddSequence,
    onAddScene,
    sequencesContent,
    scenesContent,
    className = '',
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDragLeave,
    sequencesContainerClassName = '',
    onSequencesDragOver,
    onSequencesDrop,
    scenesContainerClassName = '',
    onScenesDragOver,
    onScenesDrop,
}: ChapterCardProps) {
    return (
        <div
            className={`${styles['chapter-node']} ${className}`.trim()}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={onDragLeave}
        >
            <div className={styles['chapter-header']}>
                <span
                    className={styles['drag-handle']}
                    draggable
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                >
                    <IconGripVertical size={16} />
                </span>
                <button
                    className="collapse-btn"
                    onClick={onToggle}
                    title={collapsed ? 'Expand' : 'Collapse'}
                    type="button"
                >
                    {collapsed ? (
                        <IconChevronRight size={16} />
                    ) : (
                        <IconChevronDown size={16} />
                    )}
                </button>
                <span
                    className={styles['chapter-title']}
                    onClick={onNavigate}
                    title="Open chapter"
                >
                    {chapter.title}
                </span>
                <span className={`status-dot status-${chapter.status}`} />
                <button
                    className={`${styles['icon-btn']} ${styles['icon-btn-sm']}`}
                    onClick={onDelete}
                    type="button"
                >
                    <IconTrash size={12} />
                </button>
            </div>
            {!collapsed && (
                <div className={styles['chapter-body']}>
                    <div
                        className={`${styles['sequences-list']} ${sequencesContainerClassName}`.trim()}
                        onDragOver={onSequencesDragOver}
                        onDrop={onSequencesDrop}
                    >
                        {sequencesContent}
                        <button
                            className={styles['add-sequence-btn']}
                            onClick={onAddSequence}
                            type="button"
                        >
                            <IconPlus size={14} /> Add Sequence
                        </button>
                    </div>
                    <div
                        className={`${styles['chapter-scenes']} ${scenesContainerClassName}`.trim()}
                        onDragOver={onScenesDragOver}
                        onDrop={onScenesDrop}
                    >
                        {scenesContent}
                        <button
                            className={styles['add-scene-btn']}
                            onClick={onAddScene}
                            type="button"
                        >
                            <IconPlus size={12} /> Add Scene
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

