import type { Project, Series } from '../../types/index';
import ProjectCard from './projectCard';
import styles from '../../dialogs/WorkshopDialog.module.css';
import type { CardActionHandlers } from './projectCard';

export default function WorkshopSeriesCard({
    seriesId,
    seriesData,
    seriesArr,
    onSelect,
    onRename,
    onChangeCover,
    onDelete,
    onEditSeries,
    onDeleteSeries,
}: {
    seriesId: string;
    seriesData: Project[];
    seriesArr: Series[];
    onEditSeries?: (seriesId: string) => void;
    onDeleteSeries?: (seriesId: string) => void;
} & CardActionHandlers) {
    const series = seriesArr.find((s) => s.id === seriesId);

    return (
        <div className={styles.series}>
            <div className={styles.seriesmname}>
                <div className={styles.seriesTitle}>
                    <span>{series?.name ?? 'Untitled Series'}</span>
                    {series?.seriesArch && (
                        <span className={styles.seriesArchBadge}>
                            ({series.seriesArch})
                        </span>
                    )}
                </div>

                {(onEditSeries || onDeleteSeries) && (
                    <div
                        className={styles.seriesActions}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onEditSeries && (
                            <button
                                type="button"
                                title="Edit Series"
                                className={styles.iconBtn}
                                onClick={() => onEditSeries(seriesId)}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="18"
                                        rx="4"
                                    />
                                    <path d="M16 7l1 1-7.5 7.5-2.5.5.5-2.5L15 6z" />
                                </svg>
                            </button>
                        )}

                        {onDeleteSeries && (
                            <button
                                type="button"
                                title="Delete Series"
                                className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                                onClick={() => onDeleteSeries(seriesId)}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={`${styles.projects}`}>
                {seriesData.map((proj) => (
                    <ProjectCard
                        key={proj.id}
                        project={proj}
                        onSelect={onSelect}
                        onRename={onRename}
                        onChangeCover={onChangeCover}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        </div>
    );
}
