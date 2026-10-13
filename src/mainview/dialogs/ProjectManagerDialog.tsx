import { useState, useEffect, useRef } from 'react';
import Dialog from '../components/Dialog';
import SubDialog from '../components/SubDialog';
import AssetPicker from '../components/AssetPicker';
import { useRPC } from '../contexts/RPCContext';
import type {
    Project,
    ProjectScope,
    SeriesArchitecture,
    PointOfView,
    PacingType,
    WorkType,
    ProjectStructure,
    TargetAgeGroup,
    ProjectStatus,
    Genre,
    Tag,
    Theme,
    Asset,
    Series,
    NewSeries,
    Inspiration,
    NewInspiration,
    CompendiumCategory,
} from '../types/index';
import { PREDEFINED_ASPECTS } from '../types/index';
import { PROJECT_SCOPE_TARGETS } from '../types/index';
import {
    IconCheck,
    IconPhoto,
    IconPlus,
    IconTrash,
    IconAlertTriangle,
    IconStarFilled,
    IconX,
} from '@tabler/icons-react';
import TemplateManagerTab from '../components/TemplateManagerTab';
import IconTextSideBar from '../ui/layout/IconTextSideBar';
import {
    PROJECT_DIALOG_TABS,
    PROJECT_DIALOG_TABS_ICONS,
    ProjectDialogActiveTab,
} from '../constants/layout_tabs';

import SplitDialogLayout from '../ui/layout/SplitDialogLayout';

import styles from './ProjectsDialog.module.css';
import localStyles from './ProjectManagerDialog.module.css';
import dialogStyles from './../components/Dialog.module.css';

interface ProjectManagerProps {
    open: boolean;
    onClose: () => void;
    project: Project | null;
    onProjectUpdated?: () => void;
    onTemplatesChanged?: () => void;
    initialTab?: ProjectDialogActiveTab;
    initialCategory?: CompendiumCategory;
}

const projectScopes: { value: ProjectScope; label: string }[] = [
    { value: 'fast_paced', label: 'Fast-Paced / Pulp' },
    { value: 'standard', label: 'Standard Novel' },
    { value: 'epic', label: 'Epic / Sprawling' },
];

const seriesOptions: { value: SeriesArchitecture; label: string }[] = [
    { value: 'standalone', label: 'Standalone' },
    { value: 'duology', label: 'Duology' },
    { value: 'trilogy', label: 'Trilogy' },
    { value: 'ongoing', label: 'Ongoing' },
];

const povOptions: { value: PointOfView; label: string }[] = [
    { value: 'single', label: 'Single POV' },
    { value: 'multiple', label: 'Multiple POV' },
    { value: 'omniscient', label: 'Omniscient' },
];

const pacingOptions: { value: PacingType; label: string }[] = [
    { value: 'fast_paced', label: 'Fast Paced' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'deep_dive', label: 'Deep Dive' },
];

const workTypeOptions: { value: WorkType; label: string }[] = [
    { value: 'original', label: 'Original Work' },
    { value: 'fanfiction', label: 'Fan Fiction' },
    { value: 'adaptation', label: 'Adaptation' },
    { value: 'derivative', label: 'Derivative' },
    { value: 'parody', label: 'Parody' },
    { value: 'translation', label: 'Translation' },
    { value: 'transformative', label: 'Transformative' },
];

const projectStructureOptions: { value: ProjectStructure; label: string }[] = [
    { value: 'oneshot', label: 'One-shot' },
    { value: 'standalone', label: 'Standalone' },
    { value: 'serials', label: 'Serials' },
    { value: 'episodic', label: 'Episodic' },
    { value: 'anthology', label: 'Anthology' },
    { value: 'series', label: 'Series' },
    { value: 'seasonal', label: 'Seasonal' },
];

const targetAgeOptions: { value: TargetAgeGroup; label: string }[] = [
    { value: 'children', label: 'Children' },
    { value: 'middle_grade', label: 'Middle Grade' },
    { value: 'young_adult', label: 'Young Adult (YA)' },
    { value: 'new_adult', label: 'New Adult (NA)' },
    { value: 'adult', label: 'Adult' },
];

const projectStatusOptions: { value: ProjectStatus; label: string }[] = [
    { value: 'planning', label: 'Planning' },
    { value: 'drafting', label: 'Drafting' },
    { value: 'revising', label: 'Revising' },
    { value: 'completed', label: 'Completed' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'published', label: 'Published' },
];

const contentRatingOptions: { value: string; label: string }[] = [
    { value: 'G', label: 'G — General Audiences' },
    { value: 'PG', label: 'PG — Parental Guidance' },
    { value: 'PG-13', label: 'PG-13 — Teens 13+' },
    { value: 'R', label: 'R — Restricted' },
    { value: 'NC-17', label: 'NC-17 — Adults Only' },
    { value: 'Unrated', label: 'Unrated' },
];

