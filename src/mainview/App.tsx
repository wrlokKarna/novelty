import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {
    IconArrowBarToLeft,
    IconArrowBarToRight,
    IconBook,
    IconBuilding,
    IconChevronLeft,
    IconDotsVertical,
    IconEye,
    IconFiles,
    IconFileText,
    IconLayoutColumns,
    IconLayoutSidebarLeftExpand,
    IconLayoutSidebarRightExpand,
    IconLink,
    IconLinkOff,
    IconMapPin,
    IconNotes,
    IconPlus,
    IconSwords,
    IconTrash,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import type {
    Item,
    Location,
    Project,
    StoryAct,
    StorySequence,
} from '../shared/types';
import type { Chapter, NewChapter } from '../shared/types/project';
import type {
    Character,
    CompendiumCategory,
    LoreEntry,
    Organization,
} from '../shared/types/project/compendium';
import type {
    ChapterPlotThread,
    PlotThread,
    StoryBeat,
    StoryScene,
} from '../shared/types/project/manuscript';
import type {
    EntityTemplate,
    FieldDefinition,
    FileTab,
    PlotArchitectureViewTab,
    TemplateLayout,
} from '../shared/types/project/templates';
import styles from './App.module.css';
import ChapterOutlineEditor from './components/ChapterOutlineEditor';
import ChatPanel from './components/ChatPanel';
import CompendiumEntryEditor from './components/CompendiumEntryEditor';
import PlotArchitectureView from './components/PlotArchitectureView';
import PlotHolePanel from './components/PlotHolePanel';
import PreviewPane from './components/PreviewPane';
import type { RichTextEditorHandle } from './components/RichTextEditor';
import RichTextEditor from './components/RichTextEditor';
import { type ProjectDialogActiveTab } from './constants/layout_tabs';
import { useRPC } from './contexts/RPCContext';
import { useSettings } from './contexts/SettingsContext';
import {
    ProjectManager,
    SettingsDialog,
    UIDialog,
    WorkshopDialog,
} from './dialogs';
import BulkExtractDialog, {
    type BulkExtractResult,
} from './dialogs/BulkExtractDialog';
import OpenFileDialog, { type RecentFile } from './dialogs/OpenFileDialog';
import TemplateFieldMappingDialog, {
    type MappingResult,
} from './dialogs/TemplateFieldMappingDialog';
import TimelineDialog from './dialogs/variants/TimelineDialog';
import type { ParsedEntry } from './services/entryParser';
import type { ExtractionSource } from './services/textExtractor';
import { treeEdgeKey, type TreeEdge } from './templates/tree';
import { DEFAULT_TEMPLATE_COLUMNS } from './types/index';
import { StatusBar } from './ui/statusBar';
import type { SaveState } from './ui/statusBar';
import {
    buildQuickAccessIndex,
    type QuickAccessItem,
} from './ui/window/quickAccessIndex';
import { TitleBar } from './ui/window/TitleBar';
import LeftPanel from './ui/workspaces/editor/LeftPanel';
import RightPanel from './ui/workspaces/editor/RightPanel';

const PLOT_ARCH_TAB_IDS: Record<PlotArchitectureViewTab, string> = {
    acts: 'plot-architecture-acts',
    threads: 'plot-architecture-threads',
    beats: 'plot-architecture-beats',
};

const PLOT_ARCH_TAB_NAMES: Record<PlotArchitectureViewTab, string> = {
    acts: 'Acts',
    threads: 'Plot Threads',
    beats: 'Story Beats',
};

function getPlotArchTabId(view: PlotArchitectureViewTab): string {
    return PLOT_ARCH_TAB_IDS[view];
}

function getPlotArchView(tab: FileTab): PlotArchitectureViewTab {
    if (tab.plotView) return tab.plotView;
    if (tab.id === PLOT_ARCH_TAB_IDS.threads) return 'threads';
    if (tab.id === PLOT_ARCH_TAB_IDS.beats) return 'beats';
    return 'acts';
}

function normalizePlotArchTab(tab: FileTab): FileTab {
    if (tab.type !== 'plot-architecture') return tab;
    const view = getPlotArchView(tab);
    return {
        ...tab,
        id: getPlotArchTabId(view),
        name: PLOT_ARCH_TAB_NAMES[view],
        plotView: view,
    };
}

function EditableChapterPaneTitle({
    chapterId,
    title,
    onCommit,
}: {
    chapterId: string;
    title: string;
    onCommit: (id: string, title: string) => void;
}) {
    const [draft, setDraft] = useState(title);

    useEffect(() => {
        setDraft(title);
    }, [title]);

    return (
        <input
            className={styles.inlineChapterTitleInput}
            style={{
                width: `${Math.min(18, Math.max(5, draft.length + 1))}ch`,
            }}
            value={draft}
            size={Math.max(draft.length, 6)}
            aria-label="Chapter title"
            placeholder="Title"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
                const trimmed = draft.trim();
                if (!trimmed || trimmed === title) {
                    setDraft(title);
                    return;
                }
                onCommit(chapterId, trimmed);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setDraft(title);
                    (e.target as HTMLInputElement).blur();
                }
            }}
        />
    );
}

interface SidebarDragPayload {
    id: string;
    name: string;
    type: 'chapter' | CompendiumCategory;
    category?: CompendiumCategory;
}

function findScrollableDescendant(
    root: HTMLElement | null
): HTMLElement | null {
    if (!root) return null;
    if (root.scrollHeight > root.clientHeight + 2) {
        const style = window.getComputedStyle(root);
        if (
            style.overflowY === 'auto' ||
            style.overflowY === 'scroll' ||
            style.overflowY === 'overlay'
        ) {
            return root;
        }
    }
    const candidates = root.querySelectorAll<HTMLElement>(
        '.ProseMirror, .tiptap, .editor-content, .preview-pane-body, [class*="scroll"], [class*="editor"]'
    );
    for (const el of candidates) {
        if (el.scrollHeight > el.clientHeight + 2) {
            return el;
        }
    }
    const all = root.querySelectorAll<HTMLElement>('*');
    for (const el of all) {
        if (el.scrollHeight > el.clientHeight + 2) {
            const style = window.getComputedStyle(el);
            if (
                style.overflowY === 'auto' ||
                style.overflowY === 'scroll' ||
                style.overflowY === 'overlay'
            ) {
                return el;
            }
        }
    }
    return root.scrollHeight > root.clientHeight + 2 ? root : null;
}

