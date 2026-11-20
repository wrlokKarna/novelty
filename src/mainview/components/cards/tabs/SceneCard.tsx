import { useCallback } from 'react';
import styles from './SceneCard.module.css';

export interface SceneCardProps {
    sceneId?: string;
    title: string;
    summary?: string | null;
    setting?: string | null;
    charactersPresent?: string[] | null;
    keyEvents?: string[] | null;
    conflict?: string | null;
    duration?: string | null;
    collapsed: boolean;
    toggle: () => void;
    onSceneDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>;
    children?: React.ReactNode;
}

export function SceneCard({
    title,
    summary,
    setting,
    charactersPresent,
    keyEvents,
    conflict,
    duration,
    collapsed,
    toggle,
    onSceneDrop,
}: SceneCardProps) {
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const toggleCallback = useCallback(() => {
        toggle();
    }, [toggle]);

    return (
        <div
            className={styles.sceneCard}
            onDragOver={handleDragOver}
            onDrop={onSceneDrop}
        >
            {/* Scene header */}
            <div className={styles.sceneHeader} onClick={toggleCallback}>
                <button
                    type="button"
                    className={styles.sceneHeaderButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleCallback();
                    }}
                >
                    <svg
                        className={`${styles.icon} ${collapsed ? styles.rotated : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </button>

                <div className={styles.sceneTitleContainer}>
                    <div className={styles.sceneTitle}>{title}</div>
                    {setting && (
                        <div className={styles.sceneSetting}>
                            Setting: {setting}
                        </div>
                    )}
                    {summary && (
                        <div className={styles.sceneSummary}>{summary}</div>
                    )}
                </div>
            </div>

            {/* Scene status */}
            {conflict && (
                <span className={styles.sceneConflicts}>
                    Conflict: {conflict}
                </span>
            )}

            {/* Scene metadata */}
            {!collapsed && (
                <div className={styles.sceneMetadata}>
                    {charactersPresent && charactersPresent.length > 0 && (
                        <div className={styles.sceneMetadataItem}>
                            Characters:
                            <span className={styles.sceneMetadataLabel}>
                                {charactersPresent.join(', ')}
                            </span>
                        </div>
                    )}
                    {keyEvents && keyEvents.length > 0 && (
                        <div className={styles.sceneMetadataItem}>
                            Key Events:
                            <span className={styles.sceneMetadataLabel}>
                                {keyEvents.join(', ')}
                            </span>
                        </div>
                    )}
                    {duration && (
                        <div className={styles.sceneMetadataItem}>
                            Duration: {duration}
                        </div>
                    )}
                </div>
            )}

            {/* Scene content */}
            {!collapsed && (
                <textarea
                    className={styles.sceneTextarea}
                    placeholder="Write your scene..."
                />
            )}
        </div>
    );
}
