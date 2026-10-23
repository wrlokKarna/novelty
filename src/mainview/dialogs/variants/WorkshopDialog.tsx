import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import Dialog from '../Dialog';
import SubDialog from '../SubDialog';
import AssetPicker from './AssetPicker';
import SeriesCard from '../../components/cards/SeriesCard';
import ProjectCard from '../../components/cards/ProjectCard';
import { useRPC } from '../../contexts/RPCContext';
import type {
    Project,
    NewProject,
    ProjectScope,
    Genre,
    Tag,
    Series,
    NewSeries,
    SeriesArchitecture,
} from '../../types/index';
import styles from './WorkshopDialog.module.css';
import { IconGridDots, IconLayoutGrid } from '@tabler/icons-react';
import { groupAndSort } from '../../features/workshop/workshop_utils';

const seriesArchOptions: { value: SeriesArchitecture; label: string }[] = [
    { value: 'duology', label: 'Duology' },
    { value: 'trilogy', label: 'Trilogy' },
    { value: 'ongoing', label: 'Ongoing' },
];

interface ToastState {
    message: string;
    undo?: () => void;
}

export default function WorkshopDialog({
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

    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [assetPickerTargetId, setAssetPickerTargetId] = useState<
        string | null
    >(null);

    const rpc = useRPC();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [seriesList, setSeriesList] = useState<Series[]>([]);

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

    const [cardSize, setCardSize] = useState<'small' | 'large'>('small');
    const [searchQuery, setSearchQuery] = useState('');

    const [toast, setToast] = useState<ToastState | null>(null);
    const toastTimerRef = useRef<number | null>(null);

    const projectScopes: { value: ProjectScope; label: string }[] = [
        { value: 'fast_paced', label: 'Fast-Paced / Pulp' },
        { value: 'standard', label: 'Standard Novel' },
        { value: 'epic', label: 'Epic / Sprawling' },
    ];

    function showToast(message: string, undo?: () => void) {
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
        setToast({ message, undo });
        toastTimerRef.current = window.setTimeout(() => setToast(null), 6000);
    }

    useEffect(() => {
        if (open) {
            setLoading(true);
            setSearchQuery('');
            loadProjects();
            loadGenresAndTags();
            loadSeries();
        }
    }, [open]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current !== null) {
                window.clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    async function loadProjects() {
        try {
            const result = await rpc.request['db:get-projects']();
            setProjects(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load projects:', e);
            showToast('Failed to load projects');
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
            showToast('Failed to load genres/tags');
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
            showToast('Failed to create genre');
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
            showToast('Failed to create tag');
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
            const created = await rpc.request['db:create-project'](newProject);
            const genreNames = availableGenres
                .filter((g) => selectedGenres.includes(g.id))
                .map((g) => g.name);
            const tagNames = availableTags
                .filter((t) => selectedTags.includes(t.id))
                .map((t) => t.name);
            if (genreNames.length || tagNames.length) {
                try {
                    await rpc.request['db:update-project']({
                        id: created.id,
                        data: { genres: genreNames, tags: tagNames },
                    });
                } catch (e) {
                    console.error('Failed to save genres/tags:', e);
                    showToast(
                        'Project created, but genres/tags failed to save'
                    );
                }
            }
            setNewProjectName('');
            setSelectedProjectScope('standard');
            setSelectedGenres([]);
            setSelectedTags([]);
            setShowCreateModal(false);
            loadProjects();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to create project:', e);
            showToast('Failed to create project');
        }
    }

    function handleImportClick() {
        fileInputRef.current?.click();
    }

    async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await rpc.request['db:create-project']({
                id: crypto.randomUUID(),
                name: file.name.replace(/\.[^/.]+$/, ''),
                path: null,
                metadata: null,
                description: null,
                systemPrompt: null,
                coverImageId: null,
                coverImagesArray: [],
                contentRating: 'general',
                projectScope: 'standard',
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
            showToast('Failed to import project');
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
            showToast('Failed to rename project');
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
            showToast('Failed to update cover');
        }
    }

    async function loadSeries() {
        try {
            const result = await rpc.request['db:list-series']();
            setSeriesList(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load series:', e);
            showToast('Failed to load series');
        }
    }

    async function handleSeriesCreate() {
        if (!seriesCreateName.trim()) return;
        try {
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
        } catch (e) {
            console.error('Failed to create series:', e);
            showToast('Failed to create series');
        }
    }

    function handleSeriesEditOpen(seriesId: string) {
        const s = seriesList.find((item) => item.id === seriesId);
        if (!s) return;
        setSeriesEditId(s.id);
        setSeriesEditName(s.name);
        setSeriesEditDesc(s.description || '');
        setSeriesEditArch(s.seriesArch || 'ongoing');
        setShowSeriesEdit(true);
    }

    async function handleSeriesEditSave() {
        if (!seriesEditId || !seriesEditName.trim()) return;
        try {
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
        } catch (e) {
            console.error('Failed to edit series:', e);
            showToast('Failed to edit series');
        }
    }

    async function handleSeriesDeleteConfirm() {
        if (!seriesDeleteId) return;
        try {
            await rpc.request['db:delete-series'](seriesDeleteId);
            setShowSeriesDelete(false);
            setSeriesDeleteId(null);
            loadSeries();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to delete series:', e);
            showToast('Failed to delete series');
        }
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

    const q = searchQuery.trim().toLowerCase();
    const filteredProjects = useMemo(
        () =>
            q
                ? projects.filter((p) => p.name.toLowerCase().includes(q))
                : projects,
        [projects, q]
    );
    const groupedWorks = useMemo(
        () => groupAndSort(filteredProjects),
        [filteredProjects]
    );

    const emptySeries = useMemo(() => {
        const seriesIdsWithProjects = new Set(
            projects.map((p) => p.seriesId).filter(Boolean)
        );
        return seriesList.filter(
            (s) =>
                !seriesIdsWithProjects.has(s.id) &&
                (!q ||
                    s.name.toLowerCase().includes(q) ||
                    (s.description?.toLowerCase().includes(q) ?? false))
        );
    }, [seriesList, projects, q]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Workshop"
            id={styles.workshopDialog}
            search={{
                value: searchQuery,
                onChange: setSearchQuery,
                placeholder: 'Search projects...',
            }}
        >
            {/* TOOLBAR */}
            <div className={styles.toolbar}>
                <div className={styles.buttonGroup}>
                    <button
                        type="button"
                        className={styles.floatingPillBtn}
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
                    <button
                        type="button"
                        className={styles.floatingPillBtn}
                        onClick={() => setShowCreateModal(true)}
                    >
                        New Project
                    </button>
                    <button
                        type="button"
                        className={styles.floatingPillBtn}
                        onClick={() => setShowSeriesCreate(true)}
                    >
                        New Series
                    </button>
                    <div className={styles.viewToggle}>
                        <button
                            type="button"
                            className={`${styles.floatingPillBtn} ${cardSize === 'small' ? styles.floatingPillActive : ''}`}
                            onClick={() => setCardSize('small')}
                            title="Compact view"
                        >
                            <IconGridDots size={14} />
                        </button>
                        <button
                            type="button"
                            className={`${styles.floatingPillBtn} ${cardSize === 'large' ? styles.floatingPillActive : ''}`}
                            onClick={() => setCardSize('large')}
                            title="Large view"
                        >
                            <IconLayoutGrid size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {loading ? (
                <div className={styles.emptyState}>Loading...</div>
            ) : projects.length === 0 && seriesList.length === 0 ? (
                <div className={styles.emptyState}>
                    No projects yet. Create one or import.
                </div>
            ) : groupedWorks.length === 0 && emptySeries.length === 0 ? (
                <div className={styles.emptyState}>
                    No projects matching '{searchQuery}'
                </div>
            ) : (
                <div
                    className={`${styles.worksCont} ${
                        cardSize === 'small' ? styles.smallCard : ''
                    }`}
                >
                    {groupedWorks.map((work) => (
                        <Fragment
                            key={
                                Array.isArray(work)
                                    ? work[0]?.seriesId || 'series'
                                    : work.id
                            }
                        >
                            {Array.isArray(work) ? (
                                <SeriesCard
                                    seriesId={work[0]?.seriesId ?? ''}
                                    seriesData={work}
                                    seriesArr={seriesList}
                                    onSelect={
                                        onSelectProject
                                            ? handleSelectProject
                                            : undefined
                                    }
                                    onRename={handleRenameRequest}
                                    onChangeCover={handleChangeCoverRequest}
                                    onEditSeries={handleSeriesEditOpen}
                                    onDeleteSeries={(seriesId) => {
                                        setSeriesDeleteId(seriesId);
                                        setShowSeriesDelete(true);
                                    }}
                                />
                            ) : (
                                <ProjectCard
                                    key={work.id}
                                    project={work}
                                    onSelect={
                                        onSelectProject
                                            ? handleSelectProject
                                            : undefined
                                    }
                                    onRename={handleRenameRequest}
                                    onChangeCover={handleChangeCoverRequest}
                                />
                            )}
                        </Fragment>
                    ))}
                    {emptySeries.map((s) => (
                        <SeriesCard
                            key={s.id}
                            seriesId={s.id}
                            seriesData={[]}
                            seriesArr={seriesList}
                            onEditSeries={handleSeriesEditOpen}
                            onDeleteSeries={(seriesId) => {
                                setSeriesDeleteId(seriesId);
                                setShowSeriesDelete(true);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* SUBDIALOGS */}
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
                                    className={`${styles.tagBtn} ${
                                        selectedGenres.includes(genre.id)
                                            ? styles.selectedTag
                                            : ''
                                    }`}
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
                                className={styles.modalBtn}
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
                                    className={`${styles.tagBtn} ${
                                        selectedTags.includes(tag.id)
                                            ? styles.selectedTag
                                            : ''
                                    }`}
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
                                className={styles.modalBtn}
                                onClick={handleAddCustomTag}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.modalBtn}
                            onClick={() => setShowCreateModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.modalPrimaryBtn}
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
                            className={styles.modalBtn}
                            onClick={() => setShowRenameModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.modalPrimaryBtn}
                            onClick={handleRenameConfirm}
                            disabled={!renameValue.trim()}
                        >
                            Rename
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
                            className={styles.modalBtn}
                            onClick={() => setShowSeriesCreate(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.modalPrimaryBtn}
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
                            className={styles.modalBtn}
                            onClick={() => setShowSeriesEdit(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={styles.modalPrimaryBtn}
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
                            className={styles.modalBtn}
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

            <AssetPicker
                open={showAssetPicker}
                onClose={() => {
                    setShowAssetPicker(false);
                    setAssetPickerTargetId(null);
                }}
                onSelect={handleCoverSelected}
                projectId={assetPickerTargetId ?? ''}
                selectedAssetId={
                    projects.find((p) => p.id === assetPickerTargetId)
                        ?.coverImageId ?? null
                }
            />

            {toast && (
                <div className={styles.toast} role="status">
                    <span>{toast.message}</span>
                    {toast.undo && (
                        <button
                            className={styles.toastAction}
                            onClick={toast.undo}
                        >
                            Undo
                        </button>
                    )}
                </div>
            )}
        </Dialog>
    );
}
