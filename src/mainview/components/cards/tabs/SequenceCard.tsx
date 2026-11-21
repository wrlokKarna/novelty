import type { DragEvent, ReactNode } from 'react';
import {
    IconChevronDown,
    IconChevronRight,
    IconGripVertical,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import type { StorySequence } from '../../../../shared/types';
import type { Chapter } from '../../../../shared/types/project';
import styles from '../../PlotArchitectureView.module.css';

export interface SequenceCardProps {
    sequence: StorySequence;
    chapters: Chapter[];
    collapsed: boolean;
    onToggle: () => void;
    onTitleChange: (value: string) => void;
    onSummaryChange: (value: string) => void;
    onMoveChapter: (chapterId: string | null) => void;
    onDelete: () => void;
    onAddScene: () => void;
    children?: ReactNode;
    className?: string;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: (e: DragEvent) => void;
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
    scenesContainerClassName?: string;
    onScenesDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onScenesDrop: (e: DragEvent<HTMLDivElement>) => void;
    onScenesDragLeave?: (e: DragEvent<HTMLDivElement>) => void;
}

export function SequenceCard({
    sequence,
    chapters,
    collapsed,
    onToggle,
    onTitleChange,
    onSummaryChange,
    onMoveChapter,
    onDelete,
    onAddScene,
    children,
    className = '',
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDragLeave,
    scenesContainerClassName = '',
    onScenesDragOver,
    onScenesDrop,
    onScenesDragLeave,
}: SequenceCardProps) {
    return (
        <div
            className={`${styles['sequence-card']} ${className}`.trim()}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={onDragLeave}
        >
            <div className={styles['sequence-header']}>
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
                <input
                    className={styles['sequence-title-input']}
                    value={sequence.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                />
                <select
                    className={styles['seq-chapter-select']}
                    value={sequence.chapterId || ''}
                    onChange={(e) => onMoveChapter(e.target.value || null)}
                    title="Assign sequence to a chapter"
                >
                    <option value="">Unassigned</option>
                    {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title}
                        </option>
                    ))}
                </select>
                <span className={styles['act-badge']}>{sequence.status}</span>
                <button
                    className={`${styles['icon-btn']} ${styles['icon-btn-sm']}`}
                    onClick={onDelete}
                    type="button"
                >
                    <IconTrash size={12} />
                </button>
            </div>
            {!collapsed && (
                <>
                    <textarea
                        className={styles['sequence-summary-input']}
                        placeholder="Sequence summary..."
                        value={sequence.summary || ''}
                        onChange={(e) => onSummaryChange(e.target.value)}
                        rows={1}
                    />
                    <div
                        className={`${styles['sequence-scenes']} ${scenesContainerClassName}`.trim()}
                        onDragOver={onScenesDragOver}
                        onDrop={onScenesDrop}
                        onDragLeave={onScenesDragLeave}
                    >
                        {children}
                        <button
                            className={styles['add-scene-btn']}
                            onClick={onAddScene}
                            type="button"
                        >
                            <IconPlus size={12} /> Add Scene
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

