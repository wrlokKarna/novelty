import { useState, useEffect } from 'react';
import { useRPC } from '../../contexts/RPCContext';
import styles from './ProjectCard.module.css';
import { IconPencilFilled } from '@tabler/icons-react';
import type { Project } from '../../../shared/types';

export type CardActionHandlers = {
    onSelect?: (projectId: string) => void;
    onRename?: (projectId: string) => void;
    onChangeCover?: (projectId: string) => void;
};

export default function ProjectCard({
    project,
    onSelect,
    onRename,
    onChangeCover,
}: {
    project: Project;
} & CardActionHandlers) {
    const rpc = useRPC();
    const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);

    useEffect(() => {
        if (project.coverImageId) {
            rpc.request['db:get-asset'](project.coverImageId).then((asset) => {
                if (asset?.path) setCoverImageSrc(asset.path);
            });
        } else {
            setCoverImageSrc(null);
        }
    }, [project.coverImageId]);

    function handleSelect() {
        onSelect?.(project.id);
    }

    return (
        <div
            className={styles.projectCard}
            onClick={handleSelect}
            role="button"
            tabIndex={0}
        >
            {/* Card Cover */}
            <div className={styles.cardCoverWrapper}>
                <div className={styles.cardCover}>
                    {coverImageSrc ? (
                        <img
                            src={coverImageSrc}
                            alt={project.name}
                            className={styles.coverImg}
                        />
                    ) : (
                        <div className={styles.coverBookIcon}>
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                <path d="M12 6v10" />
                            </svg>
                        </div>
                    )}
                </div>

                <div
                    className={`${styles.cardCoverOverlay} ${coverImageSrc ? styles.coverOverlayDark : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onChangeCover?.(project.id);
                    }}
                >
                    {coverImageSrc ? 'Change Cover' : 'Add Cover'}
                </div>
            </div>

            {/* Bottom Meta & Typography */}
            <div className={styles.cardDetails}>
                <div className={styles.projectLabelRow}>
                    <h3 className={styles.cardTitle} title={project.name}>
                        {project.name}
                    </h3>
                    {onRename && (
                        <button
                            type="button"
                            title="Rename"
                            className={styles.iconBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                onRename(project.id);
                            }}
                        >
                            <IconPencilFilled color="#ffffff" />
                        </button>
                    )}
                </div>
                <div className={styles.metaRow}>
                    <span className={styles.badgePill}>
                        {project.projectScope
                            ? project.projectScope.replace('_', ' ')
                            : 'STANDARD'}
                    </span>
                    <span className={styles.badgeMeta}>
                        {project.contentRating || 'general'}
                    </span>
                </div>
                <div className={styles.wordsCount}>0 words</div>
            </div>
        </div>
    );
}
