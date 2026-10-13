import type { Project } from '../../types/index';
import { useState, useRef, useEffect } from 'react';
import { useRPC } from '../../contexts/RPCContext';
import styles from './projectCard.module.css';
import {
    IconDotsVertical,
    IconEdit,
    IconPhoto,
    IconTrash,
} from '@tabler/icons-react';

export default function ProjectCard({
    project,
    onSelect,
    onRename,
    onChangeCover,
    onDelete,
}: {
    project: Project;
    onSelect?: (projectId: string) => void;
    onRename?: (projectId: string) => void;
    onChangeCover?: (projectId: string) => void;
    onDelete?: (projectId: string) => void;
}) {
    const [showOptions, setShowOptions] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
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

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setShowOptions(false);
            }
        }
        if (showOptions) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [showOptions]);

    function handleCardClick(e: React.MouseEvent) {
        if ((e.target as HTMLElement).closest(`.${styles.optionsBtn}`)) return;
        onSelect?.(project.id);
    }

    function handleRename(e: React.MouseEvent) {
        e.stopPropagation();
        setShowOptions(false);
        onRename?.(project.id);
    }

    function handleChangeCover(e: React.MouseEvent) {
        e.stopPropagation();
        setShowOptions(false);
        onChangeCover?.(project.id);
    }

    function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        setShowOptions(false);
        onDelete?.(project.id);
    }

    /*console.warn("[genres]", project.genres);*/
    console.warn('[primary genre]', project.primaryGenre);
    console.warn('[primary theme]', project.primaryTheme);

    return (
        <div className={styles.projectCard} onClick={handleCardClick}>
            <div className={styles.projectImage}>
                {coverImageSrc && (
                    <img src={coverImageSrc} alt={project.name} />
                )}
            </div>
            <div className={styles.projectInfo}>
                <p className={styles.projectTitle}>{project.name}</p>
                {project.contentRating &&
                    project.contentRating !== 'Unrated' && (
                        <span
                            className={`${styles.ratingBadge} ${styles[`rating_${project.contentRating.toLowerCase().replace(/-/g, '_')}`] || ''}`}
                        >
                            {project.contentRating}
                        </span>
                    )}
                {(project.genres.length > 0 || project.tags.length > 0) && (
                    <div className={styles.projectMeta}>
                        {project.genres.length > 0 && (
                            <p className={styles.projectGenres}>
                                {project.genres.slice(0, 3).join(', ')}
                                {project.genres.length > 3 &&
                                    ` +${project.genres.length - 3}`}
                            </p>
                        )}

                        {false && project.tags.length > 0 && (
                            <div className={styles.projectTags}>
                                {project.tags.slice(0, 5).map((tag) => (
                                    <span
                                        key={tag}
                                        className={styles.projectTag}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <p className={styles.projectDate}>
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
            </div>
            <div className={styles.optionsWrapper} ref={menuRef}>
                <button
                    className={styles.optionsBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowOptions(!showOptions);
                    }}
                >
                    <IconDotsVertical size={18} stroke={2} />
                </button>
                {showOptions && (
                    <div className={styles.optionsMenu}>
                        <button onClick={handleRename}>
                            <IconEdit size={16} stroke={2} />
                            Rename
                        </button>
                        <button onClick={handleChangeCover}>
                            <IconPhoto size={16} stroke={2} />
                            Change Cover
                        </button>
                        <button
                            className={styles.deleteOption}
                            onClick={handleDelete}
                        >
                            <IconTrash size={16} stroke={2} />
                            Delete Project
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
