import type { Project, Series } from '../../types/index';
import WorkshopProjectCard from './WorkshopProjectCard';
import styles from './WorkshopSeriesCard.module.css';
import type { CardActionHandlers } from './WorkshopProjectCard';
import { IconPencilFilled, IconTrashFilled } from '@tabler/icons-react';

export default function WorkshopSeriesCard({
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
                        <WorkshopProjectCard
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
