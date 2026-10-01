import { useState, useEffect, useRef } from 'react';
import Dialog from '../components/Dialog';
import SubDialog from '../components/SubDialog';
import { useRPC } from '../contexts/RPCContext';
import type {
    Project,
    NewProject,
    ProjectScope,
    Genre,
    Tag,
    Series,
    NewSeries,
    SeriesArchitecture,
} from '../types/index';
import styles from './ProjectsDialog.module.css';

const seriesArchOptions: { value: SeriesArchitecture; label: string }[] = [
    { value: 'duology', label: 'Duology' },
    { value: 'trilogy', label: 'Trilogy' },
    { value: 'ongoing', label: 'Ongoing' },
];

function ProjectCard({
    project,
    onSelect,
    onRename,
    onChangeCover,
    onDelete,
}: {
    project: Project;
    onSelect?: (id: string) => void;
    onRename?: (id: string) => void;
    onChangeCover?: (id: string) => void;
    onDelete?: (id: string) => void;
}) {
    return (
        <div
            className={styles.projectCard}
            onClick={() => onSelect?.(project.id)}
            role="button"
            tabIndex={0}
        >
            <div className={styles.cardCover}>
                {project.coverImageId ? (
                    <img
                        src={`/assets/${project.coverImageId}`}
                        alt={project.name}
                        className={styles.coverImg}
                    />
                ) : (
                    <div className={styles.coverBookIcon}>
                        <svg
                            width="30"
                            height="30"
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

                <div
                    className={styles.cardQuickActions}
                    onClick={(e) => e.stopPropagation()}
                >
                    {onChangeCover && (
                        <button
                            type="button"
                            title="Change Cover"
                            onClick={() => onChangeCover(project.id)}
                        >
                            🖼️️
                        </button>
                    )}
                    {onRename && (
                        <button
                            type="button"
                            title="Rename"
                            onClick={() => onRename(project.id)}
                        >
                            ✏️
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            title="Delete"
                            className={styles.deleteQuickBtn}
                            onClick={() => onDelete(project.id)}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.cardDetails}>
                <h3 className={styles.cardTitle}>{project.name}</h3>

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

                <div className={styles.phaseText}>
                    Phase 1 of 15 · {project.projectStatus || 'planning'}
                </div>

                <div className={styles.wordsCount}>0 words</div>
            </div>
        </div>
    );
}

export default function ProjectsDialog({
    open,
    onClose,
    onSelectProject,
    onProjectUpdated,
}: {
    open: boolean;
    onClose: () => void;
    onSelectProject?: (projectId: string) => void;
    onProjectUpdated?: () => void;
}) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedProjectScope, setSelectedProjectScope] =
        useState<ProjectScope>('standard');
    const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customGenre, setCustomGenre] = useState('');
    const [customTag, setCustomTag] = useState('');

    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [assetPickerTargetId, setAssetPickerTargetId] = useState<
        string | null
    >(null);

    const rpc = useRPC();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [showSeries, setShowSeries] = useState(false);
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [seriesLoading, setSeriesLoading] = useState(false);

    const [showSeriesCreate, setShowSeriesCreate] = useState(false);
    const [seriesCreateName, setSeriesCreateName] = useState('');
    const [seriesCreateDesc, setSeriesCreateDesc] = useState('');
    const [seriesCreateArch, setSeriesCreateArch] =
        useState<SeriesArchitecture>('ongoing');

    const [showSeriesEdit, setShowSeriesEdit] = useState(false);
    const [seriesEditId, setSeriesEditId] = useState<string | null>(null);
    const [seriesEditName, setSeriesEditName] = useState('');
    const [seriesEditDesc, setSeriesEditDesc] = useState('');
    const [seriesEditArch, setSeriesEditArch] =
        useState<SeriesArchitecture>('ongoing');

    const [showSeriesDelete, setShowSeriesDelete] = useState(false);
    const [seriesDeleteId, setSeriesDeleteId] = useState<string | null>(null);

    const [showSeriesProjects, setShowSeriesProjects] = useState(false);
    const [seriesProjects, setSeriesProjects] = useState<
        Array<{ id: string; name: string }>
    >([]);
    const [seriesProjectsName, setSeriesProjectsName] = useState('');

    const projectScopes: { value: ProjectScope; label: string }[] = [
        { value: 'fast_paced', label: 'Fast-Paced / Pulp' },
        { value: 'standard', label: 'Standard Novel' },
        { value: 'epic', label: 'Epic / Sprawling' },
    ];

    useEffect(() => {
        if (open) {
            loadProjects();
            loadGenresAndTags();
            if (showSeries) loadSeries();
        }
    }, [open, showSeries]);

    async function loadProjects() {
        try {
            const result = await rpc.request['db:get-projects']();
            setProjects(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load projects:', e);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadGenresAndTags() {
        try {
            const [genres, tags] = await Promise.all([
                rpc.request['db:get-genres'](),
                rpc.request['db:get-tags'](),
            ]);
            setAvailableGenres(Array.isArray(genres) ? genres : []);
            setAvailableTags(Array.isArray(tags) ? tags : []);
        } catch (e) {
            console.error('Failed to load genres/tags:', e);
        }
    }

    async function handleAddCustomGenre() {
        if (!customGenre.trim()) return;
        try {
            const newGenre = await rpc.request['db:create-genre']({
                name: customGenre.trim(),
                isGlobal: false,
            });
            setAvailableGenres([...availableGenres, newGenre]);
            setSelectedGenres([...selectedGenres, newGenre.id]);
            setCustomGenre('');
        } catch (e) {
            console.error('Failed to create genre:', e);
        }
    }

    async function handleAddCustomTag() {
        if (!customTag.trim()) return;
        try {
            const newTag = await rpc.request['db:create-tag']({
                name: customTag.trim(),
                isGlobal: false,
            });
            setAvailableTags([...availableTags, newTag]);
            setSelectedTags([...selectedTags, newTag.id]);
            setCustomTag('');
        } catch (e) {
            console.error('Failed to create tag:', e);
        }
    }

    async function handleCreateProject() {
        if (!newProjectName.trim()) return;
        try {
            const newProject: NewProject = {
                id: crypto.randomUUID(),
                name: newProjectName.trim(),
                path: null,
                metadata: null,
                description: null,
                systemPrompt: null,
                coverImageId: null,
                coverImagesArray: [],
                contentRating: 'general',
                projectScope: selectedProjectScope,
                seriesArch: null,
                seriesId: null,
                pov: null,
                pacing: null,
                workType: null,
                projectStructure: null,
                targetAge: null,
                projectStatus: 'planning',
                tonalType: null,
                primaryGenre: null,
                primaryTheme: null,
                genres: [],
                tags: [],
                themes: [],
            };
            await rpc.request['db:create-project'](newProject);
            setNewProjectName('');
            setSelectedProjectScope('standard');
            setSelectedGenres([]);
            setSelectedTags([]);
            setShowCreateModal(false);
            loadProjects();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to create project:', e);
        }
    }

    function handleImportClick() {
        fileInputRef.current?.click();
    }

    async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const importedData = JSON.parse(text);

            // Uses your existing db:create-project RPC method
            await rpc.request['db:create-project']({
                id: crypto.randomUUID(),
                name: importedData.name || file.name.replace(/\.[^/.]+$/, ''),
                path: null,
                metadata: null,
                description: importedData.description || null,
                systemPrompt: null,
                coverImageId: null,
                coverImagesArray: [],
                contentRating: 'general',
                projectScope: importedData.projectScope || 'standard',
                seriesArch: null,
                seriesId: null,
                pov: null,
                pacing: null,
                workType: null,
                projectStructure: null,
                targetAge: null,
                projectStatus: 'planning',
                tonalType: null,
                primaryGenre: null,
                primaryTheme: null,
                genres: [],
                tags: [],
                themes: [],
            });
            loadProjects();
            onProjectUpdated?.();
        } catch (err) {
            console.error('Failed to import project:', err);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    function handleSelectProject(projectId: string) {
        if (onSelectProject) {
            onSelectProject(projectId);
        }
        onClose();
    }

    function handleRenameRequest(projectId: string) {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
            setRenameTargetId(projectId);
            setRenameValue(project.name);
            setShowRenameModal(true);
        }
    }

    async function handleRenameConfirm() {
        if (!renameTargetId || !renameValue.trim()) return;
        try {
            await rpc.request['db:update-project']({
                id: renameTargetId,
                data: { name: renameValue.trim() },
            });
            setShowRenameModal(false);
            setRenameTargetId(null);
            setRenameValue('');
            loadProjects();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to rename project:', e);
        }
    }

    function handleDeleteRequest(projectId: string) {
        setDeleteTargetId(projectId);
        setShowDeleteConfirm(true);
    }

    async function handleDeleteConfirm() {
        if (!deleteTargetId) return;
        try {
            await rpc.request['db:delete-project'](deleteTargetId);
            setShowDeleteConfirm(false);
            setDeleteTargetId(null);
            loadProjects();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to delete project:', e);
        }
    }

    function handleChangeCoverRequest(projectId: string) {
        setAssetPickerTargetId(projectId);
        setShowAssetPicker(true);
    }

    async function handleCoverSelected(assetId: string) {
        if (!assetPickerTargetId) return;
        try {
            await rpc.request['db:update-project']({
                id: assetPickerTargetId,
                data: { coverImageId: assetId },
            });
            setShowAssetPicker(false);
            setAssetPickerTargetId(null);
            loadProjects();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to update cover:', e);
        }
    }

    async function loadSeries() {
        setSeriesLoading(true);
        try {
            const result = await rpc.request['db:list-series']();
            setSeriesList(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load series:', e);
        } finally {
            setSeriesLoading(false);
        }
    }

    async function handleSeriesCreate() {
        if (!seriesCreateName.trim()) return;
        const data: NewSeries = {
            id: crypto.randomUUID(),
            name: seriesCreateName.trim(),
            description: seriesCreateDesc.trim() || null,
            seriesArch: seriesCreateArch,
            coverImageId: null,
        };
        await rpc.request['db:create-series'](data);
        setSeriesCreateName('');
        setSeriesCreateDesc('');
        setSeriesCreateArch('ongoing');
        setShowSeriesCreate(false);
        loadSeries();
        onProjectUpdated?.();
    }

    function handleSeriesEditOpen(s: Series) {
        setSeriesEditId(s.id);
        setSeriesEditName(s.name);
        setSeriesEditDesc(s.description || '');
        setSeriesEditArch(s.seriesArch || 'ongoing');
        setShowSeriesEdit(true);
    }

    async function handleSeriesEditSave() {
        if (!seriesEditId || !seriesEditName.trim()) return;
        await rpc.request['db:update-series']({
            id: seriesEditId,
            data: {
                name: seriesEditName.trim(),
                description: seriesEditDesc.trim() || null,
                seriesArch: seriesEditArch,
            },
        });
        setShowSeriesEdit(false);
        setSeriesEditId(null);
        loadSeries();
        onProjectUpdated?.();
    }

    async function handleSeriesDeleteConfirm() {
        if (!seriesDeleteId) return;
        await rpc.request['db:delete-series'](seriesDeleteId);
        setShowSeriesDelete(false);
        setSeriesDeleteId(null);
        loadSeries();
        onProjectUpdated?.();
    }

    async function handleSeriesViewProjects(s: Series) {
        setSeriesProjectsName(s.name);
        try {
            const result = await rpc.request['db:get-series-projects'](s.id);
            setSeriesProjects(Array.isArray(result) ? result : []);
        } catch {
            setSeriesProjects([]);
        }
        setShowSeriesProjects(true);
    }

    function toggleGenre(genreId: string) {
        setSelectedGenres((prev) =>
            prev.includes(genreId)
                ? prev.filter((id) => id !== genreId)
                : [...prev, genreId]
        );
    }

    function toggleTag(tagId: string) {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        );
    }

    const renameProject = renameTargetId
        ? projects.find((p) => p.id === renameTargetId)
        : null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Projects"
            id={styles.projectsDialog}
        >
            <div className={styles.toolbar}>
                <div className={styles.leftButtonGroup}>
                    <button
                        type="button"
                        className={`${styles.blueBtn} ${!showSeries ? styles.activeBlue : ''}`}
                        onClick={() => setShowSeries(false)}
                    >
                        Projects
                    </button>
                    <button
                        type="button"
                        className={`${styles.blueBtn} ${showSeries ? styles.activeBlue : ''}`}
                        onClick={() => setShowSeries(true)}
                    >
                        Series
                    </button>
                    {!showSeries ? (
                        <button
                            type="button"
                            className={styles.blueBtn}
                            onClick={() => setShowCreateModal(true)}
                        >
                            New Project
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.blueBtn}
                            onClick={() => setShowSeriesCreate(true)}
                        >
                            New Series
                        </button>
                    )}
                </div>

                <div className={styles.rightButtonGroup}>
                    <button
                        type="button"
                        className={styles.blackBtn}
                        onClick={() => setShowSeries(true)}
                    >
                        Manage Series
                    </button>
                    <button
                        type="button"
                        className={styles.blackBtn}
                        onClick={handleImportClick}
                    >
                        Import
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        style={{ display: 'none' }}
                        accept=".json,.zip,.txt"
                    />
                </div>
            </div>

            {!showSeries ? (
                loading ? (
                    <div className={styles.emptyState}>Loading...</div>
                ) : (
                    <div className={styles.booksGrid}>
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onSelect={
                                    onSelectProject
                                        ? handleSelectProject
                                        : undefined
                                }
                                onRename={handleRenameRequest}
                                onChangeCover={handleChangeCoverRequest}
                                onDelete={handleDeleteRequest}
                            />
                        ))}
                    </div>
                )
            ) : (
                <div className={styles.seriesContainer}>
                    {seriesLoading ? (
                        <div className={styles.emptyState}>Loading...</div>
                    ) : seriesList.length === 0 ? (
                        <div className={styles.emptyState}>
                            No series yet. Create one to group your projects.
                        </div>
                    ) : (
                        seriesList.map((s) => (
                            <div key={s.id} className={styles.seriesRow}>
                                <div>
                                    <strong style={{ color: '#fff' }}>
                                        {s.name}
                                    </strong>
                                    {s.seriesArch && (
                                        <span
                                            className={styles.seriesArchBadge}
                                        >
                                            ({s.seriesArch})
                                        </span>
                                    )}
                                    {s.projectCount !== undefined && (
                                        <span
                                            className={styles.seriesArchBadge}
                                        >
                                            — {s.projectCount} project
                                            {s.projectCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {s.description && (
                                        <div className={styles.seriesDesc}>
                                            {s.description}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className={styles.blackBtn}
                                        onClick={() =>
                                            handleSeriesViewProjects(s)
                                        }
                                    >
                                        Projects
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.blackBtn}
                                        onClick={() => handleSeriesEditOpen(s)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.deleteSeriesBtn}
                                        onClick={() => {
                                            setSeriesDeleteId(s.id);
                                            setShowSeriesDelete(true);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showCreateModal && (
                <SubDialog
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    title="Create New Project"
                >
                    <div className={styles.formGroup}>
                        <label>Project Name</label>
                        <input
                            type="text"
                            placeholder="My Novel"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleCreateProject()
                            }
                            autoFocus
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Project Scope</label>
                        <select
                            value={selectedProjectScope}
                            onChange={(e) =>
                                setSelectedProjectScope(
                                    e.target.value as ProjectScope
                                )
                            }
                        >
                            {projectScopes.map((scope) => (
                                <option key={scope.value} value={scope.value}>
                                    {scope.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Genres</label>
                        <div className={styles.tagSelector}>
                            {availableGenres.map((genre) => (
                                <button
                                    key={genre.id}
                                    type="button"
                                    className={`${styles.tagBtn} ${selectedGenres.includes(genre.id) ? styles.selectedTag : ''}`}
                                    onClick={() => toggleGenre(genre.id)}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                        <div className={styles.customInputRow}>
                            <input
                                type="text"
                                placeholder="Add custom genre..."
                                value={customGenre}
                                onChange={(e) => setCustomGenre(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' &&
                                    (e.preventDefault(), handleAddCustomGenre())
                                }
                            />
                            <button
                                type="button"
                                className={styles.blackBtn}
                                onClick={handleAddCustomGenre}
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Tags</label>
                        <div className={styles.tagSelector}>
                            {availableTags.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className={`${styles.tagBtn} ${selectedTags.includes(tag.id) ? styles.selectedTag : ''}`}
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        <div className={styles.customInputRow}>
                            <input
                                type="text"
                                placeholder="Add custom tag..."
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' &&
                                    (e.preventDefault(), handleAddCustomTag())
                                }
                            />
                            <button
                                type="button"
                                className={styles.blackBtn}
                                onClick={handleAddCustomTag}
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.blackBtn}
                            onClick={() => setShowCreateModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.blueBtn}
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </SubDialog>
            )}

            {showRenameModal && renameProject && (
                <SubDialog
                    open={showRenameModal}
                    onClose={() => setShowRenameModal(false)}
                    title="Rename Project"
                >
                    <div className={styles.formGroup}>
                        <label>Project Name</label>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleRenameConfirm()
                            }
                            autoFocus
                        />
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.blackBtn}
                            onClick={() => setShowRenameModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.blueBtn}
                            onClick={handleRenameConfirm}
                            disabled={!renameValue.trim()}
                        >
                            Rename
                        </button>
                    </div>
                </SubDialog>
            )}

            {showDeleteConfirm && deleteTargetId && (
                <SubDialog
                    open={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    title="Delete Project"
                >
                    <p style={{ color: '#ccc', margin: '0 0 16px 0' }}>
                        Are you sure you want to delete "
                        {projects.find((p) => p.id === deleteTargetId)?.name}"?
                    </p>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.blackBtn}
                            onClick={() => setShowDeleteConfirm(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={handleDeleteConfirm}
                        >
                            Delete
                        </button>
                    </div>
                </SubDialog>
            )}

            {showSeriesCreate && (
                <SubDialog
                    open={showSeriesCreate}
                    onClose={() => setShowSeriesCreate(false)}
                    title="Create Series"
                >
                    <div className={styles.formGroup}>
                        <label>Series Name</label>
                        <input
                            type="text"
                            value={seriesCreateName}
                            onChange={(e) =>
                                setSeriesCreateName(e.target.value)
                            }
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleSeriesCreate()
                            }
                            autoFocus
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                            value={seriesCreateDesc}
                            onChange={(e) =>
                                setSeriesCreateDesc(e.target.value)
                            }
                            rows={3}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Architecture</label>
                        <select
                            value={seriesCreateArch}
                            onChange={(e) =>
                                setSeriesCreateArch(
                                    e.target.value as SeriesArchitecture
                                )
                            }
                        >
                            {seriesArchOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.blackBtn}
                            onClick={() => setShowSeriesCreate(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.blueBtn}
                            onClick={handleSeriesCreate}
                            disabled={!seriesCreateName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </SubDialog>
            )}

            {showSeriesEdit && seriesEditId && (
                <SubDialog
                    open={showSeriesEdit}
                    onClose={() => setShowSeriesEdit(false)}
                    title="Edit Series"
                >
                    <div className={styles.formGroup}>
                        <label>Series Name</label>
                        <input
                            type="text"
                            value={seriesEditName}
                            onChange={(e) => setSeriesEditName(e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Description</label>
                        <textarea
                            value={seriesEditDesc}
                            onChange={(e) => setSeriesEditDesc(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Architecture</label>
                        <select
                            value={seriesEditArch}
                            onChange={(e) =>
                                setSeriesEditArch(
                                    e.target.value as SeriesArchitecture
                                )
                            }
                        >
                            {seriesArchOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.blackBtn}
                            onClick={() => setShowSeriesEdit(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.blueBtn}
                            onClick={handleSeriesEditSave}
                            disabled={!seriesEditName.trim()}
                        >
                            Save
                        </button>
                    </div>
                </SubDialog>
            )}

            {showSeriesDelete && seriesDeleteId && (
                <SubDialog
                    open={showSeriesDelete}
                    onClose={() => setShowSeriesDelete(false)}
                    title="Delete Series"
                >
                    <p style={{ color: '#ccc', margin: '0 0 16px 0' }}>
                        Are you sure you want to delete this series?
                    </p>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.blackBtn}
                            onClick={() => setShowSeriesDelete(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={handleSeriesDeleteConfirm}
                        >
                            Delete
                        </button>
                    </div>
                </SubDialog>
            )}

            {showSeriesProjects && (
                <SubDialog
                    open={showSeriesProjects}
                    onClose={() => setShowSeriesProjects(false)}
                    title={`Projects in "${seriesProjectsName}"`}
                >
                    {seriesProjects.length === 0 ? (
                        <p style={{ color: '#888' }}>
                            No projects in this series yet.
                        </p>
                    ) : (
                        <ul style={{ color: '#eee', paddingLeft: '20px' }}>
                            {seriesProjects.map((p) => (
                                <li key={p.id} style={{ marginBottom: '6px' }}>
                                    {p.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </SubDialog>
            )}

            <div style={{ display: 'none' }}>
                <span id={assetPickerTargetId || ''} />
            </div>
        </Dialog>
    );
}
