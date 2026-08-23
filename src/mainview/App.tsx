import {
    useState,
    useEffect,
    useRef,
    useCallback,
    type ReactNode,
} from 'react';
import type { RichTextEditorHandle } from './components/RichTextEditor';
import { useRPC } from './contexts/RPCContext';
import type {
    Chapter,
    NewChapter,
    Project,
    FileTab,
    CompendiumCategory,
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    EntityTemplate,
    FieldDefinition,
    PlotThread,
    StoryBeat,
    StoryAct,
    StorySequence,
    StoryScene,
    ChapterPlotThread,
} from './types/index';
import { type TreeEdge, treeEdgeKey } from './templates/tree';
import type { ParsedEntry } from './services/entryParser';
import type { ExtractionSource } from './services/textExtractor';

import { TitleBar } from './ui/titleBar';
import {
    ProjectsDialog,
    ProjectManager,
    SettingsDialog,
    UIDialog,
} from './dialogs';

import OpenFileDialog, { type RecentFile } from './dialogs/OpenFileDialog';
import BulkExtractDialog, {
    type BulkExtractResult,
} from './dialogs/BulkExtractDialog';
import TemplateFieldMappingDialog, {
    type MappingResult,
} from './dialogs/TemplateFieldMappingDialog';
import RichTextEditor from './components/RichTextEditor';
import PreviewPane from './components/PreviewPane';
import FileTabs from './components/FileTabs';
import ChatPanel from './components/ChatPanel';
import CompendiumEntryEditor from './components/CompendiumEntryEditor';
import TimelineDialog from './components/TimelineDialog';
import PlotArchitectureView from './components/PlotArchitectureView';
import ChapterOutlineEditor from './components/ChapterOutlineEditor';
import PlotHolePanel from './components/PlotHolePanel';

import {
    IconChevronLeft,
    IconFiles,
    IconBook,
    //IconUsers,
    //IconMapPin2,
    //IconBuildings,
    //IconSwords,
} from '@tabler/icons-react';
import { StatusBar } from './ui/statusBar';
import type { SaveState } from './ui/statusBar';
import { useSettings } from './contexts/SettingsContext';
import LeftPanel from './ui/workspaces/editor/LeftPanel';
import RightPanel from './ui/workspaces/editor/RightPanel';
import { type ProjectDialogActiveTab } from './constants/layout_tabs';

/*
const categoryConfig: Record<
  CompendiumCategory,
  { icon: typeof IconUsers; label: string }
> = {
  character: { icon: IconUsers, label: "Character" },
  location: { icon: IconMapPin2, label: "Location" },
  organization: { icon: IconBuildings, label: "Organization" },
  item: { icon: IconSwords, label: "Item" },
  lore: { icon: IconBook, label: "Lore" },
};
*/
//type WorkspaceMode = 'editor' | 'ai';