function App() {
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
    const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
    const [isScrollLinked, setIsScrollLinked] = useState(false);
    const [previewTargetChapterId, setPreviewTargetChapterId] = useState<
        string | null
    >(null);

    // Per-chapter preview side map so each chapter remembers its own left/right split independently
    const [chapterPreviewSides, setChapterPreviewSides] = useState<
        Record<string, 'left' | 'right'>
    >({});
    const chapterPreviewSidesRef = useRef<Record<string, 'left' | 'right'>>({});
    chapterPreviewSidesRef.current = chapterPreviewSides;

    const [previewSide, setPreviewSide] = useState<'left' | 'right'>('right');
    const [previewWidth, setPreviewWidth] = useState(
        settings?.appearance?.previewWidth ?? 420
    );
    const previewWidthRef = useRef(previewWidth);

    const [toolbarSplitMenu, setToolbarSplitMenu] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const editorSplitPaneRef = useRef<HTMLDivElement>(null);
    const [inlineToolbarTarget, setInlineToolbarTarget] =
        useState<HTMLDivElement | null>(null);
    const [leftTileToolbarTarget, setLeftTileToolbarTarget] =
        useState<HTMLDivElement | null>(null);
    const [rightTileToolbarTarget, setRightTileToolbarTarget] =
        useState<HTMLDivElement | null>(null);
    const previewPaneContainerRef = useRef<HTMLDivElement>(null);
    const previewBodyScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingScrollRef = useRef<'editor' | 'preview' | null>(null);
    const scrollLockTimerRef = useRef<number | null>(null);

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
    const tabActivationHistoryRef = useRef<string[]>([]);

    useEffect(() => {
        if (!activeTabId) return;
        const hist = tabActivationHistoryRef.current.filter(
            (id) => id !== activeTabId
        );
        hist.push(activeTabId);
        tabActivationHistoryRef.current = hist;
    }, [activeTabId]);

    const openTabIds = useMemo(
        () => new Set(openTabs.map((tab) => tab.id)),
        [openTabs]
    );
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
    const [storyScenes, setStoryScenes] = useState<StorySequence[] & any>([]);
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
    const [resolvedTemplateColumns, setResolvedTemplateColumns] = useState<
        Record<CompendiumCategory, number>
    >({
        character: DEFAULT_TEMPLATE_COLUMNS,
        location: DEFAULT_TEMPLATE_COLUMNS,
        organization: DEFAULT_TEMPLATE_COLUMNS,
        item: DEFAULT_TEMPLATE_COLUMNS,
        lore: DEFAULT_TEMPLATE_COLUMNS,
    });
    const [templateLayouts, setTemplateLayouts] = useState<
        Record<CompendiumCategory, TemplateLayout | null>
    >({
        character: null,
        location: null,
        organization: null,
        item: null,
        lore: null,
    });

    const [extractDialogOpen, setExtractDialogOpen] = useState(false);
    const [extractedEntries, setExtractedEntries] = useState<ParsedEntry[]>([]);

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

    // =========================================================================
    // TEMPORARY PREVIEW TAB (ITALIC SINGLE-CLICK VS PERMANENT DOUBLE-CLICK)
    // =========================================================================
    const [previewTabId, setPreviewTabId] = useState<string | null>(null);
    const lastSidebarClickRef = useRef<{ id: string; time: number }>({
        id: '',
        time: 0,
    });

    const promoteTabToPermanent = useCallback((tabId: string) => {
        setPreviewTabId((prev) => (prev === tabId ? null : prev));
    }, []);

    // =========================================================================
    // UNIVERSAL TILE LINKING (CHAPTERS, CHARACTERS, LOCATIONS, ETC.) & RESIZE
    // =========================================================================
    const [chapterLinks, setChapterLinks] = useState<
        Record<string, string | null>
    >({});
    const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
    const [isCenterHovered, setIsCenterHovered] = useState<boolean>(false);
    const [focusedTileSide, setFocusedTileSide] = useState<'left' | 'right'>(
        'left'
    );
    const [tileMenuState, setTileMenuState] = useState<{
        chapterId: string;
        x: number;
        y: number;
    } | null>(null);

    const [tileSplitRatio, setTileSplitRatio] = useState<number>(50);
    const [isTileResizing, setIsTileResizing] = useState<boolean>(false);
    const workspaceRef = useRef<HTMLDivElement>(null);

    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);

    const getLinkedPartner = useCallback(
        (tabId: string) => {
            const targetId = chapterLinks[tabId];
            if (targetId) {
                const sourceTab = openTabs.find((t) => t.id === tabId);
                const targetTab = openTabs.find((t) => t.id === targetId);
                if (sourceTab && targetTab) {
                    return { source: sourceTab, target: targetTab };
                }
            }
            for (const [k, v] of Object.entries(chapterLinks)) {
                if (v === tabId) {
                    const sourceTab = openTabs.find((t) => t.id === k);
                    const targetTab = openTabs.find((t) => t.id === tabId);
                    if (sourceTab && targetTab) {
                        return { source: sourceTab, target: targetTab };
                    }
                }
            }
            return null;
        },
        [chapterLinks, openTabs]
    );

    const setSideForChapter = useCallback(
        (chapterId: string, side: 'left' | 'right') => {
            setChapterPreviewSides((prev) => {
                const next = { ...prev, [chapterId]: side };
                chapterPreviewSidesRef.current = next;
                return next;
            });
            setPreviewSide(side);
        },
        []
    );

    // Use the specific chapter's saved preview side (defaulting to 'right' if never set)
    const openChapterSplitPreview = useCallback(
        (chapterId: string, modeOverride: 'chapter' | 'book' = 'chapter') => {
            promoteTabToPermanent(chapterId);
            setIsScratchOpen(false);
            setActiveTabId(chapterId);
            setPreviewTargetChapterId(chapterId);
            setReaderMode(modeOverride);

            const targetPreviewSide =
                chapterPreviewSidesRef.current[chapterId] ?? 'right';
            setPreviewSide(targetPreviewSide);
            setIsPreviewOpen(true);
            setIsPreviewFullscreen(false);
            setTileSplitRatio(50);
            setFocusedTileSide(
                targetPreviewSide === 'right' ? 'left' : 'right'
            );
        },
        [promoteTabToPermanent]
    );

    const closeChapterSplitPreview = useCallback(() => {
        setIsPreviewOpen(false);
        setIsPreviewFullscreen(false);
        setPreviewTargetChapterId(null);
    }, []);

    const handleEditorToolbarClickCapture = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const btn = target.closest('button');
            if (!btn) return;

            const hasDotsIcon =
                btn.querySelector('.tabler-icon-dots-vertical') ||
                btn.querySelector('svg.lucide-more-vertical') ||
                btn
                    .getAttribute('aria-label')
                    ?.toLowerCase()
                    .includes('more') ||
                btn.title?.toLowerCase().includes('more') ||
                btn.title?.toLowerCase().includes('options');

            const toolbar = btn.closest(
                '[class*="toolbar"], [role="toolbar"], .ProseMirror-menubar'
            );
            const isLastToolbarBtn =
                toolbar &&
                toolbar.lastElementChild &&
                (toolbar.lastElementChild === btn ||
                    toolbar.lastElementChild.contains(btn));

            if (hasDotsIcon || isLastToolbarBtn) {
                e.preventDefault();
                e.stopPropagation();
                const rect = btn.getBoundingClientRect();
                setToolbarSplitMenu((prev) =>
                    prev
                        ? null
                        : {
                              x: Math.min(rect.left, window.innerWidth - 160),
                              y: rect.bottom + 6,
                          }
                );
            }
        },
        []
    );

    useEffect(() => {
        if (!toolbarSplitMenu) return;
        const closeMenu = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest(`.${styles.tileDropdownMenu}`)) return;
            setToolbarSplitMenu(null);
        };
        window.addEventListener('pointerdown', closeMenu, true);
        return () => window.removeEventListener('pointerdown', closeMenu, true);
    }, [toolbarSplitMenu]);

    // Synchronized scrolling (only active when isScrollLinked is true AND readerMode === 'chapter')
    const handleEditorScrollCapture = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            if (!isScrollLinked || !isPreviewOpen || readerMode !== 'chapter') {
                return;
            }
            if (isSyncingScrollRef.current === 'preview') return;

            const target = e.target as HTMLElement;
            const editorEl =
                target && target.scrollHeight > target.clientHeight + 2
                    ? target
                    : findScrollableDescendant(editorSplitPaneRef.current);
            const previewEl =
                previewBodyScrollRef.current &&
                previewBodyScrollRef.current.scrollHeight >
                    previewBodyScrollRef.current.clientHeight + 2
                    ? previewBodyScrollRef.current
                    : findScrollableDescendant(previewPaneContainerRef.current);

            if (!editorEl || !previewEl) return;

            const maxEditorScroll =
                editorEl.scrollHeight - editorEl.clientHeight;
            const maxPreviewScroll =
                previewEl.scrollHeight - previewEl.clientHeight;
            if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

            isSyncingScrollRef.current = 'editor';
            if (scrollLockTimerRef.current) {
                window.clearTimeout(scrollLockTimerRef.current);
            }
            const ratio = Math.min(
                1,
                Math.max(0, editorEl.scrollTop / maxEditorScroll)
            );
            previewEl.scrollTop = ratio * maxPreviewScroll;
            scrollLockTimerRef.current = window.setTimeout(() => {
                isSyncingScrollRef.current = null;
            }, 40);
        },
        [isScrollLinked, isPreviewOpen, readerMode]
    );

    const handlePreviewScrollCapture = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            if (!isScrollLinked || !isPreviewOpen || readerMode !== 'chapter') {
                return;
            }
            if (isSyncingScrollRef.current === 'editor') return;

            const target = e.target as HTMLElement;
            const previewEl =
                target && target.scrollHeight > target.clientHeight + 2
                    ? target
                    : previewBodyScrollRef.current &&
                        previewBodyScrollRef.current.scrollHeight >
                            previewBodyScrollRef.current.clientHeight + 2
                      ? previewBodyScrollRef.current
                      : findScrollableDescendant(
                            previewPaneContainerRef.current
                        );
            const editorEl = findScrollableDescendant(
                editorSplitPaneRef.current
            );

            if (!editorEl || !previewEl) return;

            const maxEditorScroll =
                editorEl.scrollHeight - editorEl.clientHeight;
            const maxPreviewScroll =
                previewEl.scrollHeight - previewEl.clientHeight;
            if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

            isSyncingScrollRef.current = 'preview';
            if (scrollLockTimerRef.current) {
                window.clearTimeout(scrollLockTimerRef.current);
            }
            const ratio = Math.min(
                1,
                Math.max(0, previewEl.scrollTop / maxPreviewScroll)
            );
            editorEl.scrollTop = ratio * maxEditorScroll;
            scrollLockTimerRef.current = window.setTimeout(() => {
                isSyncingScrollRef.current = null;
            }, 40);
        },
        [isScrollLinked, isPreviewOpen, readerMode]
    );

    // =========================================================================
    // TOP TAB AUTO-SCROLL, MOUSE WHEEL SCROLL & DRAG-AND-DROP (TABS + SIDEBAR)
    // =========================================================================
    const tabsGroupRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const editorAreaRef = useRef<HTMLDivElement>(null);
    const leftPanelContainerRef = useRef<HTMLDivElement>(null);
    const tabDragScrollDirRef = useRef<-1 | 0 | 1>(0);

    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
    const [draggedSidebarItem, setDraggedSidebarItem] =
        useState<SidebarDragPayload | null>(null);
    const [tabDropTarget, setTabDropTarget] = useState<{
        tabId: string;
        mode: 'before' | 'after' | 'merge';
    } | null>(null);
    const [editorDropZone, setEditorDropZone] = useState<
        'left' | 'right' | 'center' | null
    >(null);

    const activeDragId = draggedTabId || draggedSidebarItem?.id || null;

    useEffect(() => {
        if (!activeDragId) {
            tabDragScrollDirRef.current = 0;
            return;
        }
        let animId: number;
        const step = () => {
            const dir = tabDragScrollDirRef.current;
            const container = tabsGroupRef.current;
            if (dir !== 0 && container) {
                container.scrollLeft += dir * 9;
            }
            animId = requestAnimationFrame(step);
        };
        animId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animId);
    }, [activeDragId]);

    useEffect(() => {
        const container = leftPanelContainerRef.current;
        if (!container) return;

        const syncSidebarRows = () => {
            const entries: { id: string; name: string }[] =
                explorerTab === 'chapters'
                    ? chapters.map((c) => ({
                          id: c.id,
                          name: (c.title || '').trim(),
                      }))
                    : (
                          {
                              character: characters,
                              location: locations,
                              organization: organizations,
                              item: items,
                              lore: loreEntries,
                          }[explorerTab] || []
                      ).map((e) => ({
                          id: e.id,
                          name: (e.name || '').trim(),
                      }));

            container
                .querySelectorAll<HTMLElement>('.sidebar-item-preview-italic')
                .forEach((el) => {
                    el.classList.remove('sidebar-item-preview-italic');
                    el.style.fontStyle = '';
                });

            if (entries.length === 0) return;

            const queuesByName = new Map<
                string,
                { id: string; name: string }[]
            >();
            for (const entry of entries) {
                if (!entry.name) continue;
                const q = queuesByName.get(entry.name) || [];
                q.push(entry);
                queuesByName.set(entry.name, q);
            }

            const seenRows = new Set<HTMLElement>();
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT
            );
            let node: Node | null;
            while ((node = walker.nextNode())) {
                const text = node.nodeValue?.trim();
                if (!text) continue;

                const queue = queuesByName.get(text);
                if (!queue || queue.length === 0) continue;

                const textParent = node.parentElement;
                if (!textParent || textParent.closest('input, textarea'))
                    continue;

                const rowEl =
                    (textParent.closest(
                        'li, [role="treeitem"], [role="button"], button, a, [data-item-id]'
                    ) as HTMLElement | null) || textParent;

                if (seenRows.has(rowEl)) continue;
                seenRows.add(rowEl);

                const explicitId = rowEl.getAttribute('data-item-id');
                const matched = explicitId
                    ? entries.find((e) => e.id === explicitId) || queue.shift()!
                    : queue.shift()!;

                if (rowEl.getAttribute('draggable') !== 'true') {
                    rowEl.setAttribute('draggable', 'true');
                }
                rowEl.dataset.sidebarBoundId = matched.id;
                rowEl.dataset.sidebarBoundName = matched.name;

                if (previewTabId === matched.id) {
                    rowEl.classList.add('sidebar-item-preview-italic');
                    rowEl.style.fontStyle = 'italic';
                    textParent.style.fontStyle = 'italic';
                }
            }
        };

        syncSidebarRows();
        const observer = new MutationObserver(() => syncSidebarRows());
        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        return () => observer.disconnect();
    }, [
        chapters,
        characters,
        locations,
        organizations,
        items,
        loreEntries,
        explorerTab,
        previewTabId,
        isCollapsed,
        isLeftHovered,
    ]);

    useEffect(() => {
        const targetId = previewTabId || activeTabId;
        if (!targetId) return;
        const container = leftPanelContainerRef.current;
        if (!container) return;

        const rafId = requestAnimationFrame(() => {
            const targetRow = container.querySelector<HTMLElement>(
                `[data-sidebar-bound-id="${targetId}"], [data-item-id="${targetId}"]`
            );
            if (targetRow) {
                targetRow.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                });
            }
        });
        return () => cancelAnimationFrame(rafId);
    }, [
        chapters.length,
        characters.length,
        locations.length,
        organizations.length,
        items.length,
        loreEntries.length,
        previewTabId,
        activeTabId,
    ]);

    useEffect(() => {
        if (!activeTabId || isScratchOpen) return;
        const rafId = requestAnimationFrame(() => {
            const container = tabsGroupRef.current;
            const activeTabEl = tabRefs.current[activeTabId];
            if (!container || !activeTabEl) return;

            const containerRect = container.getBoundingClientRect();
            const tabRect = activeTabEl.getBoundingClientRect();

            if (tabRect.left < containerRect.left) {
                container.scrollTo({
                    left:
                        container.scrollLeft +
                        (tabRect.left - containerRect.left) -
                        12,
                    behavior: 'smooth',
                });
            } else if (tabRect.right > containerRect.right) {
                container.scrollTo({
                    left:
                        container.scrollLeft +
                        (tabRect.right - containerRect.right) +
                        12,
                    behavior: 'smooth',
                });
            }
        });
        return () => cancelAnimationFrame(rafId);
    }, [activeTabId, isScratchOpen]);

    const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const container = tabsGroupRef.current;
        if (!container) return;
        const delta =
            Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (delta !== 0) {
            container.scrollLeft += delta;
        }
    };

    const ensureSidebarItemOpenedAsTab = async (
        item: SidebarDragPayload,
        insertAt?: { targetTabId: string; mode: 'before' | 'after' }
    ): Promise<string> => {
        const existingTab = openTabs.find((t) => t.id === item.id);

        if (item.type === 'chapter') {
            const c = await rpc.request['db:get-chapter'](item.id);
            if (c?.content) {
                setTabContents((prev) => ({
                    ...prev,
                    [item.id]: c.content!,
                }));
            }
        } else if (item.category) {
            let entry: unknown;
            switch (item.category) {
                case 'character':
                    entry = await rpc.request['db:get-character'](item.id);
                    break;
                case 'location':
                    entry = await rpc.request['db:get-location'](item.id);
                    break;
                case 'organization':
                    entry = await rpc.request['db:get-organization'](item.id);
                    break;
                case 'item':
                    entry = await rpc.request['db:get-item'](item.id);
                    break;
                case 'lore':
                    entry = await rpc.request['db:get-lore-entry'](item.id);
                    break;
            }
            if (entry) {
                setCompendiumEntries((prev) => ({
                    ...prev,
                    [item.id]: entry,
                }));
            }
        }

        const newTab: FileTab = existingTab || {
            id: item.id,
            name: item.name,
            type: item.type,
            filePath: '',
            isModified: false,
            ...(item.category ? { category: item.category } : {}),
        };

        promoteTabToPermanent(item.id);

        setOpenTabs((prev) => {
            const without = prev.filter((t) => t.id !== item.id);
            if (insertAt) {
                const targetIdx = without.findIndex(
                    (t) => t.id === insertAt.targetTabId
                );
                if (targetIdx !== -1) {
                    const idx =
                        insertAt.mode === 'after' ? targetIdx + 1 : targetIdx;
                    const updated = [...without];
                    updated.splice(idx, 0, newTab);
                    return updated;
                }
            }
            return existingTab ? prev : [...prev, newTab];
        });

        return item.id;
    };

    const handleLeftPanelDragStartCapture = (
        e: React.DragEvent<HTMLDivElement>
    ) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const dataEl = target.closest(
            '[data-item-id], [data-sidebar-bound-id]'
        ) as HTMLElement | null;
        if (dataEl) {
            const id =
                dataEl.getAttribute('data-item-id') ||
                dataEl.getAttribute('data-sidebar-bound-id');
            const type = (dataEl.getAttribute('data-item-type') ||
                explorerTab) as 'chapters' | CompendiumCategory;
            const name =
                dataEl.getAttribute('data-item-name') ||
                dataEl.getAttribute('data-sidebar-bound-name') ||
                dataEl.textContent?.trim() ||
                'Untitled';
            if (id) {
                const payload: SidebarDragPayload =
                    type === 'chapters'
                        ? { id, name, type: 'chapter' }
                        : { id, name, type, category: type };
                setDraggedSidebarItem(payload);
                setDraggedTabId(null);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', id);
                e.dataTransfer.setData(
                    'application/x-novel-sidebar',
                    JSON.stringify(payload)
                );
                return;
            }
        }

        const draggableEl = target.closest(
            '[draggable="true"]'
        ) as HTMLElement | null;
        const labelText = (draggableEl || target).textContent?.trim();
        if (!labelText) return;

        if (explorerTab === 'chapters') {
            const ch = chapters.find((c) => c.title.trim() === labelText);
            if (ch) {
                const payload: SidebarDragPayload = {
                    id: ch.id,
                    name: ch.title,
                    type: 'chapter',
                };
                setDraggedSidebarItem(payload);
                setDraggedTabId(null);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', ch.id);
                e.dataTransfer.setData(
                    'application/x-novel-sidebar',
                    JSON.stringify(payload)
                );
            }
        } else {
            const listMap: Record<
                CompendiumCategory,
                { id: string; name: string }[]
            > = {
                character: characters,
                location: locations,
                organization: organizations,
                item: items,
                lore: loreEntries,
            };
            const found = listMap[explorerTab]?.find(
                (entry) => entry.name.trim() === labelText
            );
            if (found) {
                const payload: SidebarDragPayload = {
                    id: found.id,
                    name: found.name,
                    type: explorerTab,
                    category: explorerTab,
                };
                setDraggedSidebarItem(payload);
                setDraggedTabId(null);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', found.id);
                e.dataTransfer.setData(
                    'application/x-novel-sidebar',
                    JSON.stringify(payload)
                );
            }
        }
    };

    const handleLeftPanelDragEndCapture = () => {
        tabDragScrollDirRef.current = 0;
        setDraggedSidebarItem(null);
        setTabDropTarget(null);
        setEditorDropZone(null);
    };

    const handleTabDragStart = (
        tabId: string,
        e: React.DragEvent<HTMLElement>
    ) => {
        setDraggedTabId(tabId);
        setDraggedSidebarItem(null);
        setTileMenuState(null);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tabId);
    };

    const updateTabDragAutoScroll = (clientX: number) => {
        const container = tabsGroupRef.current;
        if (!container) {
            tabDragScrollDirRef.current = 0;
            return;
        }
        const rect = container.getBoundingClientRect();
        const edgeThreshold = 48;
        if (clientX - rect.left < edgeThreshold) {
            tabDragScrollDirRef.current = -1;
        } else if (rect.right - clientX < edgeThreshold) {
            tabDragScrollDirRef.current = 1;
        } else {
            tabDragScrollDirRef.current = 0;
        }
    };

    const handleTabDragOver = (
        targetTab: FileTab,
        e: React.DragEvent<HTMLElement>
    ) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        updateTabDragAutoScroll(e.clientX);

        if (!activeDragId || activeDragId === targetTab.id) {
            if (tabDropTarget) setTabDropTarget(null);
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;

        const canMerge = Boolean(activeDragId);

        let mode: 'before' | 'after' | 'merge';
        if (relX < 0.28) {
            mode = 'before';
        } else if (relX > 0.72) {
            mode = 'after';
        } else {
            mode = canMerge ? 'merge' : relX < 0.5 ? 'before' : 'after';
        }

        setTabDropTarget((prev) =>
            prev?.tabId === targetTab.id && prev?.mode === mode
                ? prev
                : { tabId: targetTab.id, mode }
        );
    };

    const handleTabDrop = async (
        targetTab: FileTab,
        e: React.DragEvent<HTMLElement>
    ) => {
        e.preventDefault();
        e.stopPropagation();

        tabDragScrollDirRef.current = 0;
        const currentMode =
            tabDropTarget?.tabId === targetTab.id
                ? tabDropTarget.mode
                : 'before';
        const sidebarItem = draggedSidebarItem;
        const sourceId =
            sidebarItem?.id ||
            draggedTabId ||
            e.dataTransfer.getData('text/plain');

        setTabDropTarget(null);
        setDraggedTabId(null);
        setDraggedSidebarItem(null);
        setEditorDropZone(null);

        if (!sourceId || sourceId === targetTab.id) return;

        if (sidebarItem) {
            await ensureSidebarItemOpenedAsTab(
                sidebarItem,
                currentMode === 'merge'
                    ? undefined
                    : { targetTabId: targetTab.id, mode: currentMode }
            );
        }

        promoteTabToPermanent(sourceId);
        promoteTabToPermanent(targetTab.id);

        if (currentMode === 'merge') {
            closeChapterSplitPreview();

            const sourceIdx = openTabs.findIndex((t) => t.id === sourceId);
            const targetIdx = openTabs.findIndex((t) => t.id === targetTab.id);
            const isSourceRightOfTarget =
                sourceIdx !== -1 && targetIdx !== -1 && sourceIdx > targetIdx;
            const leftId = isSourceRightOfTarget ? targetTab.id : sourceId;
            const rightId = isSourceRightOfTarget ? sourceId : targetTab.id;

            setChapterLinks((prev) => {
                const cleaned: Record<string, string | null> = {};
                for (const [k, v] of Object.entries(prev)) {
                    if (
                        k !== leftId &&
                        v !== leftId &&
                        k !== rightId &&
                        v !== rightId
                    ) {
                        cleaned[k] = v;
                    }
                }
                cleaned[leftId] = rightId;
                return cleaned;
            });

            setOpenTabs((prev) => {
                const leftTab = prev.find((t) => t.id === leftId);
                const rightTab = prev.find((t) => t.id === rightId);
                if (!leftTab || !rightTab) return prev;
                const withoutSource = prev.filter((t) => t.id !== sourceId);
                const anchorIdx = withoutSource.findIndex(
                    (t) => t.id === targetTab.id
                );
                if (anchorIdx === -1) return prev;
                const next = [...withoutSource];
                const sourceTabObj = prev.find((t) => t.id === sourceId)!;
                if (isSourceRightOfTarget) {
                    next.splice(anchorIdx + 1, 0, sourceTabObj);
                } else {
                    next.splice(anchorIdx, 0, sourceTabObj);
                }
                return next;
            });

            setTileSplitRatio(50);
            setIsScratchOpen(false);
            setActiveTabId(sourceId);
            setFocusedTileSide(sourceId === leftId ? 'left' : 'right');
            return;
        }

        if (sidebarItem) {
            setIsScratchOpen(false);
            setActiveTabId(sourceId);
            return;
        }

        setOpenTabs((prev) => {
            const sourceIndex = prev.findIndex((t) => t.id === sourceId);
            if (sourceIndex === -1) return prev;
            const updated = [...prev];
            const [moved] = updated.splice(sourceIndex, 1);
            const newTargetIndex = updated.findIndex(
                (t) => t.id === targetTab.id
            );
            if (newTargetIndex === -1) return prev;
            const insertIdx =
                currentMode === 'after' ? newTargetIndex + 1 : newTargetIndex;
            updated.splice(insertIdx, 0, moved);
            return updated;
        });
    };

    const handleTabsContainerDragOver = (
        e: React.DragEvent<HTMLDivElement>
    ) => {
        if (!activeDragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        updateTabDragAutoScroll(e.clientX);

        const lastTab = openTabs[openTabs.length - 1];
        if (
            lastTab &&
            lastTab.id !== activeDragId &&
            e.target === tabsGroupRef.current
        ) {
            setTabDropTarget((prev) =>
                prev?.tabId === lastTab.id && prev?.mode === 'after'
                    ? prev
                    : { tabId: lastTab.id, mode: 'after' }
            );
        }
    };

    const handleTabsContainerDragLeave = (
        e: React.DragEvent<HTMLDivElement>
    ) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            tabDragScrollDirRef.current = 0;
            setTabDropTarget(null);
        }
    };

    const handleTabsContainerDrop = async (
        e: React.DragEvent<HTMLDivElement>
    ) => {
        tabDragScrollDirRef.current = 0;
        const sidebarItem = draggedSidebarItem;
        const sourceTabId =
            draggedTabId || e.dataTransfer.getData('text/plain');

        setDraggedSidebarItem(null);
        setDraggedTabId(null);
        setTabDropTarget(null);
        setEditorDropZone(null);

        if (sidebarItem) {
            e.preventDefault();
            e.stopPropagation();
            const openedId = await ensureSidebarItemOpenedAsTab(sidebarItem);
            setIsScratchOpen(false);
            setActiveTabId(openedId);
            return;
        }

        if (sourceTabId) {
            e.preventDefault();
            e.stopPropagation();
            setOpenTabs((prev) => {
                const sourceIndex = prev.findIndex((t) => t.id === sourceTabId);
                if (sourceIndex === -1 || sourceIndex === prev.length - 1) {
                    return prev;
                }
                const updated = [...prev];
                const [moved] = updated.splice(sourceIndex, 1);
                updated.push(moved);
                return updated;
            });
        }
    };

    const handleTabDragEnd = () => {
        tabDragScrollDirRef.current = 0;
        setDraggedTabId(null);
        setDraggedSidebarItem(null);
        setTabDropTarget(null);
        setEditorDropZone(null);
    };

    const handleEditorDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!activeDragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tabDragScrollDirRef.current = 0;

        const currentTab = getActiveTab();
        const isCurrentSingleTab =
            !isScratchOpen &&
            currentTab &&
            currentTab.id === activeDragId &&
            !getLinkedPartner(currentTab.id);

        if (isCurrentSingleTab) {
            setEditorDropZone('center');
            return;
        }

        const container = editorAreaRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width;
        if (relX < 0.3) {
            setEditorDropZone('left');
        } else if (relX > 0.7) {
            setEditorDropZone('right');
        } else {
            setEditorDropZone('center');
        }
    };

    const handleEditorDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setEditorDropZone(null);
        }
    };

    const handleEditorDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        if (!activeDragId) return;
        e.preventDefault();
        e.stopPropagation();

        tabDragScrollDirRef.current = 0;
        const sidebarItem = draggedSidebarItem;
        const sourceId = activeDragId;
        const zone = editorDropZone || 'center';

        const currentTab = getActiveTab();
        const isCurrentSingleTab =
            !isScratchOpen &&
            currentTab &&
            currentTab.id === sourceId &&
            !getLinkedPartner(currentTab.id);

        setDraggedTabId(null);
        setDraggedSidebarItem(null);
        setTabDropTarget(null);
        setEditorDropZone(null);

        if (sidebarItem) {
            await ensureSidebarItemOpenedAsTab(sidebarItem);
        }
        promoteTabToPermanent(sourceId);

        if (isCurrentSingleTab && zone === 'center') {
            handleStartLinking(sourceId);
            return;
        }

        const existingPair = currentTab
            ? getLinkedPartner(currentTab.id)
            : null;

        if (existingPair && (zone === 'left' || zone === 'right')) {
            closeChapterSplitPreview();
            const keptId =
                zone === 'left'
                    ? existingPair.target.id
                    : existingPair.source.id;

            if (sourceId === keptId) {
                setIsScratchOpen(false);
                setActiveTabId(sourceId);
                return;
            }

            setChapterLinks((prev) => {
                const cleaned: Record<string, string | null> = {};
                for (const [k, v] of Object.entries(prev)) {
                    if (
                        k !== sourceId &&
                        v !== sourceId &&
                        k !== keptId &&
                        v !== keptId &&
                        k !== existingPair.source.id &&
                        v !== existingPair.source.id &&
                        k !== existingPair.target.id &&
                        v !== existingPair.target.id
                    ) {
                        cleaned[k] = v;
                    }
                }
                if (zone === 'left') {
                    cleaned[sourceId] = keptId;
                } else {
                    cleaned[keptId] = sourceId;
                }
                return cleaned;
            });

            setIsScratchOpen(false);
            setActiveTabId(sourceId);
            setFocusedTileSide(zone);
            return;
        }

        if (zone === 'center') {
            handleUnlinkChapter(sourceId);
            setIsScratchOpen(false);
            setActiveTabId(sourceId);
            return;
        }

        const currentAnchorId =
            activeTabId && activeTabId !== sourceId
                ? activeTabId
                : openTabs.find((t) => t.id !== sourceId)?.id;

        if (!currentAnchorId) {
            setIsScratchOpen(false);
            setActiveTabId(sourceId);
            return;
        }

        closeChapterSplitPreview();
        const leftId = zone === 'left' ? sourceId : currentAnchorId;
        const rightId = zone === 'left' ? currentAnchorId : sourceId;

        setChapterLinks((prev) => {
            const cleaned: Record<string, string | null> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (
                    k !== leftId &&
                    v !== leftId &&
                    k !== rightId &&
                    v !== rightId
                ) {
                    cleaned[k] = v;
                }
            }
            cleaned[leftId] = rightId;
            return cleaned;
        });

        setOpenTabs((prev) => {
            const withoutSource = prev.filter((t) => t.id !== sourceId);
            const anchorIdx = withoutSource.findIndex(
                (t) => t.id === currentAnchorId
            );
            const sourceTabObj = prev.find((t) => t.id === sourceId);
            if (anchorIdx === -1 || !sourceTabObj) return prev;
            const next = [...withoutSource];
            next.splice(
                zone === 'left' ? anchorIdx : anchorIdx + 1,
                0,
                sourceTabObj
            );
            return next;
        });

        setTileSplitRatio(50);
        setIsScratchOpen(false);
        setActiveTabId(sourceId);
        setFocusedTileSide(zone === 'left' ? 'left' : 'right');
    };

    const renderTabIcon = (tab: FileTab) => {
        const isTabInPreview =
            isPreviewOpen &&
            !isScratchOpen &&
            tab.type === 'chapter' &&
            previewTargetChapterId === tab.id;

        if (isTabInPreview) {
            return <IconEye size={14} className={styles.tabIcon} />;
        }

        switch (tab.type) {
            case 'character':
                return <IconUser size={14} className={styles.tabIcon} />;
            case 'location':
                return <IconMapPin size={14} className={styles.tabIcon} />;
            case 'organization':
                return <IconBuilding size={14} className={styles.tabIcon} />;
            case 'item':
                return <IconSwords size={14} className={styles.tabIcon} />;
            case 'lore':
                return <IconBook size={14} className={styles.tabIcon} />;
            case 'plot-architecture':
                return (
                    <IconLayoutColumns size={14} className={styles.tabIcon} />
                );
            default:
                return <IconFileText size={14} className={styles.tabIcon} />;
        }
    };

    useEffect(() => {
        if (!isTileResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = workspaceRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
            const clampedPercent = Math.min(60, Math.max(40, rawPercent));
            setTileSplitRatio(clampedPercent);
        };

        const handleMouseUp = () => {
            setIsTileResizing(false);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.cursor = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isTileResizing]);

    useEffect(() => {
        if (!tileMenuState) return;
        const handlePointerDownOutside = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest(`.${styles.tileDropdownMenu}`)) {
                return;
            }
            setTileMenuState(null);
        };
        window.addEventListener('pointerdown', handlePointerDownOutside, true);
        return () =>
            window.removeEventListener(
                'pointerdown',
                handlePointerDownOutside,
                true
            );
    }, [tileMenuState]);

    useEffect(() => {
        if (!linkingSourceId) return;
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('.app-panel-left') || target.closest('aside')) {
                return;
            }
            setLinkingSourceId(null);
        };
        const timer = setTimeout(() => {
            window.addEventListener('click', handleGlobalClick);
        }, 0);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [linkingSourceId]);

    const handleStartLinking = (itemId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setLinkingSourceId(itemId);
        setTileMenuState(null);
    };

    const handleCompleteLink = (targetId: string) => {
        if (!linkingSourceId || linkingSourceId === targetId) {
            setLinkingSourceId(null);
            return;
        }
        const sourceId = linkingSourceId;
        closeChapterSplitPreview();

        setChapterLinks((prev) => {
            const cleaned: Record<string, string | null> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (
                    k !== sourceId &&
                    v !== sourceId &&
                    k !== targetId &&
                    v !== targetId
                ) {
                    cleaned[k] = v;
                }
            }
            cleaned[sourceId] = targetId;
            return cleaned;
        });

        setOpenTabs((prev) => {
            const withoutTarget = prev.filter((t) => t.id !== targetId);
            const sourceIdx = withoutTarget.findIndex((t) => t.id === sourceId);
            const targetTabObj = prev.find((t) => t.id === targetId);
            if (sourceIdx === -1 || !targetTabObj) return prev;
            const next = [...withoutTarget];
            next.splice(sourceIdx + 1, 0, targetTabObj);
            return next;
        });

        promoteTabToPermanent(sourceId);
        promoteTabToPermanent(targetId);
        setTileSplitRatio(50);
        setIsScratchOpen(false);
        setActiveTabId(sourceId);
        setFocusedTileSide('left');
        setTileMenuState(null);
        setLinkingSourceId(null);
    };

    const handleUnlinkChapter = (itemId: string) => {
        setChapterLinks((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(next)) {
                if (k === itemId || v === itemId) {
                    delete next[k];
                }
            }
            return next;
        });
        setTileMenuState(null);
    };

    // =========================================================================
    // CLOSE TAB, CLOSE RIGHT TABS, CLOSE LEFT TABS, CLOSE ALL TABS HANDLERS
    // =========================================================================
    const getNextActiveTabIdAfterClosing = (
        currentTabs: FileTab[],
        closeSet: Set<string>,
        currentActiveId: string | null
    ): string | null => {
        tabActivationHistoryRef.current =
            tabActivationHistoryRef.current.filter((id) => !closeSet.has(id));

        if (!currentActiveId || !closeSet.has(currentActiveId)) {
            return currentActiveId;
        }

        const remainingIds = new Set(
            currentTabs.filter((t) => !closeSet.has(t.id)).map((t) => t.id)
        );

        for (let i = tabActivationHistoryRef.current.length - 1; i >= 0; i--) {
            const candidateId = tabActivationHistoryRef.current[i];
            if (remainingIds.has(candidateId)) {
                return candidateId;
            }
        }

        const closedIdx = currentTabs.findIndex(
            (t) => t.id === currentActiveId
        );
        if (closedIdx > 0) {
            for (let i = closedIdx - 1; i >= 0; i--) {
                if (!closeSet.has(currentTabs[i].id)) {
                    return currentTabs[i].id;
                }
            }
        }

        const remaining = currentTabs.filter((t) => !closeSet.has(t.id));
        return remaining.length > 0 ? remaining[0].id : null;
    };

    const closeMultipleTabs = (idsToClose: string[]) => {
        if (idsToClose.length === 0) {
            setTileMenuState(null);
            return;
        }
        const closeSet = new Set(idsToClose);

        if (previewTargetChapterId && closeSet.has(previewTargetChapterId)) {
            closeChapterSplitPreview();
        }

        setChapterLinks((prev) => {
            const next: Record<string, string | null> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (!closeSet.has(k) && (!v || !closeSet.has(v))) {
                    next[k] = v;
                }
            }
            return next;
        });

        setPreviewTabId((prev) => (prev && closeSet.has(prev) ? null : prev));

        idsToClose.forEach((id) => {
            delete tabRefs.current[id];
        });

        setTabContents((prev) => {
            const copy = { ...prev };
            idsToClose.forEach((id) => {
                delete copy[id];
            });
            return copy;
        });

        setCompendiumEntries((prev) => {
            const copy = { ...prev };
            idsToClose.forEach((id) => {
                delete copy[id];
            });
            return copy;
        });

        setOpenTabs((prevTabs) => {
            const updatedTabs = prevTabs.filter((t) => !closeSet.has(t.id));
            setActiveTabId((prevActiveId) =>
                getNextActiveTabIdAfterClosing(prevTabs, closeSet, prevActiveId)
            );
            return updatedTabs.length === prevTabs.length
                ? prevTabs
                : updatedTabs;
        });

        setTileMenuState(null);
    };

    const handleCloseRightTabs = (targetTabId: string) => {
        const idx = openTabs.findIndex((t) => t.id === targetTabId);
        if (idx === -1) return;
        const rightIds = openTabs.slice(idx + 1).map((t) => t.id);
        closeMultipleTabs(rightIds);
    };

    const handleCloseLeftTabs = (targetTabId: string) => {
        const idx = openTabs.findIndex((t) => t.id === targetTabId);
        if (idx === -1) return;
        const leftIds = openTabs.slice(0, idx).map((t) => t.id);
        closeMultipleTabs(leftIds);
    };

    const handleCloseAllTabs = () => {
        const allIds = openTabs.map((t) => t.id);
        closeMultipleTabs(allIds);
    };

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

    const RECENT_FILES_KEY = 'recentlyOpenedFiles';
    const MAX_RECENT_FILES = 6;

    function getTabsStorageKey(projectId: string) {
        return `project-tabs-${projectId}`;
    }

    function loadProjectTabs(projectId: string) {
        try {
            const stored = localStorage.getItem(getTabsStorageKey(projectId));
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed?.tabs)) {
                    const idRemap = new Map<string, string>();
                    parsed.tabs = parsed.tabs.map((tab: FileTab) => {
                        const normalized = normalizePlotArchTab(tab);
                        if (normalized.id !== tab.id) {
                            idRemap.set(tab.id, normalized.id);
                        }
                        return normalized;
                    });
                    const remapId = (id: string) => idRemap.get(id) ?? id;
                    if (parsed.activeTabId) {
                        parsed.activeTabId = remapId(parsed.activeTabId);
                    }
                    if (parsed.chapterLinks) {
                        const links: Record<string, string | null> = {};
                        for (const [key, value] of Object.entries(
                            parsed.chapterLinks as Record<string, string | null>
                        )) {
                            links[remapId(key)] = value
                                ? remapId(value)
                                : value;
                        }
                        parsed.chapterLinks = links;
                    }
                    if (parsed.chapterPreviewSides) {
                        const sides: Record<string, 'left' | 'right'> = {};
                        for (const [key, value] of Object.entries(
                            parsed.chapterPreviewSides as Record<
                                string,
                                'left' | 'right'
                            >
                        )) {
                            if (value === 'left' || value === 'right') {
                                sides[remapId(key)] = value;
                            }
                        }
                        parsed.chapterPreviewSides = sides;
                    }
                }
                return parsed;
            }
        } catch (e) {
            console.error('Failed to load project tabs:', e);
        }
        return null;
    }

    function saveProjectTabs(
        projectId: string,
        tabs: FileTab[],
        activeTabId: string | null,
        links: Record<string, string | null> = {},
        splitRatio: number = 50,
        previewState: {
            isPreviewOpen: boolean;
            previewTargetChapterId: string | null;
            readerMode: 'chapter' | 'book';
            chapterPreviewSides: Record<string, 'left' | 'right'>;
            isScrollLinked: boolean;
        } = {
            isPreviewOpen: false,
            previewTargetChapterId: null,
            readerMode: 'chapter',
            chapterPreviewSides: {},
            isScrollLinked: false,
        }
    ) {
        try {
            localStorage.setItem(
                getTabsStorageKey(projectId),
                JSON.stringify({
                    tabs,
                    activeTabId,
                    chapterLinks: links,
                    tileSplitRatio: splitRatio,
                    ...previewState,
                })
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
            saveProjectTabs(
                currentProject.id,
                openTabs,
                activeTabId,
                chapterLinks,
                tileSplitRatio,
                {
                    isPreviewOpen,
                    previewTargetChapterId,
                    readerMode,
                    chapterPreviewSides,
                    isScrollLinked,
                }
            );
        }
    }, [
        currentProject?.id,
        openTabs,
        activeTabId,
        chapterLinks,
        tileSplitRatio,
        isPreviewOpen,
        previewTargetChapterId,
        readerMode,
        chapterPreviewSides,
        isScrollLinked,
    ]);

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
                    const restoredTabs: FileTab[] = savedState.tabs || [];
                    const restoredActiveId: string | null =
                        savedState.activeTabId || null;
                    const restoredSides: Record<string, 'left' | 'right'> =
                        savedState.chapterPreviewSides || {};
                    setOpenTabs(restoredTabs);
                    setActiveTabId(restoredActiveId);
                    setChapterLinks(savedState.chapterLinks || {});
                    setChapterPreviewSides(restoredSides);
                    chapterPreviewSidesRef.current = restoredSides;
                    setTileSplitRatio(savedState.tileSplitRatio ?? 50);

                    if (savedState.isPreviewOpen) {
                        const targetPreviewId =
                            savedState.previewTargetChapterId ||
                            restoredActiveId;
                        const hasValidChapter = restoredTabs.some(
                            (t) =>
                                t.id === targetPreviewId && t.type === 'chapter'
                        );
                        if (hasValidChapter && targetPreviewId) {
                            setPreviewTargetChapterId(targetPreviewId);
                            setIsPreviewOpen(true);
                            setReaderMode(
                                savedState.readerMode === 'book'
                                    ? 'book'
                                    : 'chapter'
                            );
                            setPreviewSide(
                                restoredSides[targetPreviewId] ?? 'right'
                            );
                            setIsScrollLinked(
                                Boolean(savedState.isScrollLinked)
                            );
                        }
                    }

                    await restoreTabContents(restoredTabs);
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
            const restoredTabs: FileTab[] = savedState?.tabs || [];
            const restoredActiveId: string | null =
                savedState?.activeTabId || null;
            const restoredSides: Record<string, 'left' | 'right'> =
                savedState?.chapterPreviewSides || {};

            tabActivationHistoryRef.current = [];
            setCurrentProject(project);
            setOpenTabs(restoredTabs);
            setActiveTabId(restoredActiveId);
            setChapterLinks(savedState?.chapterLinks || {});
            setChapterPreviewSides(restoredSides);
            chapterPreviewSidesRef.current = restoredSides;
            setTileSplitRatio(savedState?.tileSplitRatio ?? 50);
            setPreviewTabId(null);
            setTabContents({});
            setCompendiumEntries({});
            setIsScratchOpen(false);
            setScratchContent('');
            setIsReadingMode(false);
            setIsPreviewFullscreen(false);
            setShowProjectSelection(false);

            const targetPreviewId =
                savedState?.previewTargetChapterId || restoredActiveId;
            const hasValidChapter =
                Boolean(savedState?.isPreviewOpen) &&
                restoredTabs.some(
                    (t) => t.id === targetPreviewId && t.type === 'chapter'
                );

            if (hasValidChapter && targetPreviewId) {
                setPreviewTargetChapterId(targetPreviewId);
                setIsPreviewOpen(true);
                setReaderMode(
                    savedState?.readerMode === 'book' ? 'book' : 'chapter'
                );
                setPreviewSide(restoredSides[targetPreviewId] ?? 'right');
                setIsScrollLinked(Boolean(savedState?.isScrollLinked));
            } else {
                setReaderMode('chapter');
                setIsPreviewOpen(false);
                setPreviewTargetChapterId(null);
                setPreviewSide('right');
                setIsScrollLinked(false);
            }

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
        setResolvedTemplateColumns((prev) => ({
            ...prev,
            [category]: resolved?.columns ?? DEFAULT_TEMPLATE_COLUMNS,
        }));
        setTemplateLayouts((prev) => ({
            ...prev,
            [category]: resolved?.layout ?? null,
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
            if (scrollLockTimerRef.current)
                window.clearTimeout(scrollLockTimerRef.current);
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

        let maxChapterNum = 0;
        let maxOrderIndex = -1;
        for (const ch of chapterList) {
            if (
                typeof ch.orderIndex === 'number' &&
                ch.orderIndex > maxOrderIndex
            ) {
                maxOrderIndex = ch.orderIndex;
            }
            const match = ch.title?.trim().match(/^Chapter\s+(\d+)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxChapterNum) {
                    maxChapterNum = num;
                }
            }
        }
        const nextChapterNum = Math.max(maxChapterNum, chapterList.length) + 1;
        const nextOrderIndex = Math.max(maxOrderIndex + 1, chapterList.length);

        const newChapter: NewChapter = {
            id: crypto.randomUUID(),
            projectId: currentProject.id,
            title: `Chapter ${nextChapterNum}`,
            content: null,
            filePath: null,
            orderIndex: nextOrderIndex,
            status: 'outline',
            outline: null,
            povCharacterId: null,
            wordCountTarget: null,
            actId: null,
            sequenceId: null,
        };
        await rpc.request['db:create-chapter'](newChapter);

        const tab: FileTab = {
            id: newChapter.id,
            name: newChapter.title,
            type: 'chapter' as const,
            filePath: newChapter.filePath || '',
            isModified: false,
        };
        if (currentProject.id) {
            const result = await rpc.request['db:get-chapters'](
                currentProject.id
            );
            setChapters(result);
        }
        setOpenTabs((prev) => [...prev, tab]);
        setIsScratchOpen(false);
        setActiveTabId(newChapter.id);
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
    }

    async function renameExplorerEntry(
        id: string,
        title: string,
        category: CompendiumCategory | 'chapters'
    ) {
        if (category === 'chapters') {
            await renameChapter(id, title);
            return;
        }
        await handleUpdateCompendiumEntry(id, category, 'name', title);
    }

    async function openChapterTab(chapter: Chapter) {
        const now = Date.now();
        const isRapidDoubleClick =
            lastSidebarClickRef.current.id === chapter.id &&
            now - lastSidebarClickRef.current.time < 420;
        lastSidebarClickRef.current = { id: chapter.id, time: now };

        const c = await rpc.request['db:get-chapter'](chapter.id);
        if (c?.content) {
            setTabContents((prev) => ({
                ...prev,
                [chapter.id]: c.content!,
            }));
        }

        if (currentProject) {
            await loadPlotArchitecture(currentProject.id);
        }
        try {
            const savedThreads = await rpc.request[
                'db:get-chapter-plot-threads'
            ](chapter.id);
            if (savedThreads) {
                setChapterPlotThreads((prev) => [
                    ...prev.filter((t) => t.chapterId !== chapter.id),
                    ...savedThreads,
                ]);
            }
        } catch (e) {
            console.error('Failed to load chapter plot threads:', e);
        }

        const existingTab = openTabs.find((t) => t.id === chapter.id);
        if (existingTab) {
            if (isRapidDoubleClick) {
                promoteTabToPermanent(chapter.id);
            }
        } else {
            const newTab: FileTab = {
                id: chapter.id,
                name: chapter.title,
                type: 'chapter' as const,
                filePath: chapter.filePath || '',
                isModified: false,
            };

            if (isRapidDoubleClick || linkingSourceId) {
                setOpenTabs((prev) => [...prev, newTab]);
                setPreviewTabId(null);
            } else {
                const replacedPreviewId = previewTabId;
                setOpenTabs((prev) => {
                    if (replacedPreviewId) {
                        const previewIdx = prev.findIndex(
                            (t) => t.id === replacedPreviewId
                        );
                        if (previewIdx !== -1) {
                            const updated = [...prev];
                            updated[previewIdx] = newTab;
                            return updated;
                        }
                    }
                    return [...prev, newTab];
                });
                if (replacedPreviewId) {
                    tabActivationHistoryRef.current =
                        tabActivationHistoryRef.current.filter(
                            (id) => id !== replacedPreviewId
                        );
                }
                setPreviewTabId(chapter.id);
            }
        }

        if (linkingSourceId) {
            handleCompleteLink(chapter.id);
            return;
        }

        setIsScratchOpen(false);
        setActiveTabId(chapter.id);

        if (isPreviewOpen) {
            openChapterSplitPreview(chapter.id);
        } else if (isRapidDoubleClick) {
            openChapterSplitPreview(chapter.id, 'chapter');
        }
    }

    function openPlotArchitectureTab(view: PlotArchitectureViewTab = 'acts') {
        const id = getPlotArchTabId(view);
        const existing = openTabs.find((t) => t.id === id);
        if (existing) {
            setIsScratchOpen(false);
            setActiveTabId(existing.id);
            return;
        }
        const tab: FileTab = {
            id,
            name: PLOT_ARCH_TAB_NAMES[view],
            type: 'plot-architecture',
            filePath: '',
            isModified: false,
            plotView: view,
        };
        setOpenTabs((prev) => [...prev, tab]);
        setIsScratchOpen(false);
        setActiveTabId(tab.id);
    }

    function togglePlotArchitectureTab(view: PlotArchitectureViewTab) {
        const id = getPlotArchTabId(view);
        const existing = openTabs.find((t) => t.id === id);
        if (!existing) {
            openPlotArchitectureTab(view);
            return;
        }
        if (activeTabId === id) {
            handleCloseTab(id);
            return;
        }
        setIsScratchOpen(false);
        setActiveTabId(id);
    }

    useEffect(() => {
        if (!currentProject || !activeTabId) return;
        const activeTab = openTabs.find((t) => t.id === activeTabId);
        if (activeTab?.type === 'chapter') {
            loadPlotArchitecture(currentProject.id);
            rpc.request['db:get-chapter-plot-threads'](activeTab.id)
                .then((savedThreads) => {
                    if (savedThreads) {
                        setChapterPlotThreads((prev) => [
                            ...prev.filter((t) => t.chapterId !== activeTab.id),
                            ...savedThreads,
                        ]);
                    }
                })
                .catch((e) =>
                    console.error('Failed to load chapter plot threads:', e)
                );
        }
    }, [activeTabId, currentProject?.id, openTabs.length]);

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
            setIsScratchOpen(false);
            setActiveTabId(id);
        }
    }

    async function handleOpenCompendiumEntry(
        entryId: string,
        category: CompendiumCategory
    ) {
        const now = Date.now();
        const isRapidDoubleClick =
            lastSidebarClickRef.current.id === entryId &&
            now - lastSidebarClickRef.current.time < 420;
        lastSidebarClickRef.current = { id: entryId, time: now };

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
                if (existingTab) {
                    if (isRapidDoubleClick) {
                        promoteTabToPermanent(entryId);
                    }
                } else {
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

                    if (isRapidDoubleClick || linkingSourceId) {
                        setOpenTabs((prev) => [...prev, newTab]);
                        setPreviewTabId(null);
                    } else {
                        const replacedPreviewId = previewTabId;
                        setOpenTabs((prev) => {
                            if (replacedPreviewId) {
                                const previewIdx = prev.findIndex(
                                    (t) => t.id === replacedPreviewId
                                );
                                if (previewIdx !== -1) {
                                    const updated = [...prev];
                                    updated[previewIdx] = newTab;
                                    return updated;
                                }
                            }
                            return [...prev, newTab];
                        });
                        if (replacedPreviewId) {
                            tabActivationHistoryRef.current =
                                tabActivationHistoryRef.current.filter(
                                    (id) => id !== replacedPreviewId
                                );
                        }
                        setPreviewTabId(entryId);
                    }
                }

                if (linkingSourceId) {
                    handleCompleteLink(entryId);
                    return;
                }

                setIsScratchOpen(false);
                setActiveTabId(entryId);
            }
        } catch (e) {
            console.error('Failed to open entry:', e);
        }
    }

    const quickAccessItems = useMemo(
        () =>
            buildQuickAccessIndex({
                chapters,
                characters,
                locations,
                organizations,
                items,
                loreEntries,
                plotThreads,
                storyActs,
                storySequences,
                storyScenes,
                storyBeats,
                openTabs,
                scratchContent,
            }),
        [
            chapters,
            characters,
            locations,
            organizations,
            items,
            loreEntries,
            plotThreads,
            storyActs,
            storySequences,
            storyScenes,
            storyBeats,
            openTabs,
            scratchContent,
        ]
    );

    async function handleQuickAccessSelect(item: QuickAccessItem) {
        switch (item.kind) {
            case 'chapter': {
                const chapter = chapters.find((c) => c.id === item.id);
                if (chapter) await openChapterTab(chapter);
                break;
            }
            case 'character':
            case 'location':
            case 'organization':
            case 'item':
            case 'lore': {
                if (item.category) {
                    await handleOpenCompendiumEntry(item.id, item.category);
                }
                break;
            }
            case 'act':
            case 'sequence':
            case 'scene': {
                const chapter = item.chapterId
                    ? chapters.find((c) => c.id === item.chapterId)
                    : undefined;
                if (chapter) await openChapterTab(chapter);
                else openPlotArchitectureTab('acts');
                break;
            }
            case 'beat': {
                const chapter = item.chapterId
                    ? chapters.find((c) => c.id === item.chapterId)
                    : undefined;
                if (chapter) await openChapterTab(chapter);
                else openPlotArchitectureTab('beats');
                break;
            }
            case 'thread': {
                openPlotArchitectureTab('threads');
                break;
            }
            case 'tab': {
                setIsScratchOpen(false);
                setActiveTabId(item.id);
                break;
            }
            case 'scratch': {
                setIsScratchOpen(true);
                break;
            }
        }
    }

    async function handleUpdateCompendiumEntry(
        entryId: string,
        category: CompendiumCategory,
        field: string,
        value: unknown
    ) {
        promoteTabToPermanent(entryId);
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
        templateData: Record<string, unknown>,
        existingId?: string
    ): Promise<string | null> {
        if (!currentProject) return null;
        const id = existingId || crypto.randomUUID();
        const isUpdate = Boolean(existingId);

        try {
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

                if (!mappingResult) return null;

                finalTemplateData = mappingResult.mergedTemplateData;
                templateUpdates = mappingResult.newFieldsToAdd;

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
                    });
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
                    setResolvedTemplateColumns((prev) => ({
                        ...prev,
                        [category]:
                            newResolved?.columns ?? DEFAULT_TEMPLATE_COLUMNS,
                    }));
                }
            }

            if (isUpdate) {
                const data = {
                    name,
                    templateData: finalTemplateData,
                } as any;
                switch (category) {
                    case 'character':
                        await rpc.request['db:update-character']({
                            id,
                            data,
                        });
                        break;
                    case 'location':
                        await rpc.request['db:update-location']({
                            id,
                            data,
                        });
                        break;
                    case 'organization':
                        await rpc.request['db:update-organization']({
                            id,
                            data,
                        });
                        break;
                    case 'item':
                        await rpc.request['db:update-item']({
                            id,
                            data,
                        });
                        break;
                    case 'lore':
                        await rpc.request['db:update-lore-entry']({
                            id,
                            data,
                        });
                        break;
                }
                if (currentProject) {
                    await loadCompendium(currentProject.id);
                }
                return id;
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
            setIsScratchOpen(false);
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
            setIsScratchOpen(false);
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

        if (currentProject) loadCompendium(currentProject.id);

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
            });
            const newResolved = await rpc.request['db:get-resolved-template']({
                projectId: currentProject.id,
                baseType: update.baseType,
            });
            setResolvedTemplateFields((prev) => ({
                ...prev,
                [update.baseType]: newResolved?.fields || [],
            }));
            setResolvedTemplateColumns((prev) => ({
                ...prev,
                [update.baseType]:
                    newResolved?.columns ?? DEFAULT_TEMPLATE_COLUMNS,
            }));
        }

        setExtractedEntries([]);
    }

    async function handleUpdateCompendium(
        _entries: ParsedEntry[],
        _source: ExtractionSource
    ) {
        handleExtractEntities(_entries, _source);
    }

    function handleCloseCompendiumTab(
        tabId: string,
        _category: CompendiumCategory
    ) {
        const closeSet = new Set([tabId]);
        setOpenTabs((prevTabs) => {
            const updatedTabs = prevTabs.filter((t) => t.id !== tabId);
            if (updatedTabs.length === prevTabs.length) return prevTabs;
            setActiveTabId((prevActiveId) =>
                getNextActiveTabIdAfterClosing(prevTabs, closeSet, prevActiveId)
            );
            return updatedTabs;
        });
    }

    const handleCloseTab = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setTileMenuState(null);
        setPreviewTabId((prev) => (prev === id ? null : prev));
        setLinkingSourceId((prev) => (prev === id ? null : prev));
        if (previewTargetChapterId === id) {
            closeChapterSplitPreview();
        }
        handleUnlinkChapter(id);
        delete tabRefs.current[id];

        const closeSet = new Set([id]);
        setTabContents((prev) => {
            if (!(id in prev)) return prev;
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });

        setOpenTabs((prevTabs) => {
            const updatedTabs = prevTabs.filter((t) => t.id !== id);
            if (updatedTabs.length === prevTabs.length) return prevTabs;
            setActiveTabId((prevActiveId) =>
                getNextActiveTabIdAfterClosing(prevTabs, closeSet, prevActiveId)
            );
            return updatedTabs;
        });
    };

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

            if (openTabIds.has(entryId)) {
                handleCloseTab(entryId);
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

    const activeTabForPreview = getActiveTab();
    const resolvedPreviewChapterId =
        previewTargetChapterId ||
        (activeTabForPreview?.type === 'chapter'
            ? activeTabForPreview.id
            : null);

    const previewActive =
        isPreviewOpen && !isScratchOpen && Boolean(resolvedPreviewChapterId);

    function renderSingleTabWorkspace(
        tab: FileTab,
        toolbarPortalTarget?: HTMLDivElement | null
    ) {
        const showTextFormatting = isTextFileTab();

        if (tab.type === 'plot-architecture') {
            if (!currentProject) {
                return (
                    <div className="empty-editor">
                        <IconFiles size={48} stroke={1.5} />
                        <p>Loading project...</p>
                    </div>
                );
            }
            return (
                <PlotArchitectureView
                    view={getPlotArchView(tab)}
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

        if (tab.type === 'chapter') {
            const chapterId = tab.id;
            const chapter = chapters.find((c) => c.id === chapterId);

            if (
                chapter &&
                currentProject &&
                (chapter.status === 'outline' || skeletonMode)
            ) {
                return (
                    <ChapterOutlineEditor
                        key={`${chapter.id}-${plotThreads.length}-${
                            chapterPlotThreads.filter(
                                (t) => t.chapterId === chapter.id
                            ).length
                        }`}
                        projectId={currentProject.id}
                        chapter={chapter}
                        characters={characters}
                        plotThreads={plotThreads}
                        chapterPlotThreads={chapterPlotThreads.filter(
                            (t) => t.chapterId === chapter.id
                        )}
                        acts={storyActs}
                        scenes={storyScenes.filter(
                            (s: any) => s.chapterId === chapter.id
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
                                setChapterPlotThreads((prev) => [
                                    ...prev.filter(
                                        (t) => t.chapterId !== chapter.id
                                    ),
                                    ...threads.map((t) => ({
                                        chapterId: t.chapterId,
                                        plotThreadId: t.plotThreadId,
                                        intensity: t.intensity,
                                    })),
                                ]);
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
                            const chapterDirectScenes = storyScenes.filter(
                                (s: any) =>
                                    s.chapterId === chapter.id && !s.sequenceId
                            );
                            const chapterSequences = storySequences.filter(
                                (s) => s.chapterId === chapter.id
                            );
                            const maxDisplayOrder = Math.max(
                                0,
                                ...chapterDirectScenes.map(
                                    (s: any) => s.displayOrder
                                ),
                                ...chapterSequences.map((s) => s.displayOrder)
                            );
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
                                          (s: any) => s.sequenceId === seq.id
                                      ).length
                                    : chapterDirectScenes.length,
                                displayOrder: seq ? 0 : maxDisplayOrder + 1,
                            } as any);
                            if (scene)
                                setStoryScenes((prev: any) => [...prev, scene]);
                        }}
                        onSceneDelete={async (id) => {
                            await rpc.request['db:delete-story-scene'](id);
                            setStoryScenes((prev: any) =>
                                prev.filter((s: any) => s.id !== id)
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
                                setStoryScenes((prev: any) =>
                                    prev.map((s: any) =>
                                        s.id === id ? updated : s
                                    )
                                );
                        }}
                        onSceneReorder={async (
                            targetContainer,
                            orderedIds,
                            movedSceneId,
                            sourceContainer
                        ) => {
                            if (
                                movedSceneId &&
                                sourceContainer !== targetContainer
                            ) {
                                await rpc.request['db:move-scene']({
                                    id: movedSceneId,
                                    data: {
                                        sequenceId: targetContainer,
                                        orderIndex:
                                            orderedIds.indexOf(movedSceneId),
                                    },
                                });
                            }
                            await rpc.request['db:reorder-scenes'](
                                orderedIds.map((id, orderIndex) => ({
                                    id,
                                    orderIndex,
                                }))
                            );
                            setStoryScenes((prev: any) =>
                                prev.map((s: any) => {
                                    const idx = orderedIds.indexOf(s.id);
                                    if (idx >= 0) {
                                        const updated = {
                                            ...s,
                                            orderIndex: idx,
                                        };
                                        if (
                                            movedSceneId &&
                                            s.id === movedSceneId
                                        ) {
                                            updated.sequenceId =
                                                targetContainer;
                                        }
                                        return updated;
                                    }
                                    return s;
                                })
                            );
                        }}
                        onSequenceCreate={async () => {
                            const chapterSeqs = storySequences.filter(
                                (s) => s.chapterId === chapter.id
                            );
                            const chapterScenesList = storyScenes.filter(
                                (s: any) =>
                                    s.chapterId === chapter.id && !s.sequenceId
                            );
                            const maxDisplayOrder = Math.max(
                                0,
                                ...chapterSeqs.map((s) => s.displayOrder),
                                ...chapterScenesList.map(
                                    (s: any) => s.displayOrder
                                )
                            );
                            const seq = await rpc.request[
                                'db:create-story-sequence'
                            ]({
                                id: crypto.randomUUID(),
                                projectId: chapter.projectId,
                                chapterId: chapter.id,
                                actId: chapter.actId,
                                title: 'New Sequence',
                                summary: null,
                                orderIndex: chapterSeqs.length,
                                displayOrder: maxDisplayOrder + 1,
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
                            setStoryScenes((prev: any) =>
                                prev.filter((s: any) => s.sequenceId !== id)
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
                        onStructureReorder={async (unifiedItems) => {
                            const chapterScenes = unifiedItems.filter(
                                (item) => item.type === 'scene'
                            );
                            const chapterSequences = unifiedItems.filter(
                                (item) => item.type === 'sequence'
                            );

                            await rpc.request['db:reorder-scenes'](
                                chapterScenes.map((item) => ({
                                    id: item.id,
                                    orderIndex: 0,
                                    displayOrder: item.displayOrder,
                                }))
                            );
                            await rpc.request['db:reorder-sequences'](
                                chapterSequences.map((item) => ({
                                    id: item.id,
                                    orderIndex: 0,
                                    displayOrder: item.displayOrder,
                                }))
                            );

                            for (const item of chapterScenes) {
                                if (item.sequenceId !== undefined) {
                                    await rpc.request['db:move-scene']({
                                        id: item.id,
                                        data: {
                                            sequenceId: item.sequenceId,
                                            displayOrder: item.displayOrder,
                                        } as any,
                                    });
                                }
                            }

                            setStoryScenes((prev: any) =>
                                prev.map((s: any) => {
                                    const item = chapterScenes.find(
                                        (ci) => ci.id === s.id
                                    );
                                    if (item) {
                                        const updated: any = {
                                            ...s,
                                            displayOrder: item.displayOrder,
                                        };
                                        if (item.sequenceId !== undefined) {
                                            updated.sequenceId =
                                                item.sequenceId;
                                        }
                                        return updated;
                                    }
                                    return s;
                                })
                            );
                            setStorySequences((prev) =>
                                prev.map((s) => {
                                    const item = chapterSequences.find(
                                        (ci) => ci.id === s.id
                                    );
                                    if (item) {
                                        return {
                                            ...s,
                                            displayOrder: item.displayOrder,
                                        };
                                    }
                                    return s;
                                })
                            );
                        }}
                    />
                );
            }

            const isChapterInPreview =
                isPreviewOpen && previewTargetChapterId === chapterId;
            const resolvedPortalTarget =
                toolbarPortalTarget !== undefined
                    ? toolbarPortalTarget
                    : activeTabId === chapterId
                      ? inlineToolbarTarget
                      : null;

            return (
                <div onClickCapture={handleEditorToolbarClickCapture}>
                    <RichTextEditor
                        ref={editorRef}
                        tabId={chapterId}
                        initialContent={tabContents[chapterId] || ''}
                        onChange={(content) => {
                            promoteTabToPermanent(chapterId);
                            setTabContents((prev) => ({
                                ...prev,
                                [chapterId]: content,
                            }));
                            setOpenTabs((prev) =>
                                prev.map((t) =>
                                    t.id === chapterId
                                        ? { ...t, isModified: true }
                                        : t
                                )
                            );
                            computeMetrics(content);
                            modifiedTabIdsRef.current.add(chapterId);
                            setSaveState('saving');
                            debouncedSave(chapterId, content);
                        }}
                        onCursorPosition={(line, col) => {
                            setCursorLine(line);
                            setCursorCol(col);
                        }}
                        showToolbar={showTextFormatting}
                        showBubbleMenu={showTextFormatting}
                        editable={!isReadingMode}
                        onToggleEditable={() => setIsReadingMode((v) => !v)}
                        isPreviewOpen={isChapterInPreview}
                        onTogglePreview={() => {
                            if (isChapterInPreview) {
                                closeChapterSplitPreview();
                            } else {
                                openChapterSplitPreview(chapterId);
                            }
                        }}
                        showPreview={true}
                        toolbarPortalTarget={resolvedPortalTarget}
                    />
                </div>
            );
        }

        if (tab.type === 'file') {
            return (
                <RichTextEditor
                    ref={editorRef}
                    tabId={tab.id}
                    initialContent={tabContents[tab.id] || ''}
                    onChange={(content) => {
                        promoteTabToPermanent(tab.id);
                        setTabContents((prev) => ({
                            ...prev,
                            [tab.id]: content,
                        }));
                        setOpenTabs((prev) =>
                            prev.map((t) =>
                                t.id === tab.id ? { ...t, isModified: true } : t
                            )
                        );
                        computeMetrics(content);
                        modifiedTabIdsRef.current.add(tab.id);
                        setSaveState('saving');
                        debouncedSave(tab.id, content);
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
                    showPreview={false}
                />
            );
        }

        const entry = compendiumEntries[tab.id];
        if (entry) {
            const category = tab.type as CompendiumCategory;
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
                    columns={resolvedTemplateColumns[category]}
                    layout={templateLayouts[category]}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    items={items}
                    loreEntries={loreEntries}
                    onUpdate={(field, value) =>
                        handleUpdateCompendiumEntry(
                            tab.id,
                            category,
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

    // Shared Pinned Unified Top Bar for Chapter Editor — always targets the exact `currentTab.id` that owns this bar
    function renderUnifiedChapterHeaderBar(
        currentTab: FileTab,
        options: {
            showLinkScroll: boolean;
            portalSetter?: (el: HTMLDivElement | null) => void;
        }
    ) {
        const currentChapterId = currentTab.id;
        const chapter = chapters.find((c) => c.id === currentChapterId);
        const showSkeletonBtn = chapter?.status !== 'outline';
        const setPortalSlot = options.portalSetter ?? setInlineToolbarTarget;
        const isThisChapterInPreview =
            isPreviewOpen && previewTargetChapterId === currentChapterId;

        return (
            <div className={styles.unifiedSplitHeaderRow}>
                <div className={styles.inlineChapterTitleWrapper}>
                    <span className={styles.chapterPrefixLabel}>Chapter :</span>
                    <EditableChapterPaneTitle
                        chapterId={currentChapterId}
                        title={chapter?.title ?? currentTab.name}
                        onCommit={renameChapter}
                    />
                </div>

                {/* Centered Formatting Controls Portaled Directly from FormattingToolbar */}
                <div ref={setPortalSlot} className={styles.inlineToolbarSlot} />

                {/* Right Controls: [Link Icon when Preview is open] + Eye Icon + Book Icon + SKELETON */}
                <div className={styles.splitRightActionCluster}>
                    {options.showLinkScroll && readerMode === 'chapter' && (
                        <button
                            type="button"
                            className={`${styles.headerIconToggleBtn} ${
                                isScrollLinked
                                    ? styles.headerIconToggleBtnActive
                                    : ''
                            }`}
                            onClick={() => setIsScrollLinked((v) => !v)}
                            title={
                                isScrollLinked ? 'Unlink Scroll' : 'Link Scroll'
                            }
                        >
                            <IconLink size={16} stroke={2.1} />
                        </button>
                    )}

                    <button
                        type="button"
                        className={`${styles.headerIconToggleBtn} ${
                            isThisChapterInPreview
                                ? styles.headerIconToggleBtnActive
                                : ''
                        }`}
                        onClick={() => {
                            if (isThisChapterInPreview) {
                                closeChapterSplitPreview();
                            } else {
                                openChapterSplitPreview(currentChapterId);
                            }
                        }}
                        title={
                            isThisChapterInPreview
                                ? 'Close Preview'
                                : `Open Preview (${chapter?.title ?? currentTab.name})`
                        }
                    >
                        <IconEye size={16} stroke={2} />
                    </button>

                    <button
                        type="button"
                        className={`${styles.headerIconToggleBtn} ${
                            isReadingMode
                                ? styles.headerIconToggleBtnActive
                                : ''
                        }`}
                        onClick={() => setIsReadingMode((v) => !v)}
                        title={
                            isReadingMode ? 'Exit Reading Mode' : 'Reading Mode'
                        }
                    >
                        <IconBook size={16} stroke={2} />
                    </button>

                    {showSkeletonBtn && (
                        <button
                            type="button"
                            className={`tb-btn ${skeletonMode ? 'active' : ''} ${styles.paneHeaderActionBtn}`}
                            onClick={() => setSkeletonMode((v) => !v)}
                            title={
                                skeletonMode
                                    ? 'Disable Skeleton Mode'
                                    : 'Enable Skeleton Mode'
                            }
                        >
                            Skeleton
                        </button>
                    )}
                </div>
            </div>
        );
    }

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

        const renderSkeletonToggle = (tab: FileTab) => {
            if (tab.type !== 'chapter') return null;
            const chapter = chapters.find((c) => c.id === tab.id);
            if (chapter?.status === 'outline') return null;
            return (
                <button
                    type="button"
                    className={`tb-btn ${skeletonMode ? 'active' : ''} ${styles.paneHeaderActionBtn}`}
                    onClick={() => setSkeletonMode((v) => !v)}
                    title={
                        skeletonMode
                            ? 'Disable Skeleton Mode'
                            : 'Enable Skeleton Mode'
                    }
                >
                    Skeleton
                </button>
            );
        };

        const renderPaneTitle = (tab: FileTab) => {
            if (tab.type === 'chapter') {
                const chapter = chapters.find((c) => c.id === tab.id);
                return (
                    <EditableChapterPaneTitle
                        chapterId={tab.id}
                        title={chapter?.title ?? tab.name}
                        onCommit={renameChapter}
                    />
                );
            }
            return <span className={styles.paneTitleBadge}>{tab.name}</span>;
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

        if (previewActive) {
            const targetId = resolvedPreviewChapterId!;
            const currentChapterSide: 'left' | 'right' =
                chapterPreviewSides[targetId] ?? 'right';

            const previewChapterTab: FileTab =
                activeTab.type === 'chapter' && activeTab.id === targetId
                    ? activeTab
                    : {
                          id: targetId,
                          name:
                              chapters.find((c) => c.id === targetId)?.title ??
                              'Chapter',
                          type: 'chapter',
                          filePath: '',
                          isModified: false,
                      };

            const editorPaneEl = (
                <div
                    className={`${styles.splitEditorCompact} ${styles.splitEditorPaneShell} ${
                        currentChapterSide === 'right'
                            ? styles.leftPane
                            : styles.rightPane
                    }`}
                    style={
                        currentChapterSide === 'right'
                            ? {
                                  flex: `0 0 ${tileSplitRatio}%`,
                                  width: `${tileSplitRatio}%`,
                              }
                            : undefined
                    }
                    onMouseDownCapture={() => {
                        setFocusedTileSide(
                            currentChapterSide === 'right' ? 'left' : 'right'
                        );
                    }}
                >
                    {renderUnifiedChapterHeaderBar(previewChapterTab, {
                        showLinkScroll: true,
                    })}

                    <div
                        ref={editorSplitPaneRef}
                        onScrollCapture={handleEditorScrollCapture}
                        className={styles.splitEditorScrollBody}
                    >
                        {wrapWidth(renderSingleTabWorkspace(previewChapterTab))}
                    </div>
                </div>
            );

            const previewPaneEl = (
                <div
                    ref={previewPaneContainerRef}
                    onScrollCapture={handlePreviewScrollCapture}
                    className={`${
                        isPreviewFullscreen
                            ? `${styles.rightPane} ${styles.previewPaneFullscreen}`
                            : currentChapterSide === 'right'
                              ? styles.rightPane
                              : styles.leftPane
                    } ${styles.previewPaneShell}`}
                    style={
                        !isPreviewFullscreen && currentChapterSide === 'left'
                            ? {
                                  flex: `0 0 ${tileSplitRatio}%`,
                                  width: `${tileSplitRatio}%`,
                              }
                            : undefined
                    }
                    onMouseDownCapture={() => {
                        setFocusedTileSide(currentChapterSide);
                    }}
                >
                    <PreviewPane
                        chapters={chapters}
                        tabContents={tabContents}
                        activeChapterId={targetId}
                        readerMode={readerMode}
                        onReaderModeChange={handleReaderModeChange}
                        onClose={closeChapterSplitPreview}
                        previewPosition={currentChapterSide}
                        onTogglePosition={() => {
                            const nextSide =
                                currentChapterSide === 'right'
                                    ? 'left'
                                    : 'right';
                            setSideForChapter(targetId, nextSide);
                        }}
                        isFullscreen={isPreviewFullscreen}
                        onToggleFullscreen={() =>
                            setIsPreviewFullscreen((v) => !v)
                        }
                        bodyScrollRef={previewBodyScrollRef}
                        width="100%"
                        chapterLinks={chapterLinks}
                        onUnlink={handleUnlinkChapter}
                        onStartLinking={handleStartLinking}
                        linkingSourceId={linkingSourceId}
                        onTextChange={(id, text) => {
                            setTabContents((prev) => ({
                                ...prev,
                                [id]: text,
                            }));
                            setOpenTabs((prev) =>
                                prev.map((t) =>
                                    t.id === id ? { ...t, isModified: true } : t
                                )
                            );
                            modifiedTabIdsRef.current.add(id);
                            setSaveState('saving');
                            debouncedSave(id, text);
                        }}
                    />
                </div>
            );

            const resizerEl = (
                <div
                    className={`${styles.tileResizeDivider} ${isTileResizing ? styles.tileResizeDividerActive : ''}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsTileResizing(true);
                        document.body.style.userSelect = 'none';
                        document.body.style.webkitUserSelect = 'none';
                        document.body.style.cursor = 'col-resize';
                    }}
                    title="Drag to resize panes (40% - 60%)"
                />
            );

            return (
                <div className={styles.tabContentContainer}>
                    <div ref={workspaceRef} className={styles.workspace}>
                        {isPreviewFullscreen ? (
                            previewPaneEl
                        ) : currentChapterSide === 'left' ? (
                            <>
                                {previewPaneEl}
                                {resizerEl}
                                {editorPaneEl}
                            </>
                        ) : (
                            <>
                                {editorPaneEl}
                                {resizerEl}
                                {previewPaneEl}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        const linkedPair = getLinkedPartner(activeTab.id);

        if (linkedPair) {
            return (
                <div className={styles.tabContentContainer}>
                    <div ref={workspaceRef} className={styles.workspace}>
                        <div
                            ref={leftScrollRef}
                            className={`${styles.leftPane} ${
                                linkedPair.source.type === 'chapter'
                                    ? styles.splitEditorPaneShell
                                    : ''
                            }`}
                            style={{
                                flex: `0 0 ${tileSplitRatio}%`,
                                width: `${tileSplitRatio}%`,
                            }}
                            onMouseDownCapture={() => {
                                setFocusedTileSide('left');
                                if (activeTabId !== linkedPair.source.id) {
                                    setActiveTabId(linkedPair.source.id);
                                }
                            }}
                        >
                            {linkedPair.source.type === 'chapter' ? (
                                renderUnifiedChapterHeaderBar(
                                    linkedPair.source,
                                    {
                                        showLinkScroll: false,
                                        portalSetter: setLeftTileToolbarTarget,
                                    }
                                )
                            ) : (
                                <div className={styles.paneHeaderRow}>
                                    {renderPaneTitle(linkedPair.source)}
                                    <div className={styles.paneHeaderActions}>
                                        {renderSkeletonToggle(
                                            linkedPair.source
                                        )}
                                        {focusedTileSide === 'left' && (
                                            <button
                                                className={
                                                    styles.paneUnlinkSmallBtn
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnlinkChapter(
                                                        linkedPair.source.id
                                                    );
                                                }}
                                            >
                                                Unlink Tile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className={styles.splitEditorScrollBody}>
                                {renderSingleTabWorkspace(
                                    linkedPair.source,
                                    linkedPair.source.type === 'chapter'
                                        ? leftTileToolbarTarget
                                        : null
                                )}
                            </div>
                        </div>

                        <div
                            className={`${styles.tileResizeDivider} ${isTileResizing ? styles.tileResizeDividerActive : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsTileResizing(true);
                                document.body.style.userSelect = 'none';
                                document.body.style.webkitUserSelect = 'none';
                                document.body.style.cursor = 'col-resize';
                            }}
                            onMouseEnter={() => setIsCenterHovered(true)}
                            onMouseLeave={() => setIsCenterHovered(false)}
                            title="Drag to resize panes (40% - 60%)"
                        >
                            {isCenterHovered && !isTileResizing && (
                                <button
                                    className={styles.hoverUnlinkBtn}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={() =>
                                        handleUnlinkChapter(
                                            linkedPair.source.id
                                        )
                                    }
                                >
                                    Unlink
                                </button>
                            )}
                        </div>

                        <div
                            ref={rightScrollRef}
                            className={`${styles.rightPane} ${
                                linkedPair.target.type === 'chapter'
                                    ? styles.splitEditorPaneShell
                                    : ''
                            }`}
                            onMouseDownCapture={() => {
                                setFocusedTileSide('right');
                                if (activeTabId !== linkedPair.target.id) {
                                    setActiveTabId(linkedPair.target.id);
                                }
                            }}
                        >
                            {linkedPair.target.type === 'chapter' ? (
                                renderUnifiedChapterHeaderBar(
                                    linkedPair.target,
                                    {
                                        showLinkScroll: false,
                                        portalSetter: setRightTileToolbarTarget,
                                    }
                                )
                            ) : (
                                <div className={styles.paneHeaderRow}>
                                    {renderPaneTitle(linkedPair.target)}
                                    <div className={styles.paneHeaderActions}>
                                        {renderSkeletonToggle(
                                            linkedPair.target
                                        )}
                                        {focusedTileSide === 'right' && (
                                            <button
                                                className={
                                                    styles.paneUnlinkSmallBtn
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnlinkChapter(
                                                        linkedPair.target.id
                                                    );
                                                }}
                                            >
                                                Unlink Tile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className={styles.splitEditorScrollBody}>
                                {renderSingleTabWorkspace(
                                    linkedPair.target,
                                    linkedPair.target.type === 'chapter'
                                        ? rightTileToolbarTarget
                                        : null
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab.type === 'chapter') {
            return (
                <div className={styles.tabContentContainer}>
                    <div className={styles.workspace}>
                        <div
                            className={`${styles.splitEditorCompact} ${styles.singleChapterPaneShell}`}
                        >
                            {renderUnifiedChapterHeaderBar(activeTab, {
                                showLinkScroll: false,
                            })}

                            <div
                                ref={editorSplitPaneRef}
                                className={styles.splitEditorScrollBody}
                            >
                                {wrapWidth(renderSingleTabWorkspace(activeTab))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeTab.type === 'file') {
            return (
                <div className="editor-split-main">
                    {wrapWidth(renderSingleTabWorkspace(activeTab))}
                </div>
            );
        }

        return renderSingleTabWorkspace(activeTab);
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

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - previewDragStartXRef.current;
            const start = previewDragStartWidthRef.current;
            const w = Math.min(
                720,
                Math.max(
                    280,
                    previewSide === 'left' ? start + delta : start - delta
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
    }, [isPreviewDragging, previewSide, updateAppearance]);

    const setLeftCollapsed = useCallback(
        (next: boolean) => {
            setIsCollapsed(next);
            if (next) {
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                setIsLeftHovered(false);
            }
            const constraints = settings?.appearance?.sidebarConstraints;
            if (!constraints) return;
            updateAppearance('sidebarConstraints', {
                ...constraints,
                leftPanelCollapsed: next,
            });
        },
        [settings, updateAppearance]
    );

    const handleOpenTileMenu = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTileMenuState((prev) =>
            prev?.chapterId === tabId
                ? null
                : {
                      chapterId: tabId,
                      x: Math.min(rect.left, window.innerWidth - 190),
                      y: rect.bottom + 6,
                  }
        );
    };

    const handleTabContextMenu = (
        tab: FileTab,
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setTileMenuState({
            chapterId: tab.id,
            x: Math.min(e.clientX, window.innerWidth - 190),
            y: e.clientY + 4,
        });
    };

    const renderedTabIds = new Set<string>();
    const activeTabObj = getActiveTab();

    const menuTabObj = tileMenuState
        ? openTabs.find((t) => t.id === tileMenuState.chapterId)
        : null;
    const menuTabIndex = tileMenuState
        ? openTabs.findIndex((t) => t.id === tileMenuState.chapterId)
        : -1;
    const hasLeftTabs = menuTabIndex > 0;
    const hasRightTabs =
        menuTabIndex !== -1 && menuTabIndex < openTabs.length - 1;
    const canTileMenuTab = Boolean(menuTabObj);
    const isMenuTabChapter = menuTabObj?.type === 'chapter';
    const isMenuTabInPreview =
        isMenuTabChapter &&
        isPreviewOpen &&
        resolvedPreviewChapterId === tileMenuState?.chapterId;

    const getLinkingSourceName = (id: string) => {
        return (
            openTabs.find((t) => t.id === id)?.name ||
            chapters.find((c) => c.id === id)?.title ||
            characters.find((c) => c.id === id)?.name ||
            locations.find((l) => l.id === id)?.name ||
            organizations.find((o) => o.id === id)?.name ||
            items.find((i) => i.id === id)?.name ||
            loreEntries.find((l) => l.id === id)?.name ||
            'Selected Tab'
        );
    };

    return (
        <>
            <TitleBar
                isCollapsed={isCollapsed}
                isChatCollapsed={isChatCollapsed}
                setIsCollapsed={setLeftCollapsed}
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
                quickAccessItems={quickAccessItems}
                onQuickAccessSelect={handleQuickAccessSelect}
                extras={
                    currentProject && (
                        <>
                            <button
                                className={`tb-btn ${activeTabId === getPlotArchTabId('acts') ? 'active' : ''}`}
                                onClick={() =>
                                    togglePlotArchitectureTab('acts')
                                }
                                title="Plot Architecture — Acts"
                            >
                                Acts
                            </button>
                            <button
                                className={`tb-btn ${activeTabId === getPlotArchTabId('threads') ? 'active' : ''}`}
                                onClick={() =>
                                    togglePlotArchitectureTab('threads')
                                }
                                title="Plot Architecture — Plot Threads"
                            >
                                Threads
                            </button>
                            <button
                                className={`tb-btn ${activeTabId === getPlotArchTabId('beats') ? 'active' : ''}`}
                                onClick={() =>
                                    togglePlotArchitectureTab('beats')
                                }
                                title="Plot Architecture — Story Beats"
                            >
                                Beats
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
                <div
                    ref={leftPanelContainerRef}
                    className={styles.leftSidebarNoScrollbar}
                    onDragStartCapture={handleLeftPanelDragStartCapture}
                    onDragEndCapture={handleLeftPanelDragEndCapture}
                >
                    <LeftPanel
                        width={leftSidebarWidth}
                        openTabIds={openTabIds}
                        previewTabId={previewTabId}
                        legacyBluePanel={
                            settings?.appearance?.legacyBluePanel ?? false
                        }
                        isCollapsed={isCollapsed}
                        isLeftHovered={isLeftHovered}
                        enableAutoExpandLeft={
                            settings?.appearance?.sidebarConstraints
                                ?.enableAutoExpandLeft
                        }
                        onCollapseToggle={() => setLeftCollapsed(!isCollapsed)}
                        onAutoExpandToggle={() => {
                            const constraints =
                                settings?.appearance?.sidebarConstraints;
                            if (!constraints) return;
                            updateAppearance('sidebarConstraints', {
                                ...constraints,
                                enableAutoExpandLeft:
                                    !constraints.enableAutoExpandLeft,
                            });
                        }}
                        activeTabId={activeTabId}
                        mode={mode}
                        explorerTab={explorerTab}
                        onModeChange={(newMode) => {
                            setMode(newMode);
                            if (newMode === 'manuscript')
                                setExplorerTab('chapters');
                            else setExplorerTab('character');
                        }}
                        onSubTabChange={(tab) => setExplorerTab(tab)}
                        chapters={chapters}
                        characters={characters}
                        locations={locations}
                        organizations={organizations}
                        items={items}
                        loreEntries={loreEntries}
                        chaptersLoading={chaptersLoading}
                        handleNewChapter={handleNewChapter}
                        handleNewCompendiumEntry={handleNewCompendiumEntry}
                        handleEditTemplate={() => handleEditTemplate()}
                        openChapter={(c) => openChapterTab(c)}
                        openCompendiumEntry={(id, cat) =>
                            handleOpenCompendiumEntry(id, cat)
                        }
                        deleteChapter={(c) => {
                            rpc.request['db:delete-chapter'](c.id).then(() => {
                                loadChapters(currentProject!.id);
                                if (openTabIds.has(c.id)) {
                                    handleCloseTab(c.id);
                                }
                            });
                        }}
                        renameEntry={renameExplorerEntry}
                        deleteCompendiumEntry={handleDeleteCompendiumEntry}
                        isDragging={isDragging}
                        onDragStart={(dir, x) => handleDragStart(dir, x)}
                        onMouseEnter={() => {
                            if (
                                settings?.appearance?.sidebarConstraints
                                    ?.enableAutoExpandLeft
                            ) {
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
                                hoverTimerRef.current = setTimeout(
                                    () => setIsLeftHovered(false),
                                    200
                                );
                            }
                        }}
                    />
                </div>

                <div className="app-editor">
                    {/* Top Tabs Bar */}
                    <div
                        className={styles.topContainer}
                        onClick={() => setTileMenuState(null)}
                        onDragOver={handleTabsContainerDragOver}
                        onDragLeave={handleTabsContainerDragLeave}
                        onDrop={handleTabsContainerDrop}
                    >
                        <button
                            className={`${styles.topTab} ${styles.scratchTabBtn} ${isScratchOpen ? styles.topTabActive : ''}`}
                            onClick={() => {
                                setTileMenuState(null);
                                setIsScratchOpen(!isScratchOpen);
                            }}
                            title="Scratchpad"
                        >
                            <IconNotes size={15} />
                        </button>

                        <div className={styles.topBarDivider} />

                        <div
                            ref={tabsGroupRef}
                            onWheel={handleTabsWheel}
                            className={styles.tabsGroupDiv}
                        >
                            {openTabs.map((tab) => {
                                if (renderedTabIds.has(tab.id)) return null;

                                const partner = getLinkedPartner(tab.id);

                                if (partner) {
                                    renderedTabIds.add(partner.source.id);
                                    renderedTabIds.add(partner.target.id);
                                    const isSourceActive =
                                        !isScratchOpen &&
                                        activeTabId === partner.source.id;
                                    const isTargetActive =
                                        !isScratchOpen &&
                                        activeTabId === partner.target.id;

                                    const sourceDropMode =
                                        tabDropTarget?.tabId ===
                                        partner.source.id
                                            ? tabDropTarget.mode
                                            : null;
                                    const targetDropMode =
                                        tabDropTarget?.tabId ===
                                        partner.target.id
                                            ? tabDropTarget.mode
                                            : null;

                                    return (
                                        <div
                                            key={`pair-${partner.source.id}-${partner.target.id}`}
                                            className={styles.tabPairWrapper}
                                        >
                                            <button
                                                ref={(el) => {
                                                    tabRefs.current[
                                                        partner.source.id
                                                    ] = el;
                                                }}
                                                draggable
                                                onDragStart={(e) =>
                                                    handleTabDragStart(
                                                        partner.source.id,
                                                        e
                                                    )
                                                }
                                                onDragOver={(e) =>
                                                    handleTabDragOver(
                                                        partner.source,
                                                        e
                                                    )
                                                }
                                                onDrop={(e) =>
                                                    handleTabDrop(
                                                        partner.source,
                                                        e
                                                    )
                                                }
                                                onDragEnd={handleTabDragEnd}
                                                onDoubleClick={() => {
                                                    promoteTabToPermanent(
                                                        partner.source.id
                                                    );
                                                    if (
                                                        partner.source.type ===
                                                        'chapter'
                                                    ) {
                                                        openChapterSplitPreview(
                                                            partner.source.id
                                                        );
                                                    }
                                                }}
                                                className={`${styles.topTab} ${isSourceActive ? styles.topTabPairedActive : ''} ${
                                                    sourceDropMode === 'before'
                                                        ? styles.topTabInsertBefore
                                                        : sourceDropMode ===
                                                            'after'
                                                          ? styles.topTabInsertAfter
                                                          : sourceDropMode ===
                                                              'merge'
                                                            ? styles.topTabMergeHighlight
                                                            : ''
                                                }`}
                                                onContextMenu={(e) =>
                                                    handleTabContextMenu(
                                                        partner.source,
                                                        e
                                                    )
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTileMenuState(null);
                                                    setIsScratchOpen(false);
                                                    setFocusedTileSide('left');
                                                    if (linkingSourceId) {
                                                        handleCompleteLink(
                                                            partner.source.id
                                                        );
                                                    } else {
                                                        setActiveTabId(
                                                            partner.source.id
                                                        );
                                                        if (isPreviewOpen) {
                                                            openChapterSplitPreview(
                                                                partner.source
                                                                    .id
                                                            );
                                                        }
                                                    }
                                                }}
                                            >
                                                {renderTabIcon(partner.source)}
                                                <span>
                                                    {partner.source.name}
                                                </span>
                                                <span
                                                    className={
                                                        styles.tabCloseIcon
                                                    }
                                                    onClick={(e) =>
                                                        handleCloseTab(
                                                            partner.source.id,
                                                            e
                                                        )
                                                    }
                                                >
                                                    <IconX size={12} />
                                                </span>
                                            </button>

                                            <div
                                                className={
                                                    styles.pairIconContainer
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTileMenuState(null);
                                                    handleUnlinkChapter(
                                                        partner.source.id
                                                    );
                                                }}
                                                title="Unlink Tile"
                                            >
                                                <IconLinkOff size={14} />
                                            </div>

                                            <button
                                                ref={(el) => {
                                                    tabRefs.current[
                                                        partner.target.id
                                                    ] = el;
                                                }}
                                                draggable
                                                onDragStart={(e) =>
                                                    handleTabDragStart(
                                                        partner.target.id,
                                                        e
                                                    )
                                                }
                                                onDragOver={(e) =>
                                                    handleTabDragOver(
                                                        partner.target,
                                                        e
                                                    )
                                                }
                                                onDrop={(e) =>
                                                    handleTabDrop(
                                                        partner.target,
                                                        e
                                                    )
                                                }
                                                onDragEnd={handleTabDragEnd}
                                                onDoubleClick={() => {
                                                    promoteTabToPermanent(
                                                        partner.target.id
                                                    );
                                                    if (
                                                        partner.target.type ===
                                                        'chapter'
                                                    ) {
                                                        openChapterSplitPreview(
                                                            partner.target.id
                                                        );
                                                    }
                                                }}
                                                className={`${styles.topTab} ${isTargetActive ? styles.topTabPairedActive : ''} ${
                                                    targetDropMode === 'before'
                                                        ? styles.topTabInsertBefore
                                                        : targetDropMode ===
                                                            'after'
                                                          ? styles.topTabInsertAfter
                                                          : targetDropMode ===
                                                              'merge'
                                                            ? styles.topTabMergeHighlight
                                                            : ''
                                                }`}
                                                onContextMenu={(e) =>
                                                    handleTabContextMenu(
                                                        partner.target,
                                                        e
                                                    )
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTileMenuState(null);
                                                    setIsScratchOpen(false);
                                                    setFocusedTileSide('right');
                                                    if (linkingSourceId) {
                                                        handleCompleteLink(
                                                            partner.target.id
                                                        );
                                                    } else {
                                                        setActiveTabId(
                                                            partner.target.id
                                                        );
                                                        if (isPreviewOpen) {
                                                            openChapterSplitPreview(
                                                                partner.target
                                                                    .id
                                                            );
                                                        }
                                                    }
                                                }}
                                            >
                                                {renderTabIcon(partner.target)}
                                                <span>
                                                    {partner.target.name}
                                                </span>
                                                <span
                                                    className={
                                                        styles.tabCloseIcon
                                                    }
                                                    onClick={(e) =>
                                                        handleCloseTab(
                                                            partner.target.id,
                                                            e
                                                        )
                                                    }
                                                >
                                                    <IconX size={12} />
                                                </span>
                                            </button>
                                        </div>
                                    );
                                } else {
                                    renderedTabIds.add(tab.id);
                                    const isActive =
                                        !isScratchOpen &&
                                        activeTabId === tab.id;
                                    const isLinkingSource =
                                        linkingSourceId === tab.id;
                                    const isPreview = previewTabId === tab.id;
                                    const dropMode =
                                        tabDropTarget?.tabId === tab.id
                                            ? tabDropTarget.mode
                                            : null;

                                    return (
                                        <button
                                            key={tab.id}
                                            ref={(el) => {
                                                tabRefs.current[tab.id] = el;
                                            }}
                                            draggable
                                            onDragStart={(e) =>
                                                handleTabDragStart(tab.id, e)
                                            }
                                            onDragOver={(e) =>
                                                handleTabDragOver(tab, e)
                                            }
                                            onDrop={(e) =>
                                                handleTabDrop(tab, e)
                                            }
                                            onDragEnd={handleTabDragEnd}
                                            onDoubleClick={() => {
                                                promoteTabToPermanent(tab.id);
                                                if (tab.type === 'chapter') {
                                                    openChapterSplitPreview(
                                                        tab.id
                                                    );
                                                }
                                            }}
                                            className={`${styles.topTab} ${isActive ? styles.topTabActive : ''} ${isLinkingSource ? styles.topTabLinkingSource : ''} ${isPreview ? styles.topTabPreview : ''} ${
                                                dropMode === 'before'
                                                    ? styles.topTabInsertBefore
                                                    : dropMode === 'after'
                                                      ? styles.topTabInsertAfter
                                                      : dropMode === 'merge'
                                                        ? styles.topTabMergeHighlight
                                                        : ''
                                            }`}
                                            onContextMenu={(e) =>
                                                handleTabContextMenu(tab, e)
                                            }
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTileMenuState(null);
                                                setIsScratchOpen(false);
                                                if (linkingSourceId) {
                                                    handleCompleteLink(tab.id);
                                                } else {
                                                    setActiveTabId(tab.id);
                                                    if (
                                                        isPreviewOpen &&
                                                        tab.type === 'chapter'
                                                    ) {
                                                        openChapterSplitPreview(
                                                            tab.id
                                                        );
                                                    }
                                                }
                                            }}
                                            title={
                                                tab.type === 'chapter'
                                                    ? `${tab.name} (Double-click to open Preview)`
                                                    : isPreview
                                                      ? 'Preview tab (Double-click to keep open)'
                                                      : tab.name
                                            }
                                        >
                                            {renderTabIcon(tab)}
                                            <span>{tab.name}</span>
                                            <span
                                                className={styles.tabCloseIcon}
                                                onClick={(e) =>
                                                    handleCloseTab(tab.id, e)
                                                }
                                            >
                                                <IconX size={12} />
                                            </span>
                                        </button>
                                    );
                                }
                            })}
                        </div>

                        <div className={styles.rightActionsGroup}>
                            <button
                                className={styles.addBtn}
                                onClick={() => {
                                    setTileMenuState(null);
                                    setActiveDialog('openFileDialog');
                                }}
                                title="Open File or Add Tab"
                            >
                                <IconPlus size={16} />
                            </button>
                            {activeTabObj && (
                                <button
                                    className={styles.addBtn}
                                    onClick={(e) =>
                                        handleOpenTileMenu(activeTabObj.id, e)
                                    }
                                    title="Tab Options"
                                >
                                    <IconDotsVertical size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Three-Dots Toolbar Menu */}
                    {toolbarSplitMenu && (
                        <div
                            className={styles.tileDropdownMenu}
                            style={{
                                top: toolbarSplitMenu.y,
                                left: toolbarSplitMenu.x,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className={styles.tileDropdownItem}
                                onClick={() => {
                                    const targetId =
                                        activeTabObj?.type === 'chapter'
                                            ? activeTabObj.id
                                            : resolvedPreviewChapterId;
                                    const currentSide = targetId
                                        ? (chapterPreviewSidesRef.current[
                                              targetId
                                          ] ?? previewSide)
                                        : previewSide;
                                    const nextSide =
                                        currentSide === 'right'
                                            ? 'left'
                                            : 'right';
                                    if (targetId) {
                                        setSideForChapter(targetId, nextSide);
                                        if (!isPreviewOpen) {
                                            setPreviewTargetChapterId(targetId);
                                            setIsPreviewOpen(true);
                                        }
                                    } else {
                                        setPreviewSide(nextSide);
                                    }
                                    setIsPreviewFullscreen(false);
                                    setToolbarSplitMenu(null);
                                }}
                            >
                                {previewSide === 'right' ? (
                                    <IconLayoutSidebarLeftExpand size={15} />
                                ) : (
                                    <IconLayoutSidebarRightExpand size={15} />
                                )}
                                <span>
                                    {previewSide === 'right'
                                        ? 'Left Split'
                                        : 'Right Split'}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Right-Click Context Menu */}
                    {tileMenuState && (
                        <div
                            className={styles.tileDropdownMenu}
                            style={{
                                top: tileMenuState.y,
                                left: tileMenuState.x,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isMenuTabChapter && (
                                <button
                                    className={styles.tileDropdownItem}
                                    onClick={() => {
                                        const targetId =
                                            tileMenuState.chapterId;
                                        setTileMenuState(null);
                                        if (isMenuTabInPreview) {
                                            closeChapterSplitPreview();
                                        } else {
                                            openChapterSplitPreview(targetId);
                                        }
                                    }}
                                >
                                    <IconEye size={15} />
                                    <span>
                                        {isMenuTabInPreview
                                            ? 'Close Preview'
                                            : 'Add Preview'}
                                    </span>
                                </button>
                            )}

                            {canTileMenuTab && (
                                <>
                                    <button
                                        className={styles.tileDropdownItem}
                                        onClick={(e) =>
                                            handleStartLinking(
                                                tileMenuState.chapterId,
                                                e
                                            )
                                        }
                                    >
                                        <IconLayoutColumns size={15} />
                                        <span>Add Tile</span>
                                    </button>
                                    {getLinkedPartner(
                                        tileMenuState.chapterId
                                    ) && (
                                        <button
                                            className={styles.tileDropdownItem}
                                            onClick={() =>
                                                handleUnlinkChapter(
                                                    tileMenuState.chapterId
                                                )
                                            }
                                        >
                                            <IconLinkOff size={15} />
                                            <span>Unlink Tile</span>
                                        </button>
                                    )}
                                    <div
                                        className={styles.tileDropdownDivider}
                                    />
                                </>
                            )}

                            <button
                                className={styles.tileDropdownItem}
                                onClick={() =>
                                    handleCloseTab(tileMenuState.chapterId)
                                }
                            >
                                <IconX size={15} />
                                <span>Close</span>
                            </button>

                            <button
                                className={`${styles.tileDropdownItem} ${!hasRightTabs ? styles.tileDropdownItemDisabled : ''}`}
                                disabled={!hasRightTabs}
                                onClick={() =>
                                    handleCloseRightTabs(
                                        tileMenuState.chapterId
                                    )
                                }
                            >
                                <IconArrowBarToRight size={15} />
                                <span>Close Right Tabs</span>
                            </button>

                            <button
                                className={`${styles.tileDropdownItem} ${!hasLeftTabs ? styles.tileDropdownItemDisabled : ''}`}
                                disabled={!hasLeftTabs}
                                onClick={() =>
                                    handleCloseLeftTabs(tileMenuState.chapterId)
                                }
                            >
                                <IconArrowBarToLeft size={15} />
                                <span>Close Left Tabs</span>
                            </button>

                            <div className={styles.tileDropdownDivider} />

                            <button
                                className={styles.tileDropdownItem}
                                onClick={handleCloseAllTabs}
                            >
                                <IconTrash size={15} />
                                <span>Close All Tabs</span>
                            </button>
                        </div>
                    )}

                    <div
                        ref={editorAreaRef}
                        onDragOver={handleEditorDragOver}
                        onDragLeave={handleEditorDragLeave}
                        onDrop={handleEditorDrop}
                        className={`editor-container ${styles.editorContainerRelative}`}
                    >
                        {renderEditor()}

                        {activeDragId && editorDropZone && (
                            <div
                                className={`${styles.editorDropOverlay} ${
                                    editorDropZone === 'left'
                                        ? styles.editorDropLeft
                                        : editorDropZone === 'right'
                                          ? styles.editorDropRight
                                          : styles.editorDropCenter
                                }`}
                            />
                        )}
                    </div>

                    {linkingSourceId && (
                        <div
                            className={styles.bottomLinkingToast}
                            onClick={() => setLinkingSourceId(null)}
                        >
                            <span>
                                Tile linking active: Click another tab (or any
                                chapter/character/location in the left sidebar)
                                to pair with{' '}
                                <span className={styles.toastHighlight}>
                                    {getLinkingSourceName(linkingSourceId)}
                                </span>
                            </span>
                            <button
                                className={styles.cancelLinkBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLinkingSourceId(null);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
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
                                    scenes={storyScenes}
                                    sequences={storySequences}
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
                                    onCreateScenesAndSequences={async (
                                        newScenes,
                                        newSequences,
                                        mode = 'create',
                                        removedIds = []
                                    ) => {
                                        const chapter =
                                            getActiveTab()?.type === 'chapter'
                                                ? chapters.find(
                                                      (c) =>
                                                          c.id === activeTabId
                                                  )
                                                : null;
                                        if (!chapter) return;

                                        if (removedIds.length > 0) {
                                            for (const id of removedIds) {
                                                const isScene =
                                                    storyScenes.some(
                                                        (s: any) => s.id === id
                                                    );
                                                if (isScene) {
                                                    await rpc.request[
                                                        'db:delete-story-scene'
                                                    ](id);
                                                } else {
                                                    await rpc.request[
                                                        'db:delete-story-sequence'
                                                    ](id);
                                                }
                                            }
                                            setStoryScenes((prev: any) =>
                                                prev.filter(
                                                    (s: any) =>
                                                        !removedIds.includes(
                                                            s.id
                                                        )
                                                )
                                            );
                                            setStorySequences((prev) =>
                                                prev.filter(
                                                    (s) =>
                                                        !removedIds.includes(
                                                            s.id
                                                        )
                                                )
                                            );
                                        }

                                        if (mode === 'replace') {
                                            const chapterSceneIds = storyScenes
                                                .filter(
                                                    (s: any) =>
                                                        s.chapterId ===
                                                        chapter.id
                                                )
                                                .map((s: any) => s.id);
                                            const chapterSeqIds = storySequences
                                                .filter(
                                                    (s) =>
                                                        s.chapterId ===
                                                        chapter.id
                                                )
                                                .map((s) => s.id);
                                            for (const id of chapterSceneIds) {
                                                await rpc.request[
                                                    'db:delete-story-scene'
                                                ](id);
                                            }
                                            for (const id of chapterSeqIds) {
                                                await rpc.request[
                                                    'db:delete-story-sequence'
                                                ](id);
                                            }
                                            setStoryScenes((prev: any) =>
                                                prev.filter(
                                                    (s: any) =>
                                                        !chapterSceneIds.includes(
                                                            s.id
                                                        )
                                                )
                                            );
                                            setStorySequences((prev) =>
                                                prev.filter(
                                                    (s) =>
                                                        !chapterSeqIds.includes(
                                                            s.id
                                                        )
                                                )
                                            );
                                        }

                                        const existingDisplayOrders = [
                                            ...storyScenes
                                                .filter(
                                                    (s: any) =>
                                                        s.chapterId ===
                                                            chapter.id &&
                                                        !s.sequenceId &&
                                                        !removedIds.includes(
                                                            s.id
                                                        )
                                                )
                                                .map(
                                                    (s: any) => s.displayOrder
                                                ),
                                            ...storySequences
                                                .filter(
                                                    (s) =>
                                                        s.chapterId ===
                                                            chapter.id &&
                                                        !removedIds.includes(
                                                            s.id
                                                        )
                                                )
                                                .map((s) => s.displayOrder),
                                        ];
                                        let nextDisplayOrder =
                                            existingDisplayOrders.length > 0
                                                ? Math.max(
                                                      ...existingDisplayOrders
                                                  ) + 1
                                                : 0;

                                        const createdScenes: StoryScene[] = [];
                                        for (const sceneData of newScenes) {
                                            const cp = Array.isArray(
                                                sceneData.charactersPresent
                                            )
                                                ? JSON.stringify(
                                                      sceneData.charactersPresent
                                                  )
                                                : sceneData.charactersPresent ||
                                                  null;
                                            const ke = Array.isArray(
                                                sceneData.keyEvents
                                            )
                                                ? JSON.stringify(
                                                      sceneData.keyEvents
                                                  )
                                                : sceneData.keyEvents || null;

                                            if (
                                                mode === 'merge' &&
                                                sceneData.id
                                            ) {
                                                await rpc.request[
                                                    'db:update-story-scene'
                                                ]({
                                                    id: sceneData.id,
                                                    data: {
                                                        title:
                                                            sceneData.title ||
                                                            'New Scene',
                                                        summary:
                                                            sceneData.summary ||
                                                            null,
                                                        setting:
                                                            sceneData.setting ||
                                                            null,
                                                        charactersPresent: cp,
                                                        keyEvents: ke,
                                                        conflict:
                                                            sceneData.conflict ||
                                                            null,
                                                        duration:
                                                            sceneData.duration ||
                                                            null,
                                                    } as any,
                                                });
                                                const existing =
                                                    storyScenes.find(
                                                        (s: any) =>
                                                            s.id ===
                                                            sceneData.id
                                                    );
                                                if (existing) {
                                                    createdScenes.push({
                                                        ...existing,
                                                        title:
                                                            sceneData.title ||
                                                            existing.title,
                                                        summary:
                                                            sceneData.summary ??
                                                            existing.summary,
                                                        setting:
                                                            sceneData.setting ??
                                                            existing.setting,
                                                        charactersPresent:
                                                            cp ??
                                                            existing.charactersPresent,
                                                        keyEvents:
                                                            ke ??
                                                            existing.keyEvents,
                                                        conflict:
                                                            sceneData.conflict ??
                                                            existing.conflict,
                                                        duration:
                                                            sceneData.duration ??
                                                            existing.duration,
                                                    });
                                                }
                                                continue;
                                            }

                                            const scene = await rpc.request[
                                                'db:create-story-scene'
                                            ]({
                                                id: crypto.randomUUID(),
                                                projectId: chapter.projectId,
                                                chapterId: chapter.id,
                                                actId: chapter.actId,
                                                sequenceId: null,
                                                title:
                                                    sceneData.title ||
                                                    'New Scene',
                                                summary:
                                                    sceneData.summary || null,
                                                setting:
                                                    sceneData.setting || null,
                                                charactersPresent: cp,
                                                keyEvents: ke,
                                                conflict:
                                                    sceneData.conflict || null,
                                                duration:
                                                    sceneData.duration || null,
                                                status: 'outline',
                                                orderIndex:
                                                    createdScenes.length,
                                                displayOrder:
                                                    nextDisplayOrder++,
                                            } as any);
                                            if (scene)
                                                createdScenes.push(scene);
                                        }

                                        const createdSequences: StorySequence[] =
                                            [];
                                        for (const seqData of newSequences) {
                                            if (
                                                mode === 'merge' &&
                                                seqData.id
                                            ) {
                                                await rpc.request[
                                                    'db:update-story-sequence'
                                                ]({
                                                    id: seqData.id,
                                                    data: {
                                                        title:
                                                            seqData.title ||
                                                            'New Sequence',
                                                        summary:
                                                            seqData.summary ||
                                                            null,
                                                    } as any,
                                                });
                                                const existing =
                                                    storySequences.find(
                                                        (s) =>
                                                            s.id === seqData.id
                                                    );
                                                if (existing) {
                                                    createdSequences.push({
                                                        ...existing,
                                                        title:
                                                            seqData.title ||
                                                            existing.title,
                                                        summary:
                                                            seqData.summary ??
                                                            existing.summary,
                                                    });
                                                }
                                                continue;
                                            }

                                            const seq = await rpc.request[
                                                'db:create-story-sequence'
                                            ]({
                                                id: crypto.randomUUID(),
                                                projectId: chapter.projectId,
                                                chapterId: chapter.id,
                                                actId: chapter.actId,
                                                title:
                                                    seqData.title ||
                                                    'New Sequence',
                                                summary:
                                                    seqData.summary || null,
                                                status: 'outline',
                                                orderIndex:
                                                    createdSequences.length,
                                                displayOrder:
                                                    nextDisplayOrder++,
                                            } as any);
                                            if (seq) {
                                                createdSequences.push(seq);
                                                const sceneIndices =
                                                    seqData.sceneIndices || [];
                                                for (
                                                    let i = 0;
                                                    i < sceneIndices.length;
                                                    i++
                                                ) {
                                                    const sceneIdx =
                                                        sceneIndices[i];
                                                    if (
                                                        createdScenes[sceneIdx]
                                                    ) {
                                                        await rpc.request[
                                                            'db:update-story-scene'
                                                        ]({
                                                            id: createdScenes[
                                                                sceneIdx
                                                            ].id,
                                                            data: {
                                                                sequenceId:
                                                                    seq.id,
                                                                orderIndex: i,
                                                            } as any,
                                                        });
                                                        createdScenes[
                                                            sceneIdx
                                                        ] = {
                                                            ...createdScenes[
                                                                sceneIdx
                                                            ],
                                                            sequenceId: seq.id,
                                                            orderIndex: i,
                                                        };
                                                    }
                                                }
                                            }
                                        }

                                        if (mode === 'replace') {
                                            setStoryScenes(createdScenes);
                                            setStorySequences(createdSequences);
                                        } else {
                                            setStoryScenes((prev: any) => [
                                                ...prev,
                                                ...createdScenes,
                                            ]);
                                            setStorySequences((prev) => [
                                                ...prev,
                                                ...createdSequences,
                                            ]);
                                        }
                                    }}
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
                <WorkshopDialog
                    open={true}
                    onClose={() => {}}
                    onSelectProject={handleSelectProject}
                    onProjectUpdated={refreshCurrentProject}
                />
            )}
            {activeDialog === 'projects' && (
                <WorkshopDialog
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
                        setIsScratchOpen(false);
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
            {extractDialogOpen && (
                <BulkExtractDialog
                    open={extractDialogOpen}
                    onClose={handleBulkExtractResult}
                    parsedEntries={extractedEntries}
                    resolvedTemplates={resolvedTemplateFields}
                    projectId={currentProject?.id || ''}
                />
            )}

            {showTimeline && currentProject && (
                <TimelineDialog
                    open={showTimeline}
                    onClose={() => setShowTimeline(false)}
                    projectId={currentProject.id}
                    tabs={openTabs}
                    onOpenEntity={(id, type) => {
                        handleOpenCompendiumEntry(id, type);
                    }}
                    onOpenChapter={(chapterId) => {
                        const chapter = chapters.find(
                            (c) => c.id === chapterId
                        );
                        if (chapter) void openChapterTab(chapter);
                    }}
                    manuscriptData={{
                        chapters: chapters,
                        plotThreads: plotThreads,
                        storyBeats: storyBeats,
                        storyActs: storyActs,
                    }}
                    compendiumData={{
                        characters: characters,
                        locations: locations,
                        organizations: organizations,
                        items: items,
                        loreEntries: loreEntries,
                    }}
                />
            )}

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
