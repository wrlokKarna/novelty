import { useState, useEffect } from 'react';
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
import ProjectCard from '../components/cards/projectCard';
import AssetPicker from '../components/AssetPicker';
import styles from './ProjectsDialog.module.css';

const seriesArchOptions: { value: SeriesArchitecture; label: string }[] = [
    { value: 'duology', label: 'Duology' },
    { value: 'trilogy', label: 'Trilogy' },
    { value: 'ongoing', label: 'Ongoing' },
];

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
        } catch (e) {
            console.error('Failed to create project:', e);
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setShowSeries(false)}
                        style={!showSeries ? { background: '#4A9EFF' } : {}}
                    >
                        Projects
                    </button>
                    <button
                        onClick={() => setShowSeries(true)}
                        style={showSeries ? { background: '#4A9EFF' } : {}}
                    >
                        Series
                    </button>
                </div>
                {!showSeries ? (
                    <button onClick={() => setShowCreateModal(true)}>
                        New Project
                    </button>
                ) : (
                    <button onClick={() => setShowSeriesCreate(true)}>
                        New Series
                    </button>
                )}
            </div>
            {!showSeries ? (
                loading ? (
                    <div className={styles.content}>Loading...</div>
                ) : (
                    <div className={styles.content}>
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
                <div
                    className={styles.content}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        padding: '1rem',
                    }}
                >
                    {seriesLoading ? (
                        <div>Loading...</div>
                    ) : seriesList.length === 0 ? (
                        <div
                            style={{
                                color: '#888',
                                textAlign: 'center',
                                padding: '2rem',
                            }}
                        >
                            No series yet. Create one to group your projects.
                        </div>
                    ) : (
                        seriesList.map((s) => (
                            <div
                                key={s.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    border: '1px solid var(--border, #333)',
                                    borderRadius: '6px',
                                }}
                            >
                                <div>
                                    <strong>{s.name}</strong>
                                    {s.seriesArch && (
                                        <span
                                            style={{
                                                marginLeft: '0.5rem',
                                                color: '#888',
                                                fontSize: '0.85em',
                                            }}
                                        >
                                            ({s.seriesArch})
                                        </span>
                                    )}
                                    {s.projectCount !== undefined && (
                                        <span
                                            style={{
                                                marginLeft: '0.5rem',
                                                color: '#888',
                                                fontSize: '0.85em',
                                            }}
                                        >
                                            — {s.projectCount} project
                                            {s.projectCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {s.description && (
                                        <div
                                            style={{
                                                fontSize: '0.85em',
                                                color: '#666',
                                                marginTop: '0.25rem',
                                            }}
                                        >
                                            {s.description}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() =>
                                            handleSeriesViewProjects(s)
                                        }
                                    >
                                        Projects
                                    </button>
                                    <button
                                        onClick={() => handleSeriesEditOpen(s)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSeriesDeleteId(s.id);
                                            setShowSeriesDelete(true);
                                        }}
                                        style={{ color: '#e74c3c' }}
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
                                    className={`${styles.tagBtn} ${selectedGenres.includes(genre.id) ? styles.selected : ''}`}
                                    onClick={() => toggleGenre(genre.id)}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                        <div className={styles.customTagInput}>
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
                                    className={`${styles.tagBtn} ${selectedTags.includes(tag.id) ? styles.selected : ''}`}
                                    onClick={() => toggleTag(tag.id)}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                        <div className={styles.customTagInput}>
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
                            <button type="button" onClick={handleAddCustomTag}>
                                Add
                            </button>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button onClick={() => setShowCreateModal(false)}>
                            Cancel
                        </button>
                        <button
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
                        <button onClick={() => setShowRenameModal(false)}>
                            Cancel
                        </button>
                        <button
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
                    <p>
                        Are you sure you want to delete "
                        {projects.find((p) => p.id === deleteTargetId)?.name}"?
                    </p>
                    <div className={styles.actions}>
                        <button onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteConfirm}
                            className={styles.dangerBtn}
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
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}
                    >
                        <div>
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
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label>Description</label>
                            <textarea
                                value={seriesCreateDesc}
                                onChange={(e) =>
                                    setSeriesCreateDesc(e.target.value)
                                }
                                rows={3}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label>Architecture</label>
                            <select
                                value={seriesCreateArch}
                                onChange={(e) =>
                                    setSeriesCreateArch(
                                        e.target.value as SeriesArchitecture
                                    )
                                }
                                style={{ width: '100%' }}
                            >
                                {seriesArchOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '0.5rem',
                                marginTop: '0.5rem',
                            }}
                        >
                            <button onClick={() => setShowSeriesCreate(false)}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSeriesCreate}
                                disabled={!seriesCreateName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </SubDialog>
            )}

            {showSeriesEdit && seriesEditId && (
                <SubDialog
                    open={showSeriesEdit}
                    onClose={() => setShowSeriesEdit(false)}
                    title="Edit Series"
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}
                    >
                        <div>
                            <label>Series Name</label>
                            <input
                                type="text"
                                value={seriesEditName}
                                onChange={(e) =>
                                    setSeriesEditName(e.target.value)
                                }
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label>Description</label>
                            <textarea
                                value={seriesEditDesc}
                                onChange={(e) =>
                                    setSeriesEditDesc(e.target.value)
                                }
                                rows={3}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label>Architecture</label>
                            <select
                                value={seriesEditArch}
                                onChange={(e) =>
                                    setSeriesEditArch(
                                        e.target.value as SeriesArchitecture
                                    )
                                }
                                style={{ width: '100%' }}
                            >
                                {seriesArchOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '0.5rem',
                                marginTop: '0.5rem',
                            }}
                        >
                            <button onClick={() => setShowSeriesEdit(false)}>
                                Cancel
                            </button>
                            <button
                                onClick={handleSeriesEditSave}
                                disabled={!seriesEditName.trim()}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </SubDialog>
            )}

            {showSeriesDelete && seriesDeleteId && (
                <SubDialog
                    open={showSeriesDelete}
                    onClose={() => setShowSeriesDelete(false)}
                    title="Delete Series"
                >
                    <p>Are you sure you want to delete this series?</p>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.5rem',
                            marginTop: '0.5rem',
                        }}
                    >
                        <button onClick={() => setShowSeriesDelete(false)}>
                            Cancel
                        </button>
                        <button
                            onClick={handleSeriesDeleteConfirm}
                            style={{ color: '#e74c3c' }}
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
                        <p>No projects in this series yet.</p>
                    ) : (
                        <ul>
                            {seriesProjects.map((p) => (
                                <li key={p.id}>{p.name}</li>
                            ))}
                        </ul>
                    )}
                </SubDialog>
            )}

            <AssetPicker
                open={showAssetPicker}
                onClose={() => setShowAssetPicker(false)}
                onSelect={handleCoverSelected}
                projectId={assetPickerTargetId || ''}
            />
        </Dialog>
    );
}