function App() {
    //const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('editor');
    const [isLeftHovered, setIsLeftHovered] = useState(false);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
    const [rightSidebarWidth, setRightSidebarWidth] = useState(550);
    const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
    const dragStartXRef = useRef(0);
    const dragStartWidthRef = useRef(0);
    const leftWidthRef = useRef(280);
    const rightWidthRef = useRef(550);
    const [isPreviewDragging, setIsPreviewDragging] = useState(false);
    const previewDragStartXRef = useRef(0);
    const previewDragStartWidthRef = useRef(0);
    const { settings, updateAppearance } = useSettings();
    const sc = settings?.appearance?.sidebarConstraints;
    const [isCollapsed, setIsCollapsed] = useState(
        sc?.leftPanelCollapsed ?? false
    );
    const [isChatCollapsed, setIsChatCollapsed] = useState(
        sc?.rightPanelCollapsed ?? false
    );
    const [mode, setMode] = useState<'manuscript' | 'compendium'>('manuscript');
    const [isReadingMode, setIsReadingMode] = useState(false);
    const [readerMode, setReaderMode] = useState<'chapter' | 'book'>('chapter');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewWidth, setPreviewWidth] = useState(
        settings?.appearance?.previewWidth ?? 420
    );
    const previewWidthRef = useRef(previewWidth);
    const [chapterTitleEditId, setChapterTitleEditId] = useState<string | null>(
        null
    );
    const [chapterTitleDraft, setChapterTitleDraft] = useState('');

    const handleReaderModeChange = (m: 'chapter' | 'book') => {
        setReaderMode(m);
        if (m === 'book' && currentProject) {
            loadChapters(currentProject.id);
        }
    };

    const appliedPanelStateRef = useRef(false);

    useEffect(() => {
        if (settings?.appearance?.sidebarConstraints) {
            const c = settings.appearance.sidebarConstraints;
            setLeftSidebarWidth(c.leftWidth);
            setRightSidebarWidth(c.rightWidth);
            if (!appliedPanelStateRef.current) {
                appliedPanelStateRef.current = true;
                setIsCollapsed(c.leftPanelCollapsed);
                setIsChatCollapsed(c.rightPanelCollapsed);
            }
            leftWidthRef.current = c.leftWidth;
            rightWidthRef.current = c.rightWidth;
        }
        if (typeof settings?.appearance?.previewWidth === 'number') {
            previewWidthRef.current = settings.appearance.previewWidth;
            setPreviewWidth(settings.appearance.previewWidth);
        }
    }, [
        settings?.appearance?.sidebarConstraints,
        settings?.appearance?.previewWidth,
    ]);

    const [explorerTab, setExplorerTab] = useState<
        'chapters' | CompendiumCategory
    >('chapters');
    const [activeDialog, setActiveDialog] = useState<
        | 'projects'
        | 'settings'
        | 'ui'
        | 'openFileDialog'
        | 'projectManager'
        | null
    >(null);
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
    const [showProjectSelection, setShowProjectSelection] = useState(false);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [tabContents, setTabContents] = useState<Record<string, string>>({});
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);
    const [isScratchOpen, setIsScratchOpen] = useState(false);
    const [scratchContent, setScratchContent] = useState('');
    const [compendiumEntries, setCompendiumEntries] = useState<
        Record<string, unknown>
    >({});
    const [characters, setCharacters] = useState<Character[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
    const [plotThreads, setPlotThreads] = useState<PlotThread[]>([]);
    const [storyBeats, setStoryBeats] = useState<StoryBeat[]>([]);
    const [storyActs, setStoryActs] = useState<StoryAct[]>([]);
    const [storySequences, setStorySequences] = useState<StorySequence[]>([]);
    const [storyScenes, setStoryScenes] = useState<StoryScene[]>([]);
    const [chapterPlotThreads, setChapterPlotThreads] = useState<
        ChapterPlotThread[]
    >([]);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [skeletonMode, setSkeletonMode] = useState(false);
    const [projectManagerInitial, setProjectManagerInitial] = useState<{
        tab: ProjectDialogActiveTab;
        category?: CompendiumCategory;
    }>({ tab: 'general' });
    const [templates, setTemplates] = useState<
        Record<CompendiumCategory, EntityTemplate | null>
    >({
        character: null,
        location: null,
        organization: null,
        item: null,
        lore: null,
    });
    const [resolvedTemplateFields, setResolvedTemplateFields] = useState<
        Record<CompendiumCategory, FieldDefinition[]>
    >({
        character: [],
        location: [],
        organization: [],
        item: [],
        lore: [],
    });

    // Bulk extraction state
    const [extractDialogOpen, setExtractDialogOpen] = useState(false);
    const [extractedEntries, setExtractedEntries] = useState<ParsedEntry[]>([]);

    // Single-entry template mapping state (for /create commands)
    const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
    const [pendingCreateEntry, setPendingCreateEntry] = useState<{
        category: CompendiumCategory;
        name: string;
        templateData: Record<string, unknown>;
        templateFields: FieldDefinition[];
        resolve: (result: MappingResult | null) => void;
    } | null>(null);

    const [saveState, setSaveState] = useState<SaveState>('idle-unmodified');
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const modifiedTabIdsRef = useRef<Set<string>>(new Set());
    const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    const rpc = useRPC();
    const editorRef = useRef<RichTextEditorHandle>(null);

    const RECENT_FILES_KEY = 'recentlyOpenedFiles';
    const MAX_RECENT_FILES = 6;

    function getTabsStorageKey(projectId: string) {
        return `project-tabs-${projectId}`;
    }

    function loadProjectTabs(projectId: string) {
        try {
            const stored = localStorage.getItem(getTabsStorageKey(projectId));
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load project tabs:', e);
        }
        return null;
    }

    function saveProjectTabs(
        projectId: string,
        tabs: FileTab[],
        activeTabId: string | null
    ) {
        try {
            localStorage.setItem(
                getTabsStorageKey(projectId),
                JSON.stringify({ tabs, activeTabId })
            );
        } catch (e) {
            console.error('Failed to save project tabs:', e);
        }
    }

    async function restoreTabContents(tabs: FileTab[]) {
        for (const tab of tabs) {
            if (tab.type === 'chapter') {
                const c = await rpc.request['db:get-chapter'](tab.id);
                if (c?.content) {
                    setTabContents((prev) => ({
                        ...prev,
                        [tab.id]: c.content!,
                    }));
                }
            } else if (tab.category) {
                let entry: unknown;
                switch (tab.category) {
                    case 'character':
                        entry = await rpc.request['db:get-character'](tab.id);
                        break;
                    case 'location':
                        entry = await rpc.request['db:get-location'](tab.id);
                        break;
                    case 'organization':
                        entry = await rpc.request['db:get-organization'](
                            tab.id
                        );
                        break;
                    case 'item':
                        entry = await rpc.request['db:get-item'](tab.id);
                        break;
                    case 'lore':
                        entry = await rpc.request['db:get-lore-entry'](tab.id);
                        break;
                }
                if (entry) {
                    setCompendiumEntries((prev) => ({
                        ...prev,
                        [tab.id]: entry,
                    }));
                }
            } else if (tab.type === 'file' && tab.filePath) {
                const content = await rpc.request['file:read-content'](
                    tab.filePath
                );
                if (content !== undefined && content !== null) {
                    setTabContents((prev) => ({ ...prev, [tab.id]: content }));
                }
            }
        }
    }

    function loadRecentFiles() {
        try {
            const stored = localStorage.getItem(RECENT_FILES_KEY);
            if (stored) {
                setRecentFiles(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load recent files:', e);
        }
    }

    function saveRecentFiles(files: RecentFile[]) {
        try {
            localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
        } catch (e) {
            console.error('Failed to save recent files:', e);
        }
    }

    function addToRecentFiles(absolutePath: string, fileName: string) {
        let relativePath: string;
        if (currentProject?.path) {
            relativePath = absolutePath
                .replace(currentProject.path, '')
                .replace(/^[\\/]/, '');
        } else {
            relativePath = absolutePath;
        }
        const newFile: RecentFile = { path: relativePath, name: fileName };
        setRecentFiles((prev) => {
            const filtered = prev.filter((f) => f.path !== relativePath);
            const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES);
            saveRecentFiles(updated);
            return updated;
        });
    }

    useEffect(() => {
        loadRecentFiles();
    }, []);

    useEffect(() => {
        if (currentProject) {
            saveProjectTabs(currentProject.id, openTabs, activeTabId);
        }
    }, [currentProject?.id, openTabs, activeTabId]);

    useEffect(() => {
        if (currentProject && explorerTab !== 'chapters') {
            loadTemplateForCategory(
                currentProject.id,
                explorerTab as CompendiumCategory
            );
        }
    }, [explorerTab, currentProject?.id]);

    useEffect(() => {
        async function initProject() {
            const project = await rpc.request['project:get-current']();
            if (project) {
                setCurrentProject(project);
                loadChapters(project.id);
                loadCompendium(project.id);
                loadScratchNote(project.id);
                loadPlotArchitecture(project.id);

                const savedState = loadProjectTabs(project.id);
                if (savedState) {
                    setOpenTabs(savedState.tabs);
                    setActiveTabId(savedState.activeTabId);
                    await restoreTabContents(savedState.tabs);
                }
            } else {
                setShowProjectSelection(true);
            }
        }
        initProject();
    }, []);

    async function handleSelectProject(projectId: string) {
        if (scratchSaveTimeoutRef.current)
            clearTimeout(scratchSaveTimeoutRef.current);
        const project = await rpc.request['project:set-current'](projectId);
        if (project) {
            const savedState = loadProjectTabs(project.id);

            setCurrentProject(project);
            setOpenTabs(savedState?.tabs || []);
            setActiveTabId(savedState?.activeTabId || null);
            setTabContents({});
            setCompendiumEntries({});
            setIsScratchOpen(false);
            setScratchContent('');
            setIsReadingMode(false);
            setReaderMode('chapter');
            setIsPreviewOpen(false);
            setShowProjectSelection(false);

            loadChapters(project.id);
            loadCompendium(project.id);
            loadScratchNote(project.id);
            loadPlotArchitecture(project.id);

            if (savedState?.tabs) {
                await restoreTabContents(savedState.tabs);
            }
        }
    }

    async function refreshCurrentProject() {
        if (!currentProject) return;
        const updated = await rpc.request['project:get-current']();
        if (updated) {
            setCurrentProject(updated);
        }
    }

    async function loadChapters(projectId: string) {
        (async () => {
            setChaptersLoading(true);
            try {
                const result = await rpc.request['db:get-chapters'](projectId);
                setChapters(result || []);
            } catch (e) {
                console.error('Failed to load chapters:', e);
            } finally {
                setChaptersLoading(false);
            }
        })();
    }

    async function loadScratchNote(projectId: string) {
        try {
            const content = await rpc.request['db:get-scratch'](projectId);
            setScratchContent(content || '');
        } catch (e) {
            console.error('Failed to load scratch note:', e);
        }
    }

    async function saveScratchNote(content: string) {
        if (!currentProject) return;
        await rpc.request['db:save-scratch']({
            projectId: currentProject.id,
            content,
        });
    }

    async function loadPlotArchitecture(projectId: string) {
        const [threads, beats, acts, seqs, scenes] = await Promise.all([
            rpc.request['db:get-plot-threads'](projectId),
            rpc.request['db:get-story-beats'](projectId),
            rpc.request['db:get-story-acts'](projectId),
            rpc.request['db:get-story-sequences'](projectId),
            rpc.request['db:get-story-scenes'](projectId),
        ]);
        setPlotThreads(threads || []);
        setStoryBeats(beats || []);
        setStoryActs(acts || []);
        setStorySequences(seqs || []);
        setStoryScenes(scenes || []);
    }

    async function handlePlotDataChange() {
        if (!currentProject) return;
        await loadPlotArchitecture(currentProject.id);
        loadChapters(currentProject.id);
    }

    async function loadCompendium(projectId: string) {
        const [chars, locs, orgs, itemsData, lore] = await Promise.all([
            rpc.request['db:get-characters'](projectId),
            rpc.request['db:get-locations'](projectId),
            rpc.request['db:get-organizations'](projectId),
            rpc.request['db:get-items'](projectId),
            rpc.request['db:get-lore-entries'](projectId),
        ]);
        setCharacters(chars || []);
        setLocations(locs || []);
        setOrganizations(orgs || []);
        setItems(itemsData || []);
        setLoreEntries(lore || []);

        const categories: CompendiumCategory[] = [
            'character',
            'location',
            'organization',
            'item',
            'lore',
        ];
        await Promise.all(
            categories.map((cat) => loadTemplateForCategory(projectId, cat))
        );
    }

    function handleEditTemplate(category?: CompendiumCategory) {
        if (!currentProject) return;
        setProjectManagerInitial({
            tab: 'templates',
            category: category ?? (explorerTab as CompendiumCategory),
        });
        setActiveDialog('projectManager');
    }

    async function loadTemplateForCategory(
        projectId: string,
        category: CompendiumCategory
    ) {
        const [template, resolved] = await Promise.all([
            rpc.request['db:get-template']({ projectId, baseType: category }),
            rpc.request['db:get-resolved-template']({
                projectId,
                baseType: category,
            }),
        ]);
        setTemplates((prev) => ({ ...prev, [category]: template || null }));
        setResolvedTemplateFields((prev) => ({
            ...prev,
            [category]: resolved?.fields || [],
        }));
    }

    async function refreshResolvedTemplates() {
        if (!currentProject) return;
        const categories: CompendiumCategory[] = [
            'character',
            'location',
            'organization',
            'item',
            'lore',
        ];
        await Promise.all(
            categories.map((cat) =>
                loadTemplateForCategory(currentProject.id, cat)
            )
        );
    }

    async function saveChapterContent(tabId: string, content: string) {
        await rpc.request['db:update-chapter']({
            id: tabId,
            data: { content },
        });
        setOpenTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, isModified: false } : t))
        );
        setLastSavedTime(new Date());
        setSaveState('just-saved');
        if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
        justSavedTimerRef.current = setTimeout(() => {
            setSaveState((prev) => {
                if (prev === 'saving') return prev;
                return modifiedTabIdsRef.current.has(tabId)
                    ? 'idle-modified'
                    : 'idle-unmodified';
            });
        }, 2000);
    }

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scratchSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (scratchSaveTimeoutRef.current)
                clearTimeout(scratchSaveTimeoutRef.current);
            if (justSavedTimerRef.current)
                clearTimeout(justSavedTimerRef.current);
        };
    }, []);

    function debouncedSave(tabId: string, content: string) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveChapterContent(tabId, content);
        }, 1000);
    }

    function debouncedScratchSave(content: string) {
        if (scratchSaveTimeoutRef.current)
            clearTimeout(scratchSaveTimeoutRef.current);
        scratchSaveTimeoutRef.current = setTimeout(() => {
            saveScratchNote(content);
        }, 1000);
    }

    function computeMetrics(html: string) {
        const text = html.replace(/<[^>]*>/g, '').trim();
        const words = text ? text.split(/\s+/).length : 0;
        setWordCount(words);
        setCharCount(text.length);
    }

    async function handleNewChapter() {
        if (!currentProject) return;
        const chapterList = await rpc.request['db:get-chapters'](
            currentProject.id
        );
        const newChapter: NewChapter = {
            id: crypto.randomUUID(),
            projectId: currentProject.id,
            title: `Chapter ${chapterList.length + 1}`,
            content: null,
            filePath: null,
            orderIndex: chapterList.length,
            status: 'outline',
            outline: null,
            povCharacterId: null,
            wordCountTarget: null,
            actId: null,
            sequenceId: null,
        };
        await rpc.request['db:create-chapter'](newChapter);
        loadChapters(currentProject.id);
    }

    async function renameChapter(id: string, title: string) {
        const trimmed = title.trim();
        if (!trimmed) return;
        await rpc.request['db:update-chapter']({
            id,
            data: { title: trimmed },
        });
        const updated = await rpc.request['db:get-chapter'](id);
        if (updated) {
            setChapters((prev) => prev.map((c) => (c.id === id ? updated : c)));
        }
        setOpenTabs((prev) =>
            prev.map((t) => (t.id === id ? { ...t, name: trimmed } : t))
        );
        setChapterTitleEditId((prev) => (prev === id ? null : prev));
        setChapterTitleDraft('');
    }

    async function handleChapterTitleDraftCommit() {
        const id = chapterTitleEditId;
        if (!id) {
            setChapterTitleDraft('');
            return;
        }
        const chapter = chapters.find((c) => c.id === id);
        const trimmed = chapterTitleDraft.trim();
        if (!trimmed || (chapter && trimmed === chapter.title)) {
            setChapterTitleEditId(null);
            setChapterTitleDraft('');
            return;
        }
        await renameChapter(id, chapterTitleDraft);
    }

    async function openChapterTab(chapter: Chapter) {
        const c = await rpc.request['db:get-chapter'](chapter.id);
        if (c?.content) {
            setTabContents((prev) => ({
                ...prev,
                [chapter.id]: c.content!,
            }));
        }
        const existingTab = openTabs.find((t) => t.id === chapter.id);
        if (!existingTab) {
            const newTab = {
                id: chapter.id,
                name: chapter.title,
                type: 'chapter' as const,
                filePath: chapter.filePath || '',
                isModified: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
        }
        setActiveTabId(chapter.id);
    }

    async function handleNewCompendiumEntry(category: CompendiumCategory) {
        if (!currentProject) return;

        const label = category.charAt(0).toUpperCase() + category.slice(1);
        const id = crypto.randomUUID();
        const name = `Untitled ${label}`;

        let newEntry: unknown;

        switch (category) {
            case 'character':
                newEntry = await rpc.request['db:create-character']({
                    id,
                    projectId: currentProject.id,
                    name,
                    filePath: null,
                    templateData: null,
                });
                break;
            case 'location':
                newEntry = await rpc.request['db:create-location']({
                    id,
                    projectId: currentProject.id,
                    name,
                    filePath: null,
                    templateData: null,
                });
                break;
            case 'organization':
                newEntry = await rpc.request['db:create-organization']({
                    id,
                    projectId: currentProject.id,
                    name,
                    filePath: null,
                    templateData: null,
                });
                break;
            case 'item':
                newEntry = await rpc.request['db:create-item']({
                    id,
                    projectId: currentProject.id,
                    name,
                    filePath: null,
                    templateData: null,
                });
                break;
            case 'lore':
                newEntry = await rpc.request['db:create-lore-entry']({
                    id,
                    projectId: currentProject.id,
                    name,
                    filePath: null,
                    templateData: null,
                });
                break;
        }

        if (newEntry && (newEntry as { id: string }).id) {
            setCompendiumEntries((prev) => ({ ...prev, [id]: newEntry }));

            switch (category) {
                case 'character':
                    setCharacters((prev) => [...prev, newEntry as Character]);
                    break;
                case 'location':
                    setLocations((prev) => [...prev, newEntry as Location]);
                    break;
                case 'organization':
                    setOrganizations((prev) => [
                        ...prev,
                        newEntry as Organization,
                    ]);
                    break;
                case 'item':
                    setItems((prev) => [...prev, newEntry as Item]);
                    break;
                case 'lore':
                    setLoreEntries((prev) => [...prev, newEntry as LoreEntry]);
                    break;
            }

            const newTab: FileTab = {
                id,
                name,
                type: category,
                filePath: '',
                isModified: false,
                category,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(id);
        }
    }

    async function handleOpenCompendiumEntry(
        entryId: string,
        category: CompendiumCategory
    ) {
        try {
            let entry: unknown;
            switch (category) {
                case 'character':
                    entry = await rpc.request['db:get-character'](entryId);
                    break;
                case 'location':
                    entry = await rpc.request['db:get-location'](entryId);
                    break;
                case 'organization':
                    entry = await rpc.request['db:get-organization'](entryId);
                    break;
                case 'item':
                    entry = await rpc.request['db:get-item'](entryId);
                    break;
                case 'lore':
                    entry = await rpc.request['db:get-lore-entry'](entryId);
                    break;
            }

            if (entry && (entry as { id: string }).id) {
                setCompendiumEntries((prev) => ({ ...prev, [entryId]: entry }));
                const existingTab = openTabs.find((t) => t.id === entryId);
                if (!existingTab) {
                    const label =
                        category.charAt(0).toUpperCase() + category.slice(1);
                    const newTab: FileTab = {
                        id: entryId,
                        name:
                            (entry as { name: string }).name || `New ${label}`,
                        type: category,
                        filePath: '',
                        isModified: false,
                        category,
                    };
                    setOpenTabs((prev) => [...prev, newTab]);
                }
                setActiveTabId(entryId);
            }
        } catch (e) {
            console.error('Failed to open entry:', e);
        }
    }

    async function handleUpdateCompendiumEntry(
        entryId: string,
        category: CompendiumCategory,
        field: string,
        value: unknown
    ) {
        try {
            let updated: unknown;
            switch (category) {
                case 'character':
                    updated = await rpc.request['db:update-character']({
                        id: entryId,
                        data: { [field]: value },
                    });
                    break;
                case 'location':
                    updated = await rpc.request['db:update-location']({
                        id: entryId,
                        data: { [field]: value },
                    });
                    break;
                case 'organization':
                    updated = await rpc.request['db:update-organization']({
                        id: entryId,
                        data: { [field]: value },
                    });
                    break;
                case 'item':
                    updated = await rpc.request['db:update-item']({
                        id: entryId,
                        data: { [field]: value },
                    });
                    break;
                case 'lore':
                    updated = await rpc.request['db:update-lore-entry']({
                        id: entryId,
                        data: { [field]: value },
                    });
                    break;
            }

            if (updated) {
                setCompendiumEntries((prev) => ({
                    ...prev,
                    [entryId]: updated,
                }));
                setOpenTabs((prev) =>
                    prev.map((t) =>
                        t.id === entryId && field === 'name'
                            ? { ...t, name: value as string }
                            : t
                    )
                );

                if (field === 'name') {
                    switch (category) {
                        case 'character':
                            setCharacters((prev) =>
                                prev.map((e) =>
                                    e.id === entryId
                                        ? { ...e, name: value as string }
                                        : e
                                )
                            );
                            break;
                        case 'location':
                            setLocations((prev) =>
                                prev.map((e) =>
                                    e.id === entryId
                                        ? { ...e, name: value as string }
                                        : e
                                )
                            );
                            break;
                        case 'organization':
                            setOrganizations((prev) =>
                                prev.map((e) =>
                                    e.id === entryId
                                        ? { ...e, name: value as string }
                                        : e
                                )
                            );
                            break;
                        case 'item':
                            setItems((prev) =>
                                prev.map((e) =>
                                    e.id === entryId
                                        ? { ...e, name: value as string }
                                        : e
                                )
                            );
                            break;
                        case 'lore':
                            setLoreEntries((prev) =>
                                prev.map((e) =>
                                    e.id === entryId
                                        ? { ...e, name: value as string }
                                        : e
                                )
                            );
                            break;
                    }
                }

                if (field === 'templateData' && updated) {
                    await mirrorTreeChanges(
                        entryId,
                        category,
                        value as Record<string, unknown>
                    );
                }
            }
        } catch (e) {
            console.error('Failed to update entry:', e);
        }
    }

    async function mirrorTreeChanges(
        sourceId: string,
        sourceCategory: CompendiumCategory,
        newTemplateData: Record<string, unknown>
    ) {
        const oldEntry = compendiumEntries[sourceId] as Record<
            string,
            unknown
        > | null;
        const oldTemplateData =
            (oldEntry?.templateData as Record<string, unknown> | null) || {};
        const newData = newTemplateData || {};

        const treeFieldNames = new Set<string>();
        for (const [key, val] of Object.entries(newData)) {
            if (
                Array.isArray(val) &&
                val.every(
                    (v) =>
                        typeof v === 'object' &&
                        v !== null &&
                        'relation' in v &&
                        'targetId' in v
                )
            ) {
                treeFieldNames.add(key);
            }
        }
        for (const [key, val] of Object.entries(oldTemplateData)) {
            if (
                Array.isArray(val) &&
                val.every(
                    (v) =>
                        typeof v === 'object' &&
                        v !== null &&
                        'relation' in v &&
                        'targetId' in v
                )
            ) {
                treeFieldNames.add(key);
            }
        }

        for (const fieldName of treeFieldNames) {
            const oldEdges: TreeEdge[] =
                (oldTemplateData[fieldName] as TreeEdge[]) || [];
            const newEdges: TreeEdge[] =
                (newData[fieldName] as TreeEdge[]) || [];

            const oldKeys = new Set(oldEdges.map((e) => treeEdgeKey(e)));
            const newKeys = new Set(newEdges.map((e) => treeEdgeKey(e)));

            const added = newEdges.filter((e) => !oldKeys.has(treeEdgeKey(e)));
            const removed = oldEdges.filter(
                (e) => !newKeys.has(treeEdgeKey(e))
            );

            for (const edge of added) {
                await mirrorEdge(
                    sourceId,
                    sourceCategory,
                    fieldName,
                    edge,
                    'add'
                );
            }
            for (const edge of removed) {
                await mirrorEdge(
                    sourceId,
                    sourceCategory,
                    fieldName,
                    edge,
                    'remove'
                );
            }
        }
    }

    async function mirrorEdge(
        sourceId: string,
        sourceCategory: CompendiumCategory,
        fieldName: string,
        edge: TreeEdge,
        action: 'add' | 'remove'
    ) {
        const targetId = edge.targetId;
        const targetCategory = edge.targetType as CompendiumCategory;
        if (!targetId || !targetCategory) return;

        const targetEntries = compendiumEntries[targetId] as Record<
            string,
            unknown
        > | null;
        if (!targetEntries) return;

        const targetTemplateData =
            (targetEntries.templateData as Record<string, unknown> | null) ||
            {};
        const targetEdges = (targetTemplateData[fieldName] as TreeEdge[]) || [];

        const inverseKey = treeEdgeKey({
            relation: edge.inverseRelation,
            inverseRelation: edge.relation,
            targetType: sourceCategory,
            targetId: sourceId,
        });

        let newTargetEdges: TreeEdge[];
        if (action === 'add') {
            if (targetEdges.some((e) => treeEdgeKey(e) === inverseKey)) return;
            newTargetEdges = [
                ...targetEdges,
                {
                    relation: edge.inverseRelation,
                    inverseRelation: edge.relation,
                    targetType: sourceCategory,
                    targetId: sourceId,
                },
            ];
        } else {
            newTargetEdges = targetEdges.filter(
                (e) => treeEdgeKey(e) !== inverseKey
            );
        }

        try {
            let updated: unknown;
            switch (targetCategory) {
                case 'character':
                    updated = await rpc.request['db:update-character']({
                        id: targetId,
                        data: {
                            templateData: {
                                ...targetTemplateData,
                                [fieldName]: newTargetEdges,
                            },
                        },
                    });
                    break;
                case 'location':
                    updated = await rpc.request['db:update-location']({
                        id: targetId,
                        data: {
                            templateData: {
                                ...targetTemplateData,
                                [fieldName]: newTargetEdges,
                            },
                        },
                    });
                    break;
                case 'organization':
                    updated = await rpc.request['db:update-organization']({
                        id: targetId,
                        data: {
                            templateData: {
                                ...targetTemplateData,
                                [fieldName]: newTargetEdges,
                            },
                        },
                    });
                    break;
                case 'item':
                    updated = await rpc.request['db:update-item']({
                        id: targetId,
                        data: {
                            templateData: {
                                ...targetTemplateData,
                                [fieldName]: newTargetEdges,
                            },
                        },
                    });
                    break;
                case 'lore':
                    updated = await rpc.request['db:update-lore-entry']({
                        id: targetId,
                        data: {
                            templateData: {
                                ...targetTemplateData,
                                [fieldName]: newTargetEdges,
                            },
                        },
                    });
                    break;
                default:
                    return;
            }

            if (updated) {
                setCompendiumEntries((prev) => ({
                    ...prev,
                    [targetId]: updated,
                }));
                switch (targetCategory) {
                    case 'character':
                        setCharacters((prev) =>
                            prev.map((e) =>
                                e.id === targetId
                                    ? {
                                          ...e,
                                          templateData: (updated as Character)
                                              .templateData,
                                      }
                                    : e
                            )
                        );
                        break;
                    case 'location':
                        setLocations((prev) =>
                            prev.map((e) =>
                                e.id === targetId
                                    ? {
                                          ...e,
                                          templateData: (updated as Location)
                                              .templateData,
                                      }
                                    : e
                            )
                        );
                        break;
                    case 'organization':
                        setOrganizations((prev) =>
                            prev.map((e) =>
                                e.id === targetId
                                    ? {
                                          ...e,
                                          templateData: (
                                              updated as Organization
                                          ).templateData,
                                      }
                                    : e
                            )
                        );
                        break;
                    case 'item':
                        setItems((prev) =>
                            prev.map((e) =>
                                e.id === targetId
                                    ? {
                                          ...e,
                                          templateData: (updated as Item)
                                              .templateData,
                                      }
                                    : e
                            )
                        );
                        break;
                    case 'lore':
                        setLoreEntries((prev) =>
                            prev.map((e) =>
                                e.id === targetId
                                    ? {
                                          ...e,
                                          templateData: (updated as LoreEntry)
                                              .templateData,
                                      }
                                    : e
                            )
                        );
                        break;
                }
            }
        } catch (e) {
            console.error('Failed to mirror tree edge:', e);
        }
    }

    async function handleCreateCompendiumEntryFromAI(
        category: CompendiumCategory,
        name: string,
        templateData: Record<string, unknown>
    ): Promise<string | null> {
        if (!currentProject) return null;
        const id = crypto.randomUUID();

        try {
            // Check template mismatches
            const resolved = await rpc.request['db:get-resolved-template']({
                projectId: currentProject.id,
                baseType: category,
            });
            const templateFields = resolved?.fields || [];
            const templateFieldNames = new Set(
                templateFields.map((f) => f.name)
            );
            const aiFieldKeys = Object.keys(templateData);

            const unmatchedKeys = aiFieldKeys.filter(
                (key) => !templateFieldNames.has(key)
            );

            let finalTemplateData = templateData;
            let templateUpdates: FieldDefinition[] = [];

            if (unmatchedKeys.length > 0 && currentProject) {
                // Show mapping dialog via promise
                const mappingResult = await new Promise<MappingResult | null>(
                    (resolve) => {
                        setPendingCreateEntry({
                            category,
                            name,
                            templateData,
                            templateFields,
                            resolve,
                        });
                        setMappingDialogOpen(true);
                    }
                );

                if (!mappingResult) return null; // User cancelled

                finalTemplateData = mappingResult.mergedTemplateData;
                templateUpdates = mappingResult.newFieldsToAdd;

                // Persist new template fields
                if (templateUpdates.length > 0) {
                    const existingTemplate = await rpc.request[
                        'db:get-template'
                    ]({
                        projectId: currentProject.id,
                        baseType: category,
                    });
                    const updatedFields = [
                        ...(existingTemplate?.customFields || []),
                    ];
                    for (const newField of templateUpdates) {
                        if (
                            !updatedFields.find((f) => f.name === newField.name)
                        ) {
                            updatedFields.push(newField);
                        }
                    }
                    await rpc.request['db:save-template']({
                        projectId: currentProject.id,
                        baseType: category,
                        customFields: updatedFields,
                        globalTemplateId:
                            existingTemplate?.globalTemplateId ?? undefined,
                        seriesTemplateId:
                            existingTemplate?.seriesTemplateId ?? undefined,
                    });
                    // Refresh resolved fields
                    const newResolved = await rpc.request[
                        'db:get-resolved-template'
                    ]({
                        projectId: currentProject.id,
                        baseType: category,
                    });
                    setResolvedTemplateFields((prev) => ({
                        ...prev,
                        [category]: newResolved?.fields || [],
                    }));
                }
            }

            let newEntry: unknown;
            switch (category) {
                case 'character':
                    newEntry = await rpc.request['db:create-character']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData: finalTemplateData,
                    });
                    break;
                case 'location':
                    newEntry = await rpc.request['db:create-location']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData: finalTemplateData,
                    });
                    break;
                case 'organization':
                    newEntry = await rpc.request['db:create-organization']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData: finalTemplateData,
                    });
                    break;
                case 'item':
                    newEntry = await rpc.request['db:create-item']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData: finalTemplateData,
                    });
                    break;
                case 'lore':
                    newEntry = await rpc.request['db:create-lore-entry']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData: finalTemplateData,
                    });
                    break;
            }

            if (!newEntry || !(newEntry as { id: string }).id) return null;

            setCompendiumEntries((prev) => ({ ...prev, [id]: newEntry }));

            switch (category) {
                case 'character':
                    setCharacters((prev) => [...prev, newEntry as Character]);
                    break;
                case 'location':
                    setLocations((prev) => [...prev, newEntry as Location]);
                    break;
                case 'organization':
                    setOrganizations((prev) => [
                        ...prev,
                        newEntry as Organization,
                    ]);
                    break;
                case 'item':
                    setItems((prev) => [...prev, newEntry as Item]);
                    break;
                case 'lore':
                    setLoreEntries((prev) => [...prev, newEntry as LoreEntry]);
                    break;
            }

            const newTab: FileTab = {
                id,
                name,
                type: category,
                filePath: '',
                isModified: false,
                category,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(id);
            return id;
        } catch (e) {
            console.error('Failed to create compendium entry from AI:', e);
            return null;
        }
    }

    async function createCompendiumEntry(
        category: CompendiumCategory,
        name: string,
        templateData: Record<string, unknown>
    ): Promise<string | null> {
        if (!currentProject) return null;
        const id = crypto.randomUUID();

        try {
            let newEntry: unknown;
            switch (category) {
                case 'character':
                    newEntry = await rpc.request['db:create-character']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData,
                    });
                    break;
                case 'location':
                    newEntry = await rpc.request['db:create-location']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData,
                    });
                    break;
                case 'organization':
                    newEntry = await rpc.request['db:create-organization']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData,
                    });
                    break;
                case 'item':
                    newEntry = await rpc.request['db:create-item']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData,
                    });
                    break;
                case 'lore':
                    newEntry = await rpc.request['db:create-lore-entry']({
                        id,
                        projectId: currentProject.id,
                        name,
                        filePath: null,
                        templateData,
                    });
                    break;
            }

            if (!newEntry || !(newEntry as { id: string }).id) return null;

            setCompendiumEntries((prev) => ({ ...prev, [id]: newEntry }));

            switch (category) {
                case 'character':
                    setCharacters((prev) => [...prev, newEntry as Character]);
                    break;
                case 'location':
                    setLocations((prev) => [...prev, newEntry as Location]);
                    break;
                case 'organization':
                    setOrganizations((prev) => [
                        ...prev,
                        newEntry as Organization,
                    ]);
                    break;
                case 'item':
                    setItems((prev) => [...prev, newEntry as Item]);
                    break;
                case 'lore':
                    setLoreEntries((prev) => [...prev, newEntry as LoreEntry]);
                    break;
            }

            const newTab: FileTab = {
                id,
                name,
                type: category,
                filePath: '',
                isModified: false,
                category,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(id);
            return id;
        } catch (e) {
            console.error('Failed to create entry:', e);
            return null;
        }
    }

    async function handleExtractEntities(
        entries: ParsedEntry[],
        _source: ExtractionSource
    ) {
        setExtractedEntries(entries);
        setExtractDialogOpen(true);
    }

    async function handleBulkExtractResult(result: BulkExtractResult | null) {
        setExtractDialogOpen(false);
        if (!result || !currentProject) return;

        for (const entry of result.entries) {
            if (entry.existingId) {
                // Update existing entry
                const data = {
                    name: entry.name,
                    templateData: entry.templateData,
                } as any;
                switch (entry.category) {
                    case 'character':
                        await rpc.request['db:update-character']({
                            id: entry.existingId,
                            data,
                        });
                        break;
                    case 'location':
                        await rpc.request['db:update-location']({
                            id: entry.existingId,
                            data,
                        });
                        break;
                    case 'organization':
                        await rpc.request['db:update-organization']({
                            id: entry.existingId,
                            data,
                        });
                        break;
                    case 'item':
                        await rpc.request['db:update-item']({
                            id: entry.existingId,
                            data,
                        });
                        break;
                    case 'lore':
                        await rpc.request['db:update-lore-entry']({
                            id: entry.existingId,
                            data,
                        });
                        break;
                }
            } else {
                await createCompendiumEntry(
                    entry.category,
                    entry.name,
                    entry.templateData
                );
            }
        }

        // Refresh compendium lists
        if (currentProject) loadCompendium(currentProject.id);

        // Apply template updates
        for (const update of result.templateUpdates) {
            const existing = await rpc.request['db:get-template']({
                projectId: currentProject.id,
                baseType: update.baseType,
            });
            const updatedFields = [...(existing?.customFields || [])];
            for (const field of update.fields) {
                if (!updatedFields.find((f) => f.name === field.name)) {
                    updatedFields.push(field);
                }
            }
            await rpc.request['db:save-template']({
                projectId: currentProject.id,
                baseType: update.baseType,
                customFields: updatedFields,
                globalTemplateId: existing?.globalTemplateId ?? undefined,
                seriesTemplateId: existing?.seriesTemplateId ?? undefined,
            });
            const newResolved = await rpc.request['db:get-resolved-template']({
                projectId: currentProject.id,
                baseType: update.baseType,
            });
            setResolvedTemplateFields((prev) => ({
                ...prev,
                [update.baseType]: newResolved?.fields || [],
            }));
        }

        setExtractedEntries([]);
    }

    async function handleUpdateCompendium(
        _entries: ParsedEntry[],
        _source: ExtractionSource
    ) {
        // For now, treat same as extract (will refine later)
        handleExtractEntities(_entries, _source);
    }

    function handleCloseCompendiumTab(
        tabId: string,
        _category: CompendiumCategory
    ) {
        setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
        setActiveTabId((prev) => (prev === tabId ? null : prev));
    }

    async function handleDeleteCompendiumEntry(
        entryId: string,
        category: CompendiumCategory
    ) {
        try {
            switch (category) {
                case 'character':
                    await rpc.request['db:delete-character'](entryId);
                    setCharacters((prev) =>
                        prev.filter((e) => e.id !== entryId)
                    );
                    break;
                case 'location':
                    await rpc.request['db:delete-location'](entryId);
                    setLocations((prev) =>
                        prev.filter((e) => e.id !== entryId)
                    );
                    break;
                case 'organization':
                    await rpc.request['db:delete-organization'](entryId);
                    setOrganizations((prev) =>
                        prev.filter((e) => e.id !== entryId)
                    );
                    break;
                case 'item':
                    await rpc.request['db:delete-item'](entryId);
                    setItems((prev) => prev.filter((e) => e.id !== entryId));
                    break;
                case 'lore':
                    await rpc.request['db:delete-lore-entry'](entryId);
                    setLoreEntries((prev) =>
                        prev.filter((e) => e.id !== entryId)
                    );
                    break;
            }

            setCompendiumEntries((prev) => {
                const copy = { ...prev };
                delete copy[entryId];
                return copy;
            });

            const wasActive = activeTabId === entryId;
            setOpenTabs((prev) => prev.filter((t) => t.id !== entryId));
            if (wasActive) {
                setActiveTabId(null);
            }
        } catch (e) {
            console.error('Failed to delete entry:', e);
        }
    }

    function getActiveTab(): FileTab | undefined {
        return openTabs.find((t) => t.id === activeTabId);
    }

    useEffect(() => {
        if (!settings?.appearance?.sidebarConstraints?.enableAutoSwitchPanel)
            return;
        const tab = getActiveTab();
        if (!tab) return;
        if (tab.type === 'chapter') {
            setMode('manuscript');
            setExplorerTab('chapters');
        } else if (
            tab.type === 'character' ||
            tab.type === 'location' ||
            tab.type === 'organization' ||
            tab.type === 'item' ||
            tab.type === 'lore'
        ) {
            setMode('compendium');
            setExplorerTab(tab.type);
        }
    }, [
        activeTabId,
        openTabs,
        settings?.appearance?.sidebarConstraints?.enableAutoSwitchPanel,
    ]);

    function isTextFileTab(): boolean {
        if (isScratchOpen) return true;
        const tab = getActiveTab();
        if (!tab) return false;
        if (tab.type === 'chapter') {
            const ch = chapters.find((c) => c.id === tab.id);
            if (ch && (ch.status === 'outline' || skeletonMode)) return false;
            return true;
        }
        if (tab.type === 'file') {
            const name = tab.filePath || tab.name;
            return /\.(md|txt)$/i.test(name);
        }
        return false;
    }

    function getFileType(): string {
        if (isScratchOpen) return 'Markdown';
        const tab = getActiveTab();
        if (!tab) return '';
        if (tab.type === 'chapter') return 'Markdown';
        if (tab.type === 'file') {
            const name = tab.filePath || tab.name;
            if (/\.md$/i.test(name)) return 'Markdown';
            if (/\.txt$/i.test(name)) return 'Plain Text';
            return 'File';
        }
        return 'Compendium Entry';
    }

    const previewActive =
        isPreviewOpen &&
        !isScratchOpen &&
        getActiveTab()?.type === 'chapter' &&
        isTextFileTab();

    function renderEditor() {
        const activeTab = getActiveTab();
        const showTextFormatting = isTextFileTab();

        const widthCapEnabled =
            settings?.appearance?.editorWidthMode === 'fixed';
        const editorMaxWidth = settings?.appearance?.editorMaxWidth ?? 800;
        const wrapWidth = (el: ReactNode) =>
            widthCapEnabled ? (
                <div
                    className="editor-width-cap"
                    style={{ maxWidth: editorMaxWidth }}
                >
                    {el}
                </div>
            ) : (
                el
            );

        const previewPosition =
            settings?.appearance?.previewPosition ?? 'right';

        const previewHandle = previewActive ? (
            <div
                className={`drag-handle preview-drag-handle ${isPreviewDragging ? 'active' : ''}`}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsPreviewDragging(true);
                    previewDragStartXRef.current = e.clientX;
                    previewDragStartWidthRef.current = previewWidthRef.current;
                    document.body.style.userSelect = 'none';
                    document.body.style.webkitUserSelect = 'none';
                }}
            />
        ) : null;

        const previewPane = previewActive ? (
            <PreviewPane
                chapters={chapters}
                tabContents={tabContents}
                activeChapterId={
                    activeTab?.type === 'chapter' ? activeTab.id : null
                }
                readerMode={readerMode}
                onReaderModeChange={handleReaderModeChange}
                onClose={() => setIsPreviewOpen(false)}
                width={previewWidth}
            />
        ) : null;

        const editorSplit = (content: ReactNode) => {
            if (!previewPane) {
                return <div className="editor-split-main">{content}</div>;
            }
            return (
                <>
                    {previewPosition === 'left' ? (
                        <>
                            {previewPane}
                            {previewHandle}
                        </>
                    ) : (
                        <>
                            {previewHandle}
                            {previewPane}
                        </>
                    )}
                    <div className="editor-split-main">{content}</div>
                </>
            );
        };

        if (isScratchOpen) {
            return wrapWidth(
                <RichTextEditor
                    ref={editorRef}
                    tabId="scratch"
                    initialContent={scratchContent}
                    onChange={(content) => {
                        setScratchContent(content);
                        computeMetrics(content);
                        setSaveState('saving');
                        debouncedScratchSave(content);
                    }}
                    onCursorPosition={(line, col) => {
                        setCursorLine(line);
                        setCursorCol(col);
                    }}
                    showToolbar={showTextFormatting}
                    showBubbleMenu={showTextFormatting}
                    editable={!isReadingMode}
                    onToggleEditable={() => setIsReadingMode((v) => !v)}
                    showPreview={false}
                />
            );
        }

        if (!activeTab) {
            return (
                <div className="empty-editor">
                    <IconFiles size={48} stroke={1.5} />
                    <p>Open a file from the explorer or create a new one</p>
                </div>
            );
        }

        if (activeTab.type === 'plot-architecture' && currentProject) {
            return (
                <PlotArchitectureView
                    projectId={currentProject.id}
                    chapters={chapters}
                    characters={characters}
                    onDataChange={handlePlotDataChange}
                    onNavigateChapter={(chapterId) => {
                        const ch = chapters.find((c) => c.id === chapterId);
                        if (ch) openChapterTab(ch);
                    }}
                />
            );
        }

        if (activeTab.type === 'chapter' || activeTab.type === 'file') {
            const chapter = chapters.find((c) => c.id === activeTab.id);

            if (
                chapter &&
                currentProject &&
                (chapter.status === 'outline' || skeletonMode) &&
                !isTextFileTab()
            ) {
                return (
                    <ChapterOutlineEditor
                        projectId={currentProject.id}
                        chapter={chapter}
                        characters={characters}
                        plotThreads={plotThreads}
                        chapterPlotThreads={chapterPlotThreads.filter(
                            (t) => t.chapterId === chapter.id
                        )}
                        acts={storyActs}
                        scenes={storyScenes.filter(
                            (s) => s.chapterId === chapter.id
                        )}
                        sequences={storySequences.filter(
                            (s) => s.chapterId === chapter.id
                        )}
                        onUpdate={async (field, value) => {
                            if (field === 'plotThreads') {
                                const threads = value as {
                                    chapterId: string;
                                    plotThreadId: string;
                                    intensity: number;
                                }[];
                                await rpc.request[
                                    'db:set-chapter-plot-threads'
                                ]({
                                    chapterId: chapter.id,
                                    threads,
                                });
                                setChapterPlotThreads(
                                    threads.map((t) => ({
                                        chapterId: t.chapterId,
                                        plotThreadId: t.plotThreadId,
                                        intensity: t.intensity,
                                    }))
                                );
                                return;
                            }
                            await rpc.request['db:update-chapter']({
                                id: chapter.id,
                                data: { [field]: value } as any,
                            });
                            const updated = await rpc.request['db:get-chapter'](
                                chapter.id
                            );
                            if (updated) {
                                setChapters((prev) =>
                                    prev.map((c) =>
                                        c.id === chapter.id ? updated : c
                                    )
                                );
                            }
                            if (field === 'status' && value === 'draft') {
                                setTabContents((prev) => ({
                                    ...prev,
                                    [chapter.id]:
                                        chapter.outline ||
                                        prev[chapter.id] ||
                                        '',
                                }));
                            }
                        }}
                        onMoveToDraft={async () => {
                            await rpc.request['db:update-chapter']({
                                id: chapter.id,
                                data: { status: 'draft' } as any,
                            });
                            const updated = await rpc.request['db:get-chapter'](
                                chapter.id
                            );
                            if (updated) {
                                setChapters((prev) =>
                                    prev.map((c) =>
                                        c.id === chapter.id ? updated : c
                                    )
                                );
                                setTabContents((prev) => ({
                                    ...prev,
                                    [chapter.id]:
                                        chapter.outline ||
                                        prev[chapter.id] ||
                                        '',
                                }));
                            }
                        }}
                        onSceneCreate={async (sequenceId) => {
                            const seq = sequenceId
                                ? storySequences.find(
                                      (s) => s.id === sequenceId
                                  )
                                : undefined;
                            const scene = await rpc.request[
                                'db:create-story-scene'
                            ]({
                                id: crypto.randomUUID(),
                                projectId: chapter.projectId,
                                chapterId: seq?.chapterId ?? chapter.id,
                                actId: seq?.actId ?? chapter.actId,
                                sequenceId: seq?.id ?? null,
                                title: 'New Scene',
                                orderIndex: seq
                                    ? storyScenes.filter(
                                          (s) => s.sequenceId === seq.id
                                      ).length
                                    : storyScenes.filter(
                                          (s) =>
                                              s.chapterId === chapter.id &&
                                              !s.sequenceId
                                      ).length,
                            } as any);
                            if (scene)
                                setStoryScenes((prev) => [...prev, scene]);
                        }}
                        onSceneDelete={async (id) => {
                            await rpc.request['db:delete-story-scene'](id);
                            setStoryScenes((prev) =>
                                prev.filter((s) => s.id !== id)
                            );
                        }}
                        onSceneUpdate={async (id, field, value) => {
                            await rpc.request['db:update-story-scene']({
                                id,
                                data: { [field]: value } as any,
                            });
                            const updated =
                                await rpc.request['db:get-story-scene'](id);
                            if (updated)
                                setStoryScenes((prev) =>
                                    prev.map((s) => (s.id === id ? updated : s))
                                );
                        }}
                        onSceneReorder={async (_container, orderedIds) => {
                            await rpc.request['db:reorder-scenes'](
                                orderedIds.map((id, orderIndex) => ({
                                    id,
                                    orderIndex,
                                }))
                            );
                            setStoryScenes((prev) =>
                                prev.map((s) => {
                                    const idx = orderedIds.indexOf(s.id);
                                    return idx >= 0
                                        ? { ...s, orderIndex: idx }
                                        : s;
                                })
                            );
                        }}
                        onSequenceCreate={async () => {
                            const seq = await rpc.request[
                                'db:create-story-sequence'
                            ]({
                                id: crypto.randomUUID(),
                                projectId: chapter.projectId,
                                chapterId: chapter.id,
                                actId: chapter.actId,
                                title: 'New Sequence',
                                summary: null,
                                orderIndex: storySequences.filter(
                                    (s) => s.chapterId === chapter.id
                                ).length,
                                status: 'outline',
                            } as any);
                            if (seq)
                                setStorySequences((prev) => [...prev, seq]);
                        }}
                        onSequenceDelete={async (id) => {
                            await rpc.request['db:delete-story-sequence'](id);
                            setStorySequences((prev) =>
                                prev.filter((s) => s.id !== id)
                            );
                            setStoryScenes((prev) =>
                                prev.filter((s) => s.sequenceId !== id)
                            );
                        }}
                        onSequenceUpdate={async (id, field, value) => {
                            await rpc.request['db:update-story-sequence']({
                                id,
                                data: { [field]: value } as any,
                            });
                            const updated =
                                await rpc.request['db:get-story-sequence'](id);
                            if (updated)
                                setStorySequences((prev) =>
                                    prev.map((s) => (s.id === id ? updated : s))
                                );
                        }}
                        onSequenceReorder={async (orderedIds) => {
                            await rpc.request['db:reorder-sequences'](
                                orderedIds.map((id, orderIndex) => ({
                                    id,
                                    orderIndex,
                                }))
                            );
                            setStorySequences((prev) =>
                                prev.map((s) => {
                                    const idx = orderedIds.indexOf(s.id);
                                    return idx >= 0
                                        ? { ...s, orderIndex: idx }
                                        : s;
                                })
                            );
                        }}
                    />
                );
            }

            const isChapterTab = activeTab.type === 'chapter';
            const editingTitle = chapterTitleEditId === activeTab.id;
            const titleValue = isChapterTab
                ? editingTitle
                    ? chapterTitleDraft
                    : (chapter?.title ?? '')
                : '';

            return editorSplit(
                wrapWidth(
                    <>
                        {isChapterTab && (
                            <div className="chapter-title-row">
                                <input
                                    className="chapter-title-input"
                                    value={titleValue}
                                    placeholder="Chapter title"
                                    onChange={(e) => {
                                        setChapterTitleEditId(activeTab.id);
                                        setChapterTitleDraft(e.target.value);
                                    }}
                                    onFocus={() => {
                                        if (!editingTitle) {
                                            setChapterTitleEditId(activeTab.id);
                                            setChapterTitleDraft(
                                                chapter?.title ?? ''
                                            );
                                        }
                                    }}
                                    onBlur={() =>
                                        handleChapterTitleDraftCommit()
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            (
                                                e.target as HTMLInputElement
                                            ).blur();
                                        } else if (e.key === 'Escape') {
                                            setChapterTitleEditId(null);
                                            setChapterTitleDraft('');
                                        }
                                    }}
                                />
                            </div>
                        )}
                        <RichTextEditor
                            ref={editorRef}
                            tabId={activeTab.id}
                            initialContent={tabContents[activeTab.id] || ''}
                            onChange={(content) => {
                                setTabContents((prev) => ({
                                    ...prev,
                                    [activeTab.id]: content,
                                }));
                                setOpenTabs((prev) =>
                                    prev.map((t) =>
                                        t.id === activeTab.id
                                            ? { ...t, isModified: true }
                                            : t
                                    )
                                );
                                computeMetrics(content);
                                modifiedTabIdsRef.current.add(activeTab.id);
                                setSaveState('saving');
                                debouncedSave(activeTab.id, content);
                            }}
                            onCursorPosition={(line, col) => {
                                setCursorLine(line);
                                setCursorCol(col);
                            }}
                            showToolbar={showTextFormatting}
                            showBubbleMenu={showTextFormatting}
                            editable={!isReadingMode}
                            onToggleEditable={() => setIsReadingMode((v) => !v)}
                            isPreviewOpen={isPreviewOpen}
                            onTogglePreview={() => setIsPreviewOpen((v) => !v)}
                            showPreview={activeTab.type === 'chapter'}
                        />
                    </>
                )
            );
        }

        const entry = compendiumEntries[activeTab.id];
        if (entry) {
            const category = activeTab.type as CompendiumCategory;
            const resolvedFields = resolvedTemplateFields[category];
            const effectiveTemplate =
                resolvedFields.length > 0
                    ? ({
                          ...templates[category],
                          customFields: resolvedFields,
                      } as EntityTemplate)
                    : templates[category];
            return (
                <CompendiumEntryEditor
                    entry={
                        entry as Parameters<
                            typeof CompendiumEntryEditor
                        >[0]['entry']
                    }
                    category={category}
                    template={effectiveTemplate}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    items={items}
                    loreEntries={loreEntries}
                    onUpdate={(field, value) =>
                        handleUpdateCompendiumEntry(
                            activeTab.id,
                            activeTab.type as CompendiumCategory,
                            field,
                            value
                        )
                    }
                    onEditTemplate={() => handleEditTemplate(category)}
                />
            );
        }

        return (
            <div className="empty-editor">
                <IconBook size={48} stroke={1.5} />
                <p>Loading...</p>
            </div>
        );
    }

    const handleDragStart = useCallback(
        (side: 'left' | 'right', clientX: number) => {
            setIsDragging(side);
            dragStartXRef.current = clientX;
            dragStartWidthRef.current =
                side === 'left' ? leftSidebarWidth : rightSidebarWidth;
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        },
        [leftSidebarWidth, rightSidebarWidth]
    );

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - dragStartXRef.current;
            let newWidth: number;

            if (isDragging === 'left') {
                newWidth = Math.max(260, dragStartWidthRef.current + delta);
                const constraints = settings?.appearance?.sidebarConstraints;
                const maxLeft = constraints?.enableCustomWidthCap
                    ? constraints.maxLeftWidth || 400
                    : 400;
                newWidth = Math.min(newWidth, maxLeft);
                leftWidthRef.current = newWidth;
                setLeftSidebarWidth(newWidth);
            } else {
                newWidth = Math.max(400, dragStartWidthRef.current - delta);
                const constraints = settings?.appearance?.sidebarConstraints;
                const maxRight = constraints?.enableCustomWidthCap
                    ? constraints.maxRightWidth || 900
                    : 900;
                newWidth = Math.min(newWidth, maxRight);
                rightWidthRef.current = newWidth;
                setRightSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(null);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            if (settings) {
                const c = settings.appearance.sidebarConstraints ?? {
                    enableCustomWidthCap: false,
                    maxLeftWidth: 400,
                    maxRightWidth: 700,
                    leftWidth: 280,
                    rightWidth: 550,
                };
                updateAppearance('sidebarConstraints', {
                    ...c,
                    leftWidth: leftWidthRef.current,
                    rightWidth: rightWidthRef.current,
                });
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, settings, updateAppearance]);

    useEffect(() => {
        if (!isPreviewDragging) return;

        const previewPosition =
            settings?.appearance?.previewPosition ?? 'right';

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - previewDragStartXRef.current;
            const start = previewDragStartWidthRef.current;
            const w = Math.min(
                720,
                Math.max(
                    280,
                    previewPosition === 'left' ? start + delta : start - delta
                )
            );
            previewWidthRef.current = w;
            setPreviewWidth(w);
        };

        const handleMouseUp = () => {
            setIsPreviewDragging(false);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            updateAppearance('previewWidth', previewWidthRef.current);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isPreviewDragging, settings, updateAppearance]);

    return (
        <>
            <TitleBar
                isCollapsed={isCollapsed}
                isChatCollapsed={isChatCollapsed}
                setIsCollapsed={setIsCollapsed}
                setIsChatCollapsed={setIsChatCollapsed}
                onProjectsClick={() => setActiveDialog('projects')}
                onSettingsClick={() => setActiveDialog('settings')}
                onTitleClick={() => {
                    if (currentProject) {
                        setProjectManagerInitial({ tab: 'general' });
                        setActiveDialog('projectManager');
                    } else {
                        setActiveDialog('projects');
                    }
                }}
                onTimelineClick={() => setShowTimeline(true)}
                projectName={currentProject?.name ?? null}
                extras={
                    currentProject && (
                        <>
                            <button
                                className={`tb-btn ${openTabs.some((t) => t.type === 'plot-architecture') ? 'active' : ''}`}
                                onClick={() => {
                                    const existing = openTabs.find(
                                        (t) => t.type === 'plot-architecture'
                                    );
                                    if (existing) {
                                        if (activeTabId === existing.id) {
                                            const newTabs = openTabs.filter(
                                                (t) => t.id !== existing.id
                                            );
                                            setOpenTabs(newTabs);
                                            setActiveTabId(
                                                newTabs.length > 0
                                                    ? newTabs[0].id
                                                    : null
                                            );
                                        } else {
                                            setActiveTabId(existing.id);
                                        }
                                    } else {
                                        const tab: FileTab = {
                                            id: 'plot-architecture',
                                            name: 'Plot Architecture',
                                            type: 'plot-architecture',
                                            filePath: '',
                                            isModified: false,
                                        };
                                        setOpenTabs((prev) => [...prev, tab]);
                                        setActiveTabId(tab.id);
                                    }
                                }}
                                title="Plot Architecture"
                            >
                                Plot
                            </button>
                            <button
                                className={`tb-btn ${skeletonMode ? 'active' : ''}`}
                                onClick={() => setSkeletonMode(!skeletonMode)}
                                title="Skeleton Mode"
                            >
                                Skeleton
                            </button>
                            <button
                                className={`tb-btn ${showAnalysis ? 'active' : ''}`}
                                onClick={() => setShowAnalysis(!showAnalysis)}
                                title="Story Analysis"
                            >
                                Analyze
                            </button>
                        </>
                    )
                }
            />

            <main className="editor-workspace flex-container">
                <LeftPanel
                    // Layout Props
                    width={
                        isCollapsed && !isLeftHovered ? 24 : leftSidebarWidth
                    }
                    isCollapsed={isCollapsed}
                    isLeftHovered={isLeftHovered}
                    enableAutoExpandLeft={
                        settings?.appearance?.sidebarConstraints
                            ?.enableAutoExpandLeft
                    }
                    onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
                    onAutoExpandToggle={() =>
                        updateAppearance('sidebarConstraints', {
                            ...settings!.appearance.sidebarConstraints,
                            enableAutoExpandLeft:
                                !settings?.appearance?.sidebarConstraints
                                    ?.enableAutoExpandLeft,
                        })
                    }

                    activeTabId={activeTabId}

                    // Mode & Navigation Props
                    mode={mode}
                    explorerTab={explorerTab}
                    onModeChange={(newMode) => {
                        setMode(newMode);
                        // Reset to chapters if switching to manuscript
                        if (newMode === 'manuscript')
                            setExplorerTab('chapters');
                        else setExplorerTab('character');
                    }}
                    onSubTabChange={(tab) => setExplorerTab(tab)}

                    // Data Props
                    chapters={chapters}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    items={items}
                    loreEntries={loreEntries}
                    chaptersLoading={chaptersLoading}

                    // Action Callbacks (Ported from your logic)
                    handleNewChapter={handleNewChapter}
                    handleNewCompendiumEntry={(_cat) =>
                        handleNewCompendiumEntry(
                            explorerTab as CompendiumCategory
                        )
                    }
                    handleEditTemplate={() => handleEditTemplate()}
                    openChapter={(c) => openChapterTab(c)}
                    openCompendiumEntry={(id, cat) =>
                        handleOpenCompendiumEntry(id, cat)
                    }
                    deleteChapter={(c) => {
                        if (confirm(`Delete "${c.title}"?`)) {
                            rpc.request['db:delete-chapter'](c.id).then(() => {
                                loadChapters(currentProject!.id);
                                if (activeTabId === c.id) {
                                    setActiveTabId(null);
                                    setOpenTabs((prev) =>
                                        prev.filter((t) => t.id !== c.id)
                                    );
                                }
                            });
                        }
                    }}
                    renameChapter={renameChapter}
                    deleteCompendiumEntry={(id, _cat) => {
                        handleDeleteCompendiumEntry(
                            id,
                            explorerTab as CompendiumCategory
                        );
                    }}
                    isDragging={isDragging}
                    onDragStart={(dir, x) => handleDragStart(dir, x)}
                    onMouseEnter={() => {
                        if (
                            settings?.appearance?.sidebarConstraints
                                ?.enableAutoExpandLeft
                        ) {
                            console.log('enter');
                            if (hoverTimerRef.current)
                                clearTimeout(hoverTimerRef.current);
                            hoverTimerRef.current = setTimeout(
                                () => setIsLeftHovered(true),
                                200
                            );
                        }
                    }}
                    onMouseLeave={() => {
                        if (hoverTimerRef.current)
                            clearTimeout(hoverTimerRef.current);
                        if (
                            settings?.appearance?.sidebarConstraints
                                ?.enableAutoExpandLeft
                        ) {
                            console.log('leave');
                            hoverTimerRef.current = setTimeout(
                                () => setIsLeftHovered(false),
                                200
                            );
                        }
                    }}
                />
                <div className="app-editor">
                    <FileTabs
                        tabs={openTabs}
                        activeTabId={activeTabId}
                        isScratchOpen={isScratchOpen}
                        onTabClick={(id) => setActiveTabId(id)}
                        onTabClose={(id) => {
                            const tab = openTabs.find((t) => t.id === id);
                            if (
                                tab &&
                                tab.type !== 'chapter' &&
                                tab.type !== 'file' &&
                                tab.type !== 'plot-architecture'
                            ) {
                                handleCloseCompendiumTab(
                                    id,
                                    tab.type as CompendiumCategory
                                );
                            } else {
                                const wasActive = activeTabId === id;
                                const newTabs = openTabs.filter(
                                    (t) => t.id !== id
                                );
                                setOpenTabs(newTabs);
                                setTabContents((prev) => {
                                    const copy = { ...prev };
                                    delete copy[id];
                                    return copy;
                                });
                                if (wasActive) {
                                    setActiveTabId(
                                        newTabs.length > 0
                                            ? newTabs[0].id
                                            : null
                                    );
                                }
                            }
                        }}
                        onScratchClick={() => setIsScratchOpen(!isScratchOpen)}
                        onNewTabClick={() => setActiveDialog('openFileDialog')}
                    />
                    {skeletonMode && (
                        <div className="skeleton-banner">
                            <span>Skeleton Mode</span>
                            <button
                                className="skeleton-banner-close"
                                onClick={() => setSkeletonMode(false)}
                                title="Disable Skeleton Mode"
                            >
                                &times;
                            </button>
                        </div>
                    )}
                    <div
                        className={`editor-container ${previewActive ? 'with-preview' : ''} ${
                            previewActive &&
                            (settings?.appearance?.previewPosition ??
                                'right') === 'left'
                                ? 'preview-left'
                                : ''
                        }`}
                    >
                        {renderEditor()}
                    </div>
                </div>
                <RightPanel>
                    <aside
                        className={`app-panel app-panel-right ${isChatCollapsed ? 'collapsed' : ''}`}
                    >
                        {isChatCollapsed ? (
                            <div
                                className="sidebar-collapsed right"
                                onClick={() => {
                                    setIsChatCollapsed(false);
                                    updateAppearance('sidebarConstraints', {
                                        ...settings!.appearance
                                            .sidebarConstraints,
                                        rightPanelCollapsed: false,
                                    });
                                }}
                            >
                                <IconChevronLeft stroke={2} />
                            </div>
                        ) : (
                            <>
                                <div
                                    className={`drag-handle ${isDragging === 'right' ? 'active' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleDragStart('right', e.clientX);
                                    }}
                                />
                                <ChatPanel
                                    onToggleCollapse={() => {
                                        const newVal = !isChatCollapsed;
                                        setIsChatCollapsed(newVal);
                                        updateAppearance('sidebarConstraints', {
                                            ...settings!.appearance
                                                .sidebarConstraints,
                                            rightPanelCollapsed: newVal,
                                        });
                                    }}
                                    projectId={currentProject?.id ?? null}
                                    project={currentProject}
                                    chapters={chapters}
                                    characters={characters}
                                    locations={locations}
                                    organizations={organizations}
                                    items={items}
                                    loreEntries={loreEntries}
                                    editorRef={editorRef}
                                    onCreateCompendiumEntry={
                                        handleCreateCompendiumEntryFromAI
                                    }
                                    onExtractEntities={handleExtractEntities}
                                    onUpdateCompendium={handleUpdateCompendium}
                                    activeTabId={activeTabId}
                                    activeTabType={getActiveTab()?.type ?? null}
                                    resolvedTemplates={resolvedTemplateFields}
                                    style={{ width: rightSidebarWidth }}
                                />
                            </>
                        )}
                    </aside>
                </RightPanel>
            </main>
            <StatusBar
                saveState={saveState}
                lastSavedTime={lastSavedTime}
                cursorLine={cursorLine}
                cursorCol={cursorCol}
                wordCount={wordCount}
                charCount={charCount}
                fileType={getFileType()}
                projectType={currentProject?.workType ?? null}
                contentRating={currentProject?.contentRating ?? null}
                primaryGenre={currentProject?.primaryGenre ?? null}
                primaryTheme={currentProject?.primaryTheme ?? null}
            />

            {showProjectSelection && (
                <ProjectsDialog
                    open={true}
                    onClose={() => {}}
                    onSelectProject={handleSelectProject}
                    onProjectUpdated={refreshCurrentProject}
                />
            )}
            {activeDialog === 'projects' && (
                <ProjectsDialog
                    open={true}
                    onClose={() => setActiveDialog(null)}
                    onSelectProject={handleSelectProject}
                    onProjectUpdated={refreshCurrentProject}
                />
            )}
            {activeDialog === 'projectManager' && (
                <ProjectManager
                    open={true}
                    onClose={() => setActiveDialog(null)}
                    project={currentProject}
                    onProjectUpdated={refreshCurrentProject}
                    onTemplatesChanged={refreshResolvedTemplates}
                    initialTab={projectManagerInitial.tab}
                    initialCategory={projectManagerInitial.category}
                />
            )}
            {activeDialog === 'settings' && (
                <SettingsDialog
                    open={true}
                    onClose={() => setActiveDialog(null)}
                />
            )}
            {activeDialog === 'ui' && (
                <UIDialog open={true} onClose={() => setActiveDialog(null)} />
            )}
            {activeDialog === 'openFileDialog' && (
                <OpenFileDialog
                    open={true}
                    onClose={() => setActiveDialog(null)}
                    recentFiles={recentFiles}
                    projectPath={currentProject?.path ?? null}
                    onFileSelect={async (
                        absolutePath,
                        _relativePath,
                        fileName
                    ) => {
                        addToRecentFiles(absolutePath, fileName);
                        const newTab: FileTab = {
                            id: `file-${Date.now()}`,
                            name: fileName,
                            type: 'file',
                            filePath: absolutePath,
                            isModified: false,
                        };
                        setOpenTabs((prev) => [...prev, newTab]);
                        setActiveTabId(newTab.id);
                        const content =
                            await rpc.request['file:read-content'](
                                absolutePath
                            );
                        if (content !== undefined && content !== null) {
                            setTabContents((prev) => ({
                                ...prev,
                                [newTab.id]: content,
                            }));
                        }
                    }}
                />
            )}
            {/* Bulk extraction dialog */}
            {extractDialogOpen && (
                <BulkExtractDialog
                    open={extractDialogOpen}
                    onClose={handleBulkExtractResult}
                    parsedEntries={extractedEntries}
                    resolvedTemplates={resolvedTemplateFields}
                    projectId={currentProject?.id || ''}
                />
            )}

            {/* Timeline dialog */}
            {showTimeline && currentProject && (
                <TimelineDialog
                    open={showTimeline}
                    onClose={() => setShowTimeline(false)}
                    projectId={currentProject.id}
                    characters={characters}
                    organizations={organizations}
                    chapters={chapters}
                    onOpenEntity={(id, type) => {
                        handleOpenCompendiumEntry(id, type);
                    }}
                />
            )}

            {/* Story Analysis panel */}
            {showAnalysis && currentProject && (
                <div className="analysis-overlay">
                    <div className="analysis-panel">
                        <div className="analysis-panel-header">
                            <h3>Story Analysis</h3>
                            <button
                                className="icon-btn"
                                onClick={() => setShowAnalysis(false)}
                            >
                                Close
                            </button>
                        </div>
                        <PlotHolePanel
                            context={{
                                chapters,
                                timelineEvents: [],
                                characters,
                                locations,
                                loreEntries,
                                acts: storyActs,
                                sequences: storySequences,
                                plotThreads,
                                storyBeats,
                            }}
                            onNavigateChapter={(chapterId) => {
                                const ch = chapters.find(
                                    (c) => c.id === chapterId
                                );
                                if (ch) openChapterTab(ch);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Single-entry template mapping dialog (for /create commands) */}
            {mappingDialogOpen && pendingCreateEntry && (
                <TemplateFieldMappingDialog
                    open={mappingDialogOpen}
                    onClose={(result) => {
                        setMappingDialogOpen(false);
                        setPendingCreateEntry(null);
                        pendingCreateEntry.resolve(result);
                    }}
                    aiFields={Object.entries(
                        pendingCreateEntry.templateData
                    ).map(([name, value]) => ({ name, value }))}
                    templateFields={pendingCreateEntry.templateFields}
                    category={pendingCreateEntry.category}
                    entryName={pendingCreateEntry.name}
                />
            )}
        </>
    );
}
export default App;
