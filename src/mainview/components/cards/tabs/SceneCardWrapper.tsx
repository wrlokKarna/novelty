import type { DragEvent, ReactNode } from 'react';
import { IconGripVertical } from '@tabler/icons-react';
import type { Chapter } from '../../../../shared/types/project';
import type { Character } from '../../../../shared/types/project/compendium';
import type { StoryScene } from '../../../../shared/types/project/manuscript';
import SceneCardEditor from '../../SceneCardEditor';

interface SceneCardWrapperProps {
    scene: StoryScene;
    index: number;
    characters: Character[];
    chapters: Chapter[];
    collapsed: boolean;
    onToggleCollapsed: () => void;
    onChange: (id: string, field: string, value: unknown) => void;
    onRemove: (id: string) => void;
    onMoveToChapter: (chapterId: string | null) => void;
    className?: string;
    onDragStart: (e: DragEvent) => void;
    onDragEnd: (e: DragEvent) => void;
    onDragOver: (e: DragEvent<HTMLDivElement>) => void;
    onDrop: (e: DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
    extraActions?: ReactNode;
}

export function SceneCardWrapper({
    scene,
    index,
    characters,
    chapters,
    collapsed,
    onToggleCollapsed,
    onChange,
    onRemove,
    onMoveToChapter,
    className = '',
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDragLeave,
    extraActions,
}: SceneCardWrapperProps) {
    return (
        <div
            className={`scene-content-wrap ${className}`.trim()}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragLeave={onDragLeave}
        >
            <SceneCardEditor
                scene={scene}
                index={index}
                characters={characters}
                collapsed={collapsed}
                onToggleCollapsed={onToggleCollapsed}
                onChange={onChange}
                onRemove={onRemove}
                dragHandle={
                    <span
                        className="drag-handle"
                        draggable
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                    >
                        <IconGripVertical size={12} />
                    </span>
                }
                extraActions={
                    extraActions ?? (
                        <select
                            className="scene-chapter-select"
                            value={scene.chapterId || ''}
                            onChange={(e) =>
                                onMoveToChapter(e.target.value || null)
                            }
                            title="Attach scene to a chapter"
                        >
                            <option value="">No chapter</option>
                            {chapters.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                    )
                }
            />
        </div>
    );
}