export default function ProjectManager({
    open,
    onClose,
    project,
    onProjectUpdated,
    onTemplatesChanged,
    initialTab,
    initialCategory,
}: ProjectManagerProps) {
    const rpc = useRPC();
    const [activeTab, setActiveTab] = useState<ProjectDialogActiveTab>(
        initialTab ?? 'general'
    );

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [projectScope, setProjectScope] = useState<ProjectScope>('standard');

    const [pov, setPov] = useState<PointOfView>('single');
    const [pacing, setPacing] = useState<PacingType>('balanced');
    const [workType, setWorkType] = useState<WorkType>('original');
    const [projectStructure, setProjectStructure] =
        useState<ProjectStructure>('standalone');
    const [targetAge, setTargetAge] = useState<TargetAgeGroup | null>(null);
    const [projectStatus, setProjectStatus] =
        useState<ProjectStatus>('planning');
    const [inspirations, setInspirations] = useState<Inspiration[]>([]);
    const [primaryGenre, setPrimaryGenre] = useState<string | null>(null);
    const [tonalType, setTonalType] = useState('');
    const [contentRating, setContentRating] = useState('Unrated');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
    const [primaryTheme, setPrimaryTheme] = useState<string | null>(null);
    const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
    const [customGenre, setCustomGenre] = useState('');
    const [customTag, setCustomTag] = useState('');
    const [customTheme, setCustomTheme] = useState('');
    const [coverImageSrc, setCoverImageSrc] = useState<string | null>(null);

    const [projectAssets, setProjectAssets] = useState<Asset[]>([]);
    const [loadingCovers, setLoadingCovers] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(
        null
    );
    const [showCreateSeries, setShowCreateSeries] = useState(false);
    const [newSeriesName, setNewSeriesName] = useState('');
    const [newSeriesDesc, setNewSeriesDesc] = useState('');
    const [newSeriesArch, setNewSeriesArch] =
        useState<SeriesArchitecture>('ongoing');

    const [showGenreDropdown, setShowGenreDropdown] = useState(false);
    const [showTagDropdown, setShowTagDropdown] = useState(false);
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [showGenrePrimaryDropdown, setShowGenrePrimaryDropdown] =
        useState(false);
    const [showThemePrimaryDropdown, setShowThemePrimaryDropdown] =
        useState(false);
    const genreDropdownRef = useRef<HTMLDivElement>(null);
    const tagDropdownRef = useRef<HTMLDivElement>(null);
    const themeDropdownRef = useRef<HTMLDivElement>(null);
    const genrePrimaryDropdownRef = useRef<HTMLDivElement>(null);
    const themePrimaryDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && project) {
            setName(project.name);
            setProjectScope(project.projectScope ?? 'standard');
            setPov(project.pov ?? 'single');
            setPacing(project.pacing ?? 'balanced');
            setWorkType(project.workType ?? 'original');
            setProjectStructure(project.projectStructure ?? 'standalone');
            setTargetAge(project.targetAge ?? null);
            setProjectStatus(project.projectStatus ?? 'planning');
            setTonalType(project.tonalType ?? '');
            setContentRating(project.contentRating ?? 'Unrated');
            setPrimaryGenre(project.primaryGenre ?? null);
            setPrimaryTheme(project.primaryTheme ?? null);
            setSelectedGenres(
                Array.isArray(project.genres) ? project.genres : []
            );
            setSelectedTags(Array.isArray(project.tags) ? project.tags : []);
            setSelectedThemes(
                Array.isArray(project.themes) ? project.themes : []
            );
            setSelectedSeriesId(project.seriesId || null);
            setHasChanges(false);
            setDescription('');
            if (project.metadata) {
                try {
                    const meta = JSON.parse(project.metadata);
                    setDescription(meta.description ?? '');
                } catch {}
            }
            loadCoverImage(project);
            loadGenresAndTags();
            loadProjectCovers();
            loadSeries();
            loadInspirations();
        }
    }, [open, project]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                genreDropdownRef.current &&
                !genreDropdownRef.current.contains(e.target as Node)
            ) {
                setShowGenreDropdown(false);
            }
            if (
                tagDropdownRef.current &&
                !tagDropdownRef.current.contains(e.target as Node)
            ) {
                setShowTagDropdown(false);
            }
            if (
                themeDropdownRef.current &&
                !themeDropdownRef.current.contains(e.target as Node)
            ) {
                setShowThemeDropdown(false);
            }
            if (
                genrePrimaryDropdownRef.current &&
                !genrePrimaryDropdownRef.current.contains(e.target as Node)
            ) {
                setShowGenrePrimaryDropdown(false);
            }
            if (
                themePrimaryDropdownRef.current &&
                !themePrimaryDropdownRef.current.contains(e.target as Node)
            ) {
                setShowThemePrimaryDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function loadCoverImage(p: Project) {
        if (p.coverImageId) {
            try {
                const asset = await rpc.request['db:get-asset'](p.coverImageId);
                if (asset?.path) setCoverImageSrc(asset.path);
                else setCoverImageSrc(null);
            } catch {
                setCoverImageSrc(null);
            }
        } else {
            setCoverImageSrc(null);
        }
    }

    async function loadGenresAndTags() {
        try {
            const [genresResult, tagsResult, themesResult] = await Promise.all([
                rpc.request['db:get-genres'](),
                rpc.request['db:get-tags'](),
                rpc.request['db:get-themes'](),
            ]);
            const glist = Array.isArray(genresResult) ? genresResult : [];
            const tlist = Array.isArray(tagsResult) ? tagsResult : [];
            const thlist = Array.isArray(themesResult) ? themesResult : [];
            setAvailableGenres(glist);
            setAvailableTags(tlist);
            setAvailableThemes(thlist);
            return { genres: glist, tags: tlist, themes: thlist };
        } catch (e) {
            console.error('Failed to load genres/tags/themes:', e);
            return { genres: [], tags: [], themes: [] };
        }
    }

    async function loadSeries() {
        try {
            const result = await rpc.request['db:list-series']();
            setSeriesList(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load series:', e);
        }
    }

    async function handleCreateSeries() {
        if (!newSeriesName.trim()) return;
        const data: NewSeries = {
            id: crypto.randomUUID(),
            name: newSeriesName.trim(),
            description: newSeriesDesc.trim() || null,
            seriesArch: newSeriesArch,
            coverImageId: null,
        };
        const created = await rpc.request['db:create-series'](data);
        setSelectedSeriesId(created.id);
        setNewSeriesName('');
        setNewSeriesDesc('');
        setNewSeriesArch('ongoing');
        setShowCreateSeries(false);
        setHasChanges(true);
        loadSeries();
    }

    async function loadInspirations() {
        if (!project) return;
        try {
            const result = await rpc.request['db:get-inspirations'](project.id);
            setInspirations(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load inspirations:', e);
            setInspirations([]);
        }
    }

    async function handleCreateInspiration(data: NewInspiration) {
        await rpc.request['db:create-inspiration'](data);
        loadInspirations();
        setHasChanges(true);
    }

    async function handleUpdateInspiration(
        id: string,
        data: Partial<NewInspiration>
    ) {
        await rpc.request['db:update-inspiration']({ id, data });
        loadInspirations();
        setHasChanges(true);
    }

    async function handleDeleteInspiration(id: string) {
        await rpc.request['db:delete-inspiration'](id);
        loadInspirations();
        setHasChanges(true);
    }

    async function loadProjectCovers() {
        if (!project) return;
        setLoadingCovers(true);
        try {
            const result = await rpc.request['db:get-assets'](project.id);
            setProjectAssets(Array.isArray(result) ? result : []);
        } catch (e) {
            console.error('Failed to load project covers:', e);
            setProjectAssets([]);
        } finally {
            setLoadingCovers(false);
        }
    }

    async function handleAddCustomGenre() {
        const name = customGenre.trim();
        if (!name) return;

        const existing = availableGenres.find((g) => g.name === name);
        if (existing) {
            if (!selectedGenres.includes(existing.name)) {
                setSelectedGenres([...selectedGenres, existing.name]);
                setHasChanges(true);
            }
            setCustomGenre('');
            return;
        }

        try {
            const newGenre = await rpc.request['db:create-genre']({
                name,
                isGlobal: false,
            });
            setAvailableGenres([...availableGenres, newGenre]);
            setSelectedGenres([...selectedGenres, newGenre.name]);
            setCustomGenre('');
            setHasChanges(true);
        } catch {
            const { genres: freshGenres } = await loadGenresAndTags();
            const found = freshGenres.find((g) => g.name === name);
            if (found) {
                setSelectedGenres((prev) =>
                    prev.includes(found.name) ? prev : [...prev, found.name]
                );
                setHasChanges(true);
            }
            setCustomGenre('');
        }
    }

    async function handleAddCustomTag() {
        const name = customTag.trim();
        if (!name) return;

        const existing = availableTags.find((t) => t.name === name);
        if (existing) {
            if (!selectedTags.includes(existing.name)) {
                setSelectedTags([...selectedTags, existing.name]);
                setHasChanges(true);
            }
            setCustomTag('');
            return;
        }

        try {
            const newTag = await rpc.request['db:create-tag']({
                name,
                isGlobal: false,
            });
            setAvailableTags([...availableTags, newTag]);
            setSelectedTags([...selectedTags, newTag.name]);
            setCustomTag('');
            setHasChanges(true);
        } catch {
            const { tags: freshTags } = await loadGenresAndTags();
            const found = freshTags.find((t) => t.name === name);
            if (found) {
                setSelectedTags((prev) =>
                    prev.includes(found.name) ? prev : [...prev, found.name]
                );
                setHasChanges(true);
            }
            setCustomTag('');
        }
    }

    function toggleGenre(genreName: string) {
        setSelectedGenres((prev) =>
            prev.includes(genreName)
                ? prev.filter((n) => n !== genreName)
                : [...prev, genreName]
        );
        setHasChanges(true);
    }

    function removeGenre(genreName: string) {
        if (primaryGenre === genreName) setPrimaryGenre(null);
        setSelectedGenres((prev) => prev.filter((n) => n !== genreName));
        setHasChanges(true);
    }

    function toggleTag(tagName: string) {
        setSelectedTags((prev) =>
            prev.includes(tagName)
                ? prev.filter((n) => n !== tagName)
                : [...prev, tagName]
        );
        setHasChanges(true);
    }

    function removeTag(tagName: string) {
        setSelectedTags((prev) => prev.filter((n) => n !== tagName));
        setHasChanges(true);
    }

    function toggleTheme(themeName: string) {
        setSelectedThemes((prev) =>
            prev.includes(themeName)
                ? prev.filter((n) => n !== themeName)
                : [...prev, themeName]
        );
        setHasChanges(true);
    }

    function setPrimaryGenreFromList(genreName: string) {
        if (selectedGenres.includes(genreName)) {
            setPrimaryGenre(genreName);
            setHasChanges(true);
        }
    }

    function removeTheme(themeName: string) {
        if (primaryTheme === themeName) setPrimaryTheme(null);
        setSelectedThemes((prev) => prev.filter((n) => n !== themeName));
        setHasChanges(true);
    }

    function setPrimaryThemeFromList(themeName: string) {
        if (selectedThemes.includes(themeName)) {
            setPrimaryTheme(themeName);
            setHasChanges(true);
        }
    }

    async function handleAddCustomTheme() {
        const name = customTheme.trim();
        if (!name) return;

        const existing = availableThemes.find((t) => t.name === name);
        if (existing) {
            if (!selectedThemes.includes(existing.name)) {
                setSelectedThemes([...selectedThemes, existing.name]);
                setHasChanges(true);
            }
            setCustomTheme('');
            return;
        }

        try {
            const newTheme = await rpc.request['db:create-theme']({ name });
            setAvailableThemes([...availableThemes, newTheme]);
            setSelectedThemes([...selectedThemes, newTheme.name]);
            setCustomTheme('');
            setHasChanges(true);
        } catch {
            const { themes: freshThemes } = await loadGenresAndTags();
            const found = freshThemes.find((t) => t.name === name);
            if (found) {
                setSelectedThemes((prev) =>
                    prev.includes(found.name) ? prev : [...prev, found.name]
                );
                setHasChanges(true);
            }
            setCustomTheme('');
        }
    }

    async function handleSave() {
        if (!project || saving) return;
        setSaving(true);
        try {
            const metadata = JSON.stringify({
                ...(project.metadata ? JSON.parse(project.metadata) : {}),
                description: description || '',
            });
            const derivedArch = selectedSeriesId
                ? (seriesList.find((s) => s.id === selectedSeriesId)
                      ?.seriesArch ?? 'standalone')
                : 'standalone';
            await rpc.request['db:update-project']({
                id: project.id,
                data: {
                    name: name.trim(),
                    projectScope,
                    seriesArch: derivedArch,
                    seriesId: selectedSeriesId,
                    pov,
                    pacing,
                    workType,
                    projectStructure,
                    targetAge,
                    projectStatus,
                    tonalType: tonalType.trim() || null,
                    contentRating,
                    genres: selectedGenres,
                    tags: selectedTags,
                    themes: selectedThemes,
                    primaryGenre,
                    primaryTheme,
                    metadata,
                },
            });
            setHasChanges(false);
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to save project:', e);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!project) return;
        try {
            await rpc.request['db:delete-project'](project.id);
            setShowDeleteConfirm(false);
            onClose();
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to delete project:', e);
        }
    }

    async function handleSetActiveCover(assetId: string) {
        if (!project) return;
        try {
            await rpc.request['db:update-project']({
                id: project.id,
                data: { coverImageId: assetId },
            });
            const updated = await rpc.request['db:get-project'](project.id);
            if (updated) loadCoverImage(updated);
            setProjectAssets((prev) => [...prev]);
            onProjectUpdated?.();
        } catch (e) {
            console.error('Failed to set active cover:', e);
        }
    }

    async function handleCoverSelected(assetId: string) {
        if (!project) return;
        try {
            await rpc.request['db:update-project']({
                id: project.id,
                data: { coverImageId: assetId },
            });
            setShowAssetPicker(false);
            onProjectUpdated?.();
            const updated = await rpc.request['db:get-project'](project.id);
            if (updated) loadCoverImage(updated);
            loadProjectCovers();
        } catch (e) {
            console.error('Failed to update cover:', e);
        }
    }

    if (!project) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title="Project Manager"
            large
            className={localStyles.projectManagerDialog}
        >
            <SplitDialogLayout>
                <>
                    <IconTextSideBar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        tabsArray={PROJECT_DIALOG_TABS}
                        iconsArray={PROJECT_DIALOG_TABS_ICONS}
                    />

                    <div className={dialogStyles.tabPanel}>
                        {activeTab === 'general' && (
                            <div className={localStyles.tabContent}>
                                <div className={styles.tabPanelHeader}>
                                    <h3>General Settings</h3>
                                    <p>
                                        Manage your project's basic information
                                    </p>
                                </div>
                                <div className={styles.tabPanelContent}>
                                    <h4 className={localStyles.sectionHeading}>
                                        Project
                                    </h4>

                                    <div
                                        className={
                                            localStyles.projectHeaderGrid
                                        }
                                    >
                                        <div
                                            className={
                                                localStyles.projectHeaderName
                                            }
                                        >
                                            <div className={styles.formGroup}>
                                                <label>Project Name</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => {
                                                        setName(e.target.value);
                                                        setHasChanges(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            className={
                                                localStyles.projectHeaderDesc
                                            }
                                        >
                                            <label>Description</label>
                                            <textarea
                                                className={localStyles.textarea}
                                                rows={4}
                                                value={description}
                                                onChange={(e) => {
                                                    setDescription(
                                                        e.target.value
                                                    );
                                                    setHasChanges(true);
                                                }}
                                                placeholder="A brief description of your project..."
                                            />
                                        </div>
                                        <div
                                            className={
                                                localStyles.projectHeaderCover
                                            }
                                        >
                                            <div
                                                className={
                                                    localStyles.generalCoverWrap
                                                }
                                                onClick={() =>
                                                    setShowAssetPicker(true)
                                                }
                                            >
                                                {coverImageSrc ? (
                                                    <img
                                                        src={coverImageSrc}
                                                        alt="Cover"
                                                        className={
                                                            localStyles.generalCoverPreview
                                                        }
                                                    />
                                                ) : (
                                                    <div
                                                        className={
                                                            localStyles.generalCoverPlaceholder
                                                        }
                                                    >
                                                        <IconPhoto
                                                            size={24}
                                                            stroke={1.5}
                                                        />
                                                    </div>
                                                )}
                                                <div
                                                    className={
                                                        localStyles.generalCoverOverlay
                                                    }
                                                >
                                                    {coverImageSrc
                                                        ? 'Change Cover'
                                                        : 'Set Cover'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={localStyles.genreThemeRow}>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Genres</label>
                                            <div
                                                className={
                                                    localStyles.pickerRow
                                                }
                                            >
                                                <div
                                                    className={
                                                        localStyles.selectedPills
                                                    }
                                                >
                                                    {selectedGenres.length ===
                                                        0 && (
                                                        <span
                                                            className={
                                                                localStyles.noSelection
                                                            }
                                                        >
                                                            No genres selected
                                                        </span>
                                                    )}
                                                    {selectedGenres.map(
                                                        (name) => {
                                                            const isPrimary =
                                                                primaryGenre ===
                                                                name;
                                                            return (
                                                                <span
                                                                    key={name}
                                                                    className={`${localStyles.pill} ${isPrimary ? localStyles.primaryPill : ''}`}
                                                                >
                                                                    {isPrimary && (
                                                                        <IconStarFilled
                                                                            size={
                                                                                12
                                                                            }
                                                                            className={
                                                                                localStyles.starIcon
                                                                            }
                                                                        />
                                                                    )}
                                                                    {name}
                                                                    <button
                                                                        type="button"
                                                                        className={
                                                                            localStyles.pillRemove
                                                                        }
                                                                        onClick={() =>
                                                                            removeGenre(
                                                                                name
                                                                            )
                                                                        }
                                                                    >
                                                                        <IconX
                                                                            size={
                                                                                12
                                                                            }
                                                                            stroke={
                                                                                2
                                                                            }
                                                                        />
                                                                    </button>
                                                                </span>
                                                            );
                                                        }
                                                    )}
                                                    {selectedGenres.length >
                                                        0 &&
                                                        !primaryGenre && (
                                                            <div
                                                                ref={
                                                                    genrePrimaryDropdownRef
                                                                }
                                                                style={{
                                                                    position:
                                                                        'relative',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        localStyles.setPrimaryBtn
                                                                    }
                                                                    onClick={() =>
                                                                        setShowGenrePrimaryDropdown(
                                                                            !showGenrePrimaryDropdown
                                                                        )
                                                                    }
                                                                >
                                                                    Set Primary
                                                                    Genre +
                                                                </button>
                                                                {showGenrePrimaryDropdown && (
                                                                    <div
                                                                        className={
                                                                            localStyles.primaryDropdown
                                                                        }
                                                                    >
                                                                        {selectedGenres.map(
                                                                            (
                                                                                name
                                                                            ) => (
                                                                                <button
                                                                                    key={
                                                                                        name
                                                                                    }
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setPrimaryGenreFromList(
                                                                                            name
                                                                                        );
                                                                                        setShowGenrePrimaryDropdown(
                                                                                            false
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        name
                                                                                    }
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                                <div
                                                    className={
                                                        localStyles.pickerActions
                                                    }
                                                    ref={genreDropdownRef}
                                                >
                                                    <button
                                                        type="button"
                                                        className={
                                                            localStyles.searchBtn
                                                        }
                                                        onClick={() =>
                                                            setShowGenreDropdown(
                                                                !showGenreDropdown
                                                            )
                                                        }
                                                    >
                                                        <IconPlus
                                                            size={16}
                                                            stroke={2}
                                                        />
                                                    </button>
                                                    {showGenreDropdown && (
                                                        <div
                                                            className={
                                                                localStyles.dropdown
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    localStyles.dropdownList
                                                                }
                                                            >
                                                                {availableGenres.map(
                                                                    (genre) => (
                                                                        <button
                                                                            key={
                                                                                genre.id
                                                                            }
                                                                            type="button"
                                                                            className={`${localStyles.dropdownItem} ${selectedGenres.includes(genre.name) ? localStyles.dropdownItemSelected : ''}`}
                                                                            onClick={() =>
                                                                                toggleGenre(
                                                                                    genre.name
                                                                                )
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    genre.name
                                                                                }
                                                                            </span>
                                                                            {selectedGenres.includes(
                                                                                genre.name
                                                                            ) && (
                                                                                <IconCheck
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                    stroke={
                                                                                        2
                                                                                    }
                                                                                />
                                                                            )}
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                            <div
                                                                className={
                                                                    localStyles.dropdownAdd
                                                                }
                                                            >
                                                                <input
                                                                    type="text"
                                                                    placeholder="Add custom..."
                                                                    value={
                                                                        customGenre
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setCustomGenre(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        e
                                                                    ) =>
                                                                        e.key ===
                                                                            'Enter' &&
                                                                        (e.preventDefault(),
                                                                        handleAddCustomGenre())
                                                                    }
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        handleAddCustomGenre
                                                                    }
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Themes</label>
                                            <div
                                                className={
                                                    localStyles.pickerRow
                                                }
                                            >
                                                <div
                                                    className={
                                                        localStyles.selectedPills
                                                    }
                                                >
                                                    {selectedThemes.length ===
                                                        0 && (
                                                        <span
                                                            className={
                                                                localStyles.noSelection
                                                            }
                                                        >
                                                            No themes selected
                                                        </span>
                                                    )}
                                                    {selectedThemes.map(
                                                        (name) => {
                                                            const isPrimary =
                                                                primaryTheme ===
                                                                name;
                                                            return (
                                                                <span
                                                                    key={name}
                                                                    className={`${localStyles.pill} ${isPrimary ? localStyles.primaryPill : ''}`}
                                                                >
                                                                    {isPrimary && (
                                                                        <IconStarFilled
                                                                            size={
                                                                                12
                                                                            }
                                                                            className={
                                                                                localStyles.starIcon
                                                                            }
                                                                        />
                                                                    )}
                                                                    {name}
                                                                    <button
                                                                        type="button"
                                                                        className={
                                                                            localStyles.pillRemove
                                                                        }
                                                                        onClick={() =>
                                                                            removeTheme(
                                                                                name
                                                                            )
                                                                        }
                                                                    >
                                                                        <IconX
                                                                            size={
                                                                                12
                                                                            }
                                                                            stroke={
                                                                                2
                                                                            }
                                                                        />
                                                                    </button>
                                                                </span>
                                                            );
                                                        }
                                                    )}
                                                    {selectedThemes.length >
                                                        0 &&
                                                        !primaryTheme && (
                                                            <div
                                                                ref={
                                                                    themePrimaryDropdownRef
                                                                }
                                                                style={{
                                                                    position:
                                                                        'relative',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        localStyles.setPrimaryBtn
                                                                    }
                                                                    onClick={() =>
                                                                        setShowThemePrimaryDropdown(
                                                                            !showThemePrimaryDropdown
                                                                        )
                                                                    }
                                                                >
                                                                    Set Primary
                                                                    Theme +
                                                                </button>
                                                                {showThemePrimaryDropdown && (
                                                                    <div
                                                                        className={
                                                                            localStyles.primaryDropdown
                                                                        }
                                                                    >
                                                                        {selectedThemes.map(
                                                                            (
                                                                                name
                                                                            ) => (
                                                                                <button
                                                                                    key={
                                                                                        name
                                                                                    }
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setPrimaryThemeFromList(
                                                                                            name
                                                                                        );
                                                                                        setShowThemePrimaryDropdown(
                                                                                            false
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        name
                                                                                    }
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                                <div
                                                    className={
                                                        localStyles.pickerActions
                                                    }
                                                    ref={themeDropdownRef}
                                                >
                                                    <button
                                                        type="button"
                                                        className={
                                                            localStyles.searchBtn
                                                        }
                                                        onClick={() =>
                                                            setShowThemeDropdown(
                                                                !showThemeDropdown
                                                            )
                                                        }
                                                    >
                                                        <IconPlus
                                                            size={16}
                                                            stroke={2}
                                                        />
                                                    </button>
                                                    {showThemeDropdown && (
                                                        <div
                                                            className={
                                                                localStyles.dropdown
                                                            }
                                                        >
                                                            <div
                                                                className={
                                                                    localStyles.dropdownList
                                                                }
                                                            >
                                                                {availableThemes.map(
                                                                    (theme) => (
                                                                        <button
                                                                            key={
                                                                                theme.id
                                                                            }
                                                                            type="button"
                                                                            className={`${localStyles.dropdownItem} ${selectedThemes.includes(theme.name) ? localStyles.dropdownItemSelected : ''}`}
                                                                            onClick={() =>
                                                                                toggleTheme(
                                                                                    theme.name
                                                                                )
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    theme.name
                                                                                }
                                                                            </span>
                                                                            {selectedThemes.includes(
                                                                                theme.name
                                                                            ) && (
                                                                                <IconCheck
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                    stroke={
                                                                                        2
                                                                                    }
                                                                                />
                                                                            )}
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                            <div
                                                                className={
                                                                    localStyles.dropdownAdd
                                                                }
                                                            >
                                                                <input
                                                                    type="text"
                                                                    placeholder="Add custom..."
                                                                    value={
                                                                        customTheme
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setCustomTheme(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        e
                                                                    ) =>
                                                                        e.key ===
                                                                            'Enter' &&
                                                                        (e.preventDefault(),
                                                                        handleAddCustomTheme())
                                                                    }
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        handleAddCustomTheme
                                                                    }
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Tags</label>
                                        <div className={localStyles.pickerRow}>
                                            <div
                                                className={
                                                    localStyles.selectedPills
                                                }
                                            >
                                                {selectedTags.length === 0 && (
                                                    <span
                                                        className={
                                                            localStyles.noSelection
                                                        }
                                                    >
                                                        None selected
                                                    </span>
                                                )}
                                                {selectedTags.map((name) => (
                                                    <span
                                                        key={name}
                                                        className={
                                                            localStyles.pill
                                                        }
                                                    >
                                                        {name}
                                                        <button
                                                            type="button"
                                                            className={
                                                                localStyles.pillRemove
                                                            }
                                                            onClick={() =>
                                                                removeTag(name)
                                                            }
                                                        >
                                                            <IconX
                                                                size={12}
                                                                stroke={2}
                                                            />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div
                                                className={
                                                    localStyles.pickerActions
                                                }
                                                ref={tagDropdownRef}
                                            >
                                                <button
                                                    type="button"
                                                    className={
                                                        localStyles.searchBtn
                                                    }
                                                    onClick={() =>
                                                        setShowTagDropdown(
                                                            !showTagDropdown
                                                        )
                                                    }
                                                >
                                                    <IconPlus
                                                        size={16}
                                                        stroke={2}
                                                    />
                                                </button>
                                                {showTagDropdown && (
                                                    <div
                                                        className={
                                                            localStyles.dropdown
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                localStyles.dropdownList
                                                            }
                                                        >
                                                            {availableTags.map(
                                                                (tag) => (
                                                                    <button
                                                                        key={
                                                                            tag.id
                                                                        }
                                                                        type="button"
                                                                        className={`${localStyles.dropdownItem} ${selectedTags.includes(tag.name) ? localStyles.dropdownItemSelected : ''}`}
                                                                        onClick={() =>
                                                                            toggleTag(
                                                                                tag.name
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            {
                                                                                tag.name
                                                                            }
                                                                        </span>
                                                                        {selectedTags.includes(
                                                                            tag.name
                                                                        ) && (
                                                                            <IconCheck
                                                                                size={
                                                                                    14
                                                                                }
                                                                                stroke={
                                                                                    2
                                                                                }
                                                                            />
                                                                        )}
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                        <div
                                                            className={
                                                                localStyles.dropdownAdd
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                placeholder="Add custom..."
                                                                value={
                                                                    customTag
                                                                }
                                                                onChange={(e) =>
                                                                    setCustomTag(
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                onKeyDown={(
                                                                    e
                                                                ) =>
                                                                    e.key ===
                                                                        'Enter' &&
                                                                    (e.preventDefault(),
                                                                    handleAddCustomTag())
                                                                }
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleAddCustomTag
                                                                }
                                                            >
                                                                Add
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={localStyles.sectionDivider}
                                    />

                                    <h4 className={localStyles.sectionHeading}>
                                        Format &amp; Structure
                                    </h4>

                                    <div className={localStyles.genreThemeRow}>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Project Scope</label>
                                            <div
                                                className={
                                                    localStyles.segmentedGroup
                                                }
                                            >
                                                {projectScopes.map((s) => (
                                                    <button
                                                        key={s.value}
                                                        type="button"
                                                        className={`${localStyles.segmentedBtn} ${projectScope === s.value ? localStyles.segmentedActive : ''}`}
                                                        onClick={() => {
                                                            setProjectScope(
                                                                s.value
                                                            );
                                                            setHasChanges(true);
                                                        }}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {projectScope && (
                                                <span
                                                    className={
                                                        localStyles.wordCountHint
                                                    }
                                                >
                                                    Target:{' '}
                                                    {
                                                        PROJECT_SCOPE_TARGETS[
                                                            projectScope
                                                        ].label
                                                    }
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Pacing</label>
                                            <div
                                                className={
                                                    localStyles.segmentedGroup
                                                }
                                            >
                                                {pacingOptions.map((o) => (
                                                    <button
                                                        key={o.value}
                                                        type="button"
                                                        className={`${localStyles.segmentedBtn} ${pacing === o.value ? localStyles.segmentedActive : ''}`}
                                                        onClick={() => {
                                                            setPacing(o.value);
                                                            setHasChanges(true);
                                                        }}
                                                    >
                                                        {o.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Point of View (POV)</label>
                                        <div
                                            className={
                                                localStyles.segmentedGroup
                                            }
                                        >
                                            {povOptions.map((o) => (
                                                <button
                                                    key={o.value}
                                                    type="button"
                                                    className={`${localStyles.segmentedBtn} ${pov === o.value ? localStyles.segmentedActive : ''}`}
                                                    onClick={() => {
                                                        setPov(o.value);
                                                        setHasChanges(true);
                                                    }}
                                                >
                                                    {o.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={localStyles.genreThemeRow}>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Work Type</label>
                                            <select
                                                value={workType}
                                                onChange={(e) => {
                                                    setWorkType(
                                                        e.target
                                                            .value as WorkType
                                                    );
                                                    setHasChanges(true);
                                                }}
                                                style={{ width: '100%' }}
                                            >
                                                {workTypeOptions.map((o) => (
                                                    <option
                                                        key={o.value}
                                                        value={o.value}
                                                    >
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Project Structure</label>
                                            <select
                                                value={projectStructure}
                                                onChange={(e) => {
                                                    setProjectStructure(
                                                        e.target
                                                            .value as ProjectStructure
                                                    );
                                                    setHasChanges(true);
                                                }}
                                                style={{ width: '100%' }}
                                            >
                                                {projectStructureOptions.map(
                                                    (o) => (
                                                        <option
                                                            key={o.value}
                                                            value={o.value}
                                                        >
                                                            {o.label}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Tonal Type</label>
                                        <input
                                            type="text"
                                            value={tonalType}
                                            onChange={(e) => {
                                                setTonalType(e.target.value);
                                                setHasChanges(true);
                                            }}
                                            placeholder="e.g. dark, humorous, whimsical..."
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Content Rating</label>
                                        <select
                                            value={contentRating}
                                            onChange={(e) => {
                                                setContentRating(
                                                    e.target.value
                                                );
                                                setHasChanges(true);
                                            }}
                                        >
                                            {contentRatingOptions.map((o) => (
                                                <option
                                                    key={o.value}
                                                    value={o.value}
                                                >
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={localStyles.genreThemeRow}>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Target Age</label>
                                            <select
                                                value={targetAge ?? ''}
                                                onChange={(e) => {
                                                    setTargetAge(
                                                        (e.target.value ||
                                                            null) as TargetAgeGroup | null
                                                    );
                                                    setHasChanges(true);
                                                }}
                                                style={{ width: '100%' }}
                                            >
                                                <option value="">
                                                    Not specified
                                                </option>
                                                {targetAgeOptions.map((o) => (
                                                    <option
                                                        key={o.value}
                                                        value={o.value}
                                                    >
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div
                                            className={
                                                localStyles.genreThemeCol
                                            }
                                        >
                                            <label>Status</label>
                                            <select
                                                value={projectStatus}
                                                onChange={(e) => {
                                                    setProjectStatus(
                                                        e.target
                                                            .value as ProjectStatus
                                                    );
                                                    setHasChanges(true);
                                                }}
                                                style={{ width: '100%' }}
                                            >
                                                {projectStatusOptions.map(
                                                    (o) => (
                                                        <option
                                                            key={o.value}
                                                            value={o.value}
                                                        >
                                                            {o.label}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    <div
                                        className={localStyles.sectionDivider}
                                    />

                                    <h4 className={localStyles.sectionHeading}>
                                        Inspirations &amp; Sources
                                    </h4>
                                    <p
                                        style={{
                                            color: '#888',
                                            fontSize: '0.85em',
                                            marginBottom: '0.75rem',
                                        }}
                                    >
                                        Track the works that influenced this
                                        project. The AI uses this context to
                                        better understand your creative
                                        references.
                                    </p>

                                    {inspirations.length === 0 ? (
                                        <div
                                            style={{
                                                color: '#666',
                                                fontSize: '0.9em',
                                                padding: '0.5rem 0',
                                            }}
                                        >
                                            No inspirations added yet.
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem',
                                                marginBottom: '0.75rem',
                                            }}
                                        >
                                            {inspirations.map((insp) => (
                                                <InspirationCard
                                                    key={insp.id}
                                                    inspiration={insp}
                                                    onUpdate={
                                                        handleUpdateInspiration
                                                    }
                                                    onDelete={
                                                        handleDeleteInspiration
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <AddInspirationForm
                                        projectId={project.id}
                                        onCreate={handleCreateInspiration}
                                    />

                                    <div
                                        className={localStyles.sectionDivider}
                                    />

                                    <h4 className={localStyles.sectionHeading}>
                                        Series
                                    </h4>

                                    <div className={styles.formGroup}>
                                        <label>Assign to Series</label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <select
                                                value={selectedSeriesId || ''}
                                                onChange={(e) => {
                                                    setSelectedSeriesId(
                                                        e.target.value || null
                                                    );
                                                    setHasChanges(true);
                                                }}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">
                                                    None (standalone)
                                                </option>
                                                {seriesList.map((s) => (
                                                    <option
                                                        key={s.id}
                                                        value={s.id}
                                                    >
                                                        {s.name}
                                                        {s.seriesArch
                                                            ? ` (${s.seriesArch})`
                                                            : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowCreateSeries(true)
                                                }
                                            >
                                                New
                                            </button>
                                        </div>
                                        {selectedSeriesId && (
                                            <div
                                                style={{ marginTop: '0.5rem' }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveTab(
                                                            'templates'
                                                        );
                                                    }}
                                                    style={{
                                                        fontSize: '0.85em',
                                                    }}
                                                >
                                                    Edit Series Templates
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className={localStyles.metaInfo}>
                                        <div className={localStyles.metaRow}>
                                            <span>Created</span>
                                            <span>
                                                {new Date(
                                                    project.createdAt
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className={localStyles.metaRow}>
                                            <span>Last Updated</span>
                                            <span>
                                                {new Date(
                                                    project.updatedAt
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {project.path && (
                                            <div
                                                className={localStyles.metaRow}
                                            >
                                                <span>Path</span>
                                                <span
                                                    className={
                                                        localStyles.pathValue
                                                    }
                                                >
                                                    {project.path}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={localStyles.saveRow}>
                                        <button
                                            className={localStyles.saveBtn}
                                            onClick={handleSave}
                                            disabled={!hasChanges || saving}
                                        >
                                            {saving
                                                ? 'Saving...'
                                                : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'templates' && (
                            <div className={localStyles.tabContent}>
                                <div className={styles.tabPanelHeader}>
                                    <h3>Templates</h3>
                                    <p>
                                        Manage global, series, and project
                                        templates for each entry category
                                    </p>
                                </div>
                                <div className={styles.tabPanelContent}>
                                    <TemplateManagerTab
                                        projectId={project.id}
                                        seriesId={selectedSeriesId}
                                        onTemplatesChanged={
                                            onTemplatesChanged ?? (() => {})
                                        }
                                        initialCategory={initialCategory}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'covers' && (
                            <div className={localStyles.tabContent}>
                                <div className={styles.tabPanelHeader}>
                                    <h3>Covers</h3>
                                    <p>
                                        Upload and manage cover images for this
                                        project
                                    </p>
                                </div>
                                <div className={styles.tabPanelContent}>
                                    <div className={localStyles.coversToolbar}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            id="covers-file-input"
                                            onChange={async (e) => {
                                                const file =
                                                    e.target.files?.[0];
                                                if (!file || !project) return;
                                                const reader = new FileReader();
                                                reader.onload = async () => {
                                                    try {
                                                        await rpc.request[
                                                            'db:create-asset'
                                                        ]({
                                                            id: crypto.randomUUID(),
                                                            projectId:
                                                                project.id,
                                                            name: file.name,
                                                            type: file.type,
                                                            path: reader.result as string,
                                                            metadata: null,
                                                        });
                                                        loadProjectCovers();
                                                    } catch (err) {
                                                        console.error(
                                                            'Failed to upload cover:',
                                                            err
                                                        );
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                                e.target.value = '';
                                            }}
                                        />
                                        <button
                                            className={localStyles.coversAddBtn}
                                            onClick={() => {
                                                const el =
                                                    document.getElementById(
                                                        'covers-file-input'
                                                    ) as HTMLInputElement;
                                                el?.click();
                                            }}
                                        >
                                            <IconPlus size={16} stroke={2} />
                                            Add Cover
                                        </button>
                                    </div>

                                    {loadingCovers ? (
                                        <div
                                            className={
                                                localStyles.coversLoading
                                            }
                                        >
                                            Loading...
                                        </div>
                                    ) : projectAssets.length === 0 ? (
                                        <div
                                            className={localStyles.coversEmpty}
                                        >
                                            No covers uploaded yet.
                                        </div>
                                    ) : (
                                        <div className={localStyles.coversGrid}>
                                            {projectAssets.map((asset) => {
                                                const isActive =
                                                    asset.id ===
                                                    project.coverImageId;
                                                return (
                                                    <div
                                                        key={asset.id}
                                                        className={`${localStyles.coverItem} ${isActive ? localStyles.coverItemActive : ''}`}
                                                    >
                                                        {asset.type.startsWith(
                                                            'image/'
                                                        ) && asset.path ? (
                                                            <img
                                                                src={asset.path}
                                                                alt={asset.name}
                                                                className={
                                                                    localStyles.coverThumb
                                                                }
                                                            />
                                                        ) : (
                                                            <div
                                                                className={
                                                                    localStyles.coverThumbPlaceholder
                                                                }
                                                            >
                                                                {asset.name}
                                                            </div>
                                                        )}
                                                        <div
                                                            className={
                                                                localStyles.coverItemOverlay
                                                            }
                                                        >
                                                            <button
                                                                className={
                                                                    localStyles.coverSetActiveBtn
                                                                }
                                                                onClick={() =>
                                                                    handleSetActiveCover(
                                                                        asset.id
                                                                    )
                                                                }
                                                            >
                                                                {isActive
                                                                    ? 'Active'
                                                                    : 'Set as Active'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'danger zone' && (
                            <div className={localStyles.tabContent}>
                                <div className={styles.tabPanelHeader}>
                                    <h3>Danger Zone</h3>
                                    <p>Irreversible actions for this project</p>
                                </div>
                                <div className={styles.tabPanelContent}>
                                    <div className={localStyles.dangerSection}>
                                        <div className={localStyles.dangerInfo}>
                                            <IconAlertTriangle
                                                size={24}
                                                stroke={2}
                                            />
                                            <div>
                                                <strong>
                                                    Delete this project
                                                </strong>
                                                <p>
                                                    This will permanently delete
                                                    "{project.name}" and all its
                                                    data (chapters, characters,
                                                    locations, etc.). This
                                                    action cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            className={localStyles.deleteBtn}
                                            onClick={() =>
                                                setShowDeleteConfirm(true)
                                            }
                                        >
                                            <IconTrash size={16} stroke={2} />
                                            Delete Project
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            </SplitDialogLayout>
            <div
                className={`${styles.dialogContent} ${localStyles.dialogContent}`}
            ></div>

            {showDeleteConfirm && (
                <SubDialog
                    open={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    title="Delete Project"
                >
                    <p>
                        Are you sure you want to delete "{project.name}"? This
                        will permanently remove all associated data.
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

            {showCreateSeries && (
                <SubDialog
                    open={showCreateSeries}
                    onClose={() => setShowCreateSeries(false)}
                    title="Create New Series"
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
                                value={newSeriesName}
                                onChange={(e) =>
                                    setNewSeriesName(e.target.value)
                                }
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && handleCreateSeries()
                                }
                                style={{ width: '100%' }}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label>Description</label>
                            <textarea
                                value={newSeriesDesc}
                                onChange={(e) =>
                                    setNewSeriesDesc(e.target.value)
                                }
                                rows={2}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label>Architecture</label>
                            <select
                                value={newSeriesArch}
                                onChange={(e) =>
                                    setNewSeriesArch(
                                        e.target.value as SeriesArchitecture
                                    )
                                }
                                style={{ width: '100%' }}
                            >
                                {seriesOptions
                                    .filter((o) => o.value !== 'standalone')
                                    .map((o) => (
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
                            <button onClick={() => setShowCreateSeries(false)}>
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSeries}
                                disabled={!newSeriesName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </SubDialog>
            )}

            <AssetPicker
                open={showAssetPicker}
                onClose={() => setShowAssetPicker(false)}
                onSelect={handleCoverSelected}
                projectId={project.id}
                selectedAssetId={project.coverImageId}
            />
        </Dialog>
    );
}

const sourceTypeOptions = [
    { value: 'book', label: 'Book' },
    { value: 'movie', label: 'Movie' },
    { value: 'tv_show', label: 'TV Show' },
    { value: 'game', label: 'Game' },
    { value: 'anime', label: 'Anime' },
    { value: 'manga', label: 'Manga' },
    { value: 'web_novel', label: 'Web Novel' },
    { value: 'web_series', label: 'Web Series' },
    { value: 'comic', label: 'Comic' },
    { value: 'mythology', label: 'Mythology' },
    { value: 'history', label: 'History' },
    { value: 'other', label: 'Other' },
];

type AspectTagPickerProps = {
    selected: string[];
    onChange: (aspects: string[]) => void;
};

function AspectTagPicker({ selected, onChange }: AspectTagPickerProps) {
    const [customInput, setCustomInput] = useState('');

    function toggleAspect(aspect: string) {
        onChange(
            selected.includes(aspect)
                ? selected.filter((a) => a !== aspect)
                : [...selected, aspect]
        );
    }

    function addCustom() {
        const val = customInput.trim();
        if (val && !selected.includes(val)) {
            onChange([...selected, val]);
        }
        setCustomInput('');
    }

    return (
        <div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    marginBottom: '0.5rem',
                }}
            >
                {PREDEFINED_ASPECTS.map((aspect) => (
                    <button
                        key={aspect}
                        type="button"
                        onClick={() => toggleAspect(aspect)}
                        style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.8em',
                            borderRadius: '4px',
                            border: `1px solid ${selected.includes(aspect) ? 'var(--accent, #6366f1)' : '#444'}`,
                            background: selected.includes(aspect)
                                ? 'var(--accent, #6366f1)'
                                : 'transparent',
                            color: selected.includes(aspect) ? '#fff' : '#ccc',
                            cursor: 'pointer',
                        }}
                    >
                        {aspect.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>
            {selected.filter((a) => !PREDEFINED_ASPECTS.includes(a as any))
                .length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.35rem',
                        marginBottom: '0.5rem',
                    }}
                >
                    {selected
                        .filter((a) => !PREDEFINED_ASPECTS.includes(a as any))
                        .map((a) => (
                            <span
                                key={a}
                                style={{
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.8em',
                                    borderRadius: '4px',
                                    border: '1px solid #555',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#aaa',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                }}
                            >
                                {a}
                                <button
                                    type="button"
                                    onClick={() => toggleAspect(a)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#888',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '1em',
                                        lineHeight: 1,
                                    }}
                                >
                                    <IconX size={10} stroke={2} />
                                </button>
                            </span>
                        ))}
                </div>
            )}
            <div style={{ display: 'flex', gap: '0.3rem' }}>
                <input
                    type="text"
                    placeholder="Custom aspect..."
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), addCustom())
                    }
                    style={{
                        flex: 1,
                        fontSize: '0.85em',
                        padding: '0.25rem 0.4rem',
                    }}
                />
                <button
                    type="button"
                    onClick={addCustom}
                    style={{ fontSize: '0.85em', padding: '0.25rem 0.5rem' }}
                >
                    Add
                </button>
            </div>
        </div>
    );
}

type AddInspirationFormProps = {
    projectId: string;
    onCreate: (data: NewInspiration) => void;
    initial?: Partial<NewInspiration>;
    onCancel?: () => void;
};

function AddInspirationForm({
    projectId,
    onCreate,
    initial,
    onCancel,
}: AddInspirationFormProps) {
    const [sourceName, setSourceName] = useState(initial?.sourceName ?? '');
    const [sourceType, setSourceType] = useState<string>(
        initial?.sourceType ?? 'book'
    );
    const [sourceYear, setSourceYear] = useState<number | null>(
        initial?.sourceYear ?? null
    );
    const [inspiredAspects, setInspiredAspects] = useState<string[]>(
        initial?.inspiredAspects ?? []
    );
    const [inspiredNotes, setInspiredNotes] = useState(
        initial?.inspiredNotes ?? ''
    );

    function handleSubmit() {
        if (!sourceName.trim()) return;
        onCreate({
            id: crypto.randomUUID(),
            projectId,
            sourceName: sourceName.trim(),
            sourceType: sourceType as any,
            sourceYear,
            inspiredAspects,
            inspiredNotes: inspiredNotes.trim(),
        });
        setSourceName('');
        setSourceType('book');
        setSourceYear(null);
        setInspiredAspects([]);
        setInspiredNotes('');
    }

    return (
        <div
            style={{
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '0.75rem',
                marginTop: '0.5rem',
                background: 'rgba(255,255,255,0.03)',
            }}
        >
            <div className={styles.formGroup}>
                <label>Source Name</label>
                <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="e.g. The Name of the Wind"
                />
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                }}
            >
                <div className={styles.formGroup}>
                    <label>Source Type</label>
                    <select
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value)}
                    >
                        {sourceTypeOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label>Release Year</label>
                    <input
                        type="number"
                        value={sourceYear ?? ''}
                        onChange={(e) =>
                            setSourceYear(
                                e.target.value ? parseInt(e.target.value) : null
                            )
                        }
                        placeholder="e.g. 2007"
                        min={0}
                        max={2100}
                    />
                </div>
            </div>
            <div className={styles.formGroup}>
                <label>Inspired Aspects</label>
                <AspectTagPicker
                    selected={inspiredAspects}
                    onChange={setInspiredAspects}
                />
            </div>
            <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                    rows={2}
                    value={inspiredNotes}
                    onChange={(e) => setInspiredNotes(e.target.value)}
                    placeholder="What did you take from this source? e.g. atmosphere, worldbuilding style..."
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                    marginTop: '0.5rem',
                }}
            >
                {onCancel && (
                    <button type="button" onClick={onCancel}>
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!sourceName.trim()}
                >
                    {initial ? 'Save' : 'Add Inspiration'}
                </button>
            </div>
        </div>
    );
}

type InspirationCardProps = {
    inspiration: Inspiration;
    onUpdate: (id: string, data: Partial<NewInspiration>) => void;
    onDelete: (id: string) => void;
};

function InspirationCard({
    inspiration,
    onUpdate,
    onDelete,
}: InspirationCardProps) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <div
                style={{
                    border: '1px solid var(--accent, #6366f1)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    background: 'rgba(99, 102, 241, 0.05)',
                }}
            >
                <AddInspirationForm
                    projectId={inspiration.projectId}
                    onCreate={(data) => {
                        onUpdate(inspiration.id, data);
                        setEditing(false);
                    }}
                    initial={{
                        sourceName: inspiration.sourceName,
                        sourceType: inspiration.sourceType,
                        sourceYear: inspiration.sourceYear,
                        inspiredAspects: inspiration.inspiredAspects,
                        inspiredNotes: inspiration.inspiredNotes,
                    }}
                    onCancel={() => setEditing(false)}
                />
            </div>
        );
    }

    const aspectLabels = inspiration.inspiredAspects.map((a) =>
        a.replace(/_/g, ' ')
    );

    return (
        <div
            style={{
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}
            >
                <div>
                    <strong>{inspiration.sourceName}</strong>
                    <span
                        style={{
                            color: '#888',
                            fontSize: '0.85em',
                            marginLeft: '0.5rem',
                        }}
                    >
                        ·{' '}
                        {sourceTypeOptions.find(
                            (o) => o.value === inspiration.sourceType
                        )?.label ?? inspiration.sourceType}
                        {inspiration.sourceYear
                            ? ` · ${inspiration.sourceYear}`
                            : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '0.2rem',
                        }}
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(inspiration.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#f44',
                            cursor: 'pointer',
                            padding: '0.2rem',
                        }}
                        title="Delete"
                    >
                        <IconTrash size={14} stroke={2} />
                    </button>
                </div>
            </div>
            {inspiration.inspiredAspects.length > 0 && (
                <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}
                >
                    {aspectLabels.map((label) => (
                        <span
                            key={label}
                            style={{
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.78em',
                                borderRadius: '4px',
                                border: '1px solid #444',
                                color: '#bbb',
                            }}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            )}
            {inspiration.inspiredNotes && (
                <div
                    style={{
                        color: '#999',
                        fontSize: '0.85em',
                        lineHeight: 1.4,
                    }}
                >
                    {inspiration.inspiredNotes}
                </div>
            )}
        </div>
    );
}
