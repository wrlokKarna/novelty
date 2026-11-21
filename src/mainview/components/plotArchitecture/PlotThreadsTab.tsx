import { IconPlus, IconTrash } from '@tabler/icons-react';
import styles from '../PlotArchitectureView.module.css';
import { usePlotArchitectureContext } from './usePlotArchitecture';

export function PlotThreadsTab() {
    const {
        plotThreads,
        chapters,
        handleUpdateThread,
        handleDeleteThread,
        handleAddPlotThread,
    } = usePlotArchitectureContext();

    return (
        <div className={styles['threads-list']}>
            {plotThreads.length === 0 && (
                <div className={styles['empty-state']}>
                    No plot threads defined. Add threads to track subplots and
                    character arcs.
                </div>
            )}
            {plotThreads.map((thread) => (
                <div
                    key={thread.id}
                    className={styles['thread-card']}
                    style={{ borderLeftColor: thread.color }}
                >
                    <div className={styles['thread-header']}>
                        <input
                            className={styles['thread-name-input']}
                            value={thread.name}
                            onChange={(e) =>
                                handleUpdateThread(
                                    thread.id,
                                    'name',
                                    e.target.value
                                )
                            }
                        />
                        <select
                            value={thread.threadType}
                            onChange={(e) =>
                                handleUpdateThread(
                                    thread.id,
                                    'threadType',
                                    e.target.value
                                )
                            }
                            className={styles['thread-type-select']}
                        >
                            <option value="main">Main</option>
                            <option value="subplot">Subplot</option>
                            <option value="character-arc">Character Arc</option>
                            <option value="mystery">Mystery</option>
                            <option value="romance">Romance</option>
                            <option value="thematic">Thematic</option>
                        </select>
                        <input
                            type="color"
                            value={thread.color}
                            onChange={(e) =>
                                handleUpdateThread(
                                    thread.id,
                                    'color',
                                    e.target.value
                                )
                            }
                            className={styles['thread-color-picker']}
                        />
                        <button
                            className={`${styles['icon-btn']} ${styles['icon-btn-sm']}`}
                            onClick={() => handleDeleteThread(thread.id)}
                        >
                            <IconTrash size={14} />
                        </button>
                    </div>
                    <input
                        className={styles['thread-desc-input']}
                        placeholder="Description..."
                        value={thread.description || ''}
                        onChange={(e) =>
                            handleUpdateThread(
                                thread.id,
                                'description',
                                e.target.value
                            )
                        }
                    />
                    <div className={styles['thread-chapters']}>
                        Chapters:{' '}
                        {
                            chapters.filter((c) =>
                                c.content?.includes(thread.name)
                            ).length
                        }
                    </div>
                </div>
            ))}
            <button
                className={styles['add-thread-btn']}
                onClick={handleAddPlotThread}
            >
                <IconPlus size={16} /> Add Plot Thread
            </button>
        </div>
    );
}
