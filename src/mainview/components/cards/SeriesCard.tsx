import ProjectCard from './ProjectCard';
import styles from './SeriesCard.module.css';
import type { CardActionHandlers } from './ProjectCard';
import { IconPencilFilled, IconTrashFilled } from '@tabler/icons-react';
import type { Project } from '../../../shared/types';
import type { Series } from '../../../shared/types/series';

export default function SeriesCard({
    seriesId,
    seriesData,
    seriesArr,
    onSelect,
    onRename,
    onChangeCover,
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
    const isEmpty = seriesData.length === 0;

    return (
        <div className={styles.series}>
            <div className={styles.seriesLabelRow}>
                <h3 className={styles.seriesTitle}>
                    {series?.name ?? 'Untitled Series'}
                </h3>

                {onEditSeries && (
                    <button
                        type="button"
                        title="Edit Series"
                        className={styles.iconBtn}
                        onClick={() => onEditSeries(seriesId)}
                    >
                        <IconPencilFilled color="#ffffff" />
                    </button>
                )}

                {isEmpty && onDeleteSeries && (
                    <button
                        type="button"
                        title="Delete Series"
                        className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                        onClick={() => onDeleteSeries(seriesId)}
                    >
                        <IconTrashFilled color="#ffffff" />
                    </button>
                )}
            </div>

            {isEmpty ? (
                <div className={styles.emptyProjects}>No projects yet</div>
            ) : (
                <div className={styles.projects}>
                    {seriesData.map((proj) => (
                        <ProjectCard
                            key={proj.id}
                            project={proj}
                            onSelect={onSelect}
                            onRename={onRename}
                            onChangeCover={onChangeCover}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
