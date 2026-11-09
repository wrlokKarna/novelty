import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconFiles,
    IconBook,
    IconUsers,
    IconMapPin2,
    IconBuildings,
    IconSwords,
    IconPlus,
    IconTrash,
    IconPencil,
    IconChevronRight,
    IconChevronLeft,
    IconPin,
    IconPinFilled,
    IconPencilMinus,
} from '@tabler/icons-react';

import type { Chapter } from '../../../../shared/types/project';
import type {
    Character,
    CompendiumCategory,
    LoreEntry,
    Organization,
} from '../../../../shared/types/project/compendium';
import type { Item, Location } from '../../../../shared/types';
import { useTabScroll } from '@/mainview/components/UseTabScroll';
import styles from './LeftPanel.module.css';
import './LeftPanel.legacy-blue.css';

const COMPENDIUM_CONFIG = {
    character: { label: 'Characters', icon: IconUsers, dataKey: 'characters' },
    location: { label: 'Locations', icon: IconMapPin2, dataKey: 'locations' },
    organization: {
        label: 'Organizations',
        icon: IconBuildings,
        dataKey: 'organizations',
    },
    item: { label: 'Items', icon: IconSwords, dataKey: 'items' },
    lore: { label: 'Lore', icon: IconBook, dataKey: 'loreEntries' },
} as const satisfies Record<
    CompendiumCategory,
    { label: string; icon: unknown; dataKey: string }
>;
const MANUSCRIPT_CONFIG = {
    chapters: { label: 'Chapters', icon: IconFiles, dataKey: 'chapters' },
} as const;
export const EXPLORER_CONFIG = {
    ...MANUSCRIPT_CONFIG,
    ...COMPENDIUM_CONFIG,
} as const;

export type EditorPanelTabs = 'manuscript' | 'compendium';

export type ExplorerTabCategories = keyof typeof EXPLORER_CONFIG;

type ExplorerCategory = CompendiumCategory | 'chapters';

type ExplorerEntry = {
    id: string;
    name?: string;
    title?: string;
};

const getEntryLabel = (entry: ExplorerEntry): string =>
    entry.title ?? entry.name ?? 'Untitled';

type Props = {
    isCollapsed: boolean;
    isLeftHovered: boolean;
    enableAutoExpandLeft: boolean | undefined;
    mode: EditorPanelTabs;
    explorerTab: ExplorerCategory;
    chapters: Chapter[];
    characters: Character[];
    locations: Location[];
    organizations: Organization[];
    items: Item[];
    loreEntries: LoreEntry[];
    chaptersLoading?: boolean;
    activeTabId: string | null;
    openTabIds: ReadonlySet<string>;
    onModeChange: (mode: EditorPanelTabs) => void;
    onSubTabChange: (tab: ExplorerCategory) => void;
    onCollapseToggle: () => void;
    onAutoExpandToggle: () => void;
    handleNewChapter: () => void;
    handleNewCompendiumEntry: (cat: CompendiumCategory) => void;
    handleEditTemplate: () => void;
    openChapter: (c: Chapter) => void;
    openCompendiumEntry: (id: string, cat: CompendiumCategory) => void;
    deleteChapter: (c: Chapter) => void;
    renameEntry: (
        id: string,
        title: string,
        category: ExplorerCategory
    ) => void;
    deleteCompendiumEntry: (id: string, cat: CompendiumCategory) => void;
    isDragging: string | null;
    onDragStart: (direction: 'left' | 'right', x: number) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    width: number;
    legacyBluePanel: boolean;
};

const COLLAPSED_RAIL_WIDTH = 24;

export default function LeftPanel({
    isCollapsed,
    isLeftHovered,
    enableAutoExpandLeft,
    mode,
    activeTabId,
    openTabIds,
    explorerTab,
    chapters,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
    chaptersLoading,
    onModeChange,
    onSubTabChange,
    onCollapseToggle,
    onAutoExpandToggle,
    handleNewChapter,
    handleNewCompendiumEntry,
    handleEditTemplate,
    openChapter,
    openCompendiumEntry,
    deleteChapter,
    renameEntry,
    deleteCompendiumEntry,
    isDragging,
    onDragStart,
    onMouseEnter,
    onMouseLeave,
    width,
    legacyBluePanel,
}: Props) {
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const skipBlurCommitRef = useRef(false);

    useEffect(() => {
        if (editingEntryId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingEntryId]);

    useEffect(() => {
        setEditingEntryId(null);
        setEditValue('');
    }, [explorerTab]);

    const resetEditing = () => {
        setEditingEntryId(null);
        setEditValue('');
    };

    const handleStartRename = (id: string, currentTitle: string) => {
        skipBlurCommitRef.current = false;
        setEditingEntryId(id);
        setEditValue(currentTitle);
    };

    const handleCommitRename = () => {
        if (skipBlurCommitRef.current) {
            skipBlurCommitRef.current = false;
            resetEditing();
            return;
        }

        skipBlurCommitRef.current = true;
        if (editingEntryId) {
            const trimmed = editValue.trim();
            if (trimmed) {
                renameEntry(editingEntryId, trimmed, explorerTab);
            }
        }
        resetEditing();
    };

    const handleCancelRename = () => {
        skipBlurCommitRef.current = true;
        resetEditing();
    };

    const isHoverExpanding = Boolean(isLeftHovered && enableAutoExpandLeft);
    const isExpanded = !isCollapsed || isHoverExpanding;

    const asideWidth = isCollapsed ? COLLAPSED_RAIL_WIDTH : width;

    const currentLabel =
        explorerTab === 'chapters'
            ? MANUSCRIPT_CONFIG.chapters.label
            : COMPENDIUM_CONFIG[explorerTab].label;

    const currentData = useMemo<ExplorerEntry[]>(() => {
        switch (explorerTab) {
            case 'chapters':
                return chapters;
            case 'character':
                return characters;
            case 'location':
                return locations;
            case 'organization':
                return organizations;
            case 'item':
                return items;
            case 'lore':
                return loreEntries;
            default:
                return [];
        }
    }, [
        explorerTab,
        chapters,
        characters,
        locations,
        organizations,
        items,
        loreEntries,
    ]);

    const isLoading = explorerTab === 'chapters' && chaptersLoading;

    const handleNewAction = () => {
        if (explorerTab === 'chapters') handleNewChapter();
        else handleNewCompendiumEntry(explorerTab);
    };

    const handleOpenEntry = (entry: ExplorerEntry) => {
        if (explorerTab === 'chapters') openChapter(entry as Chapter);
        else openCompendiumEntry(entry.id, explorerTab);
    };

    const handleDeleteEntry = (entry: ExplorerEntry) => {
        const label = getEntryLabel(entry);
        /*if (!confirm(`Delete "${label}"?`)) return;*/
        if (explorerTab === 'chapters') deleteChapter(entry as Chapter);
        else deleteCompendiumEntry(entry.id, explorerTab);
    };

    const { tabRefs } = useTabScroll(activeTabId);

    return (
        <>
            <aside
                aria-label="Explorer sidebar"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{ width: asideWidth }}
                className={`app-panel app-panel-left ${isCollapsed ? 'collapsed' : ''} ${legacyBluePanel ? 'left-panel--legacy-blue' : ''}`}
            >
                <div
                    className={`${styles.appPanelLeft} ${isCollapsed && isHoverExpanding ? styles.float : ''}`}
                    style={
                        isCollapsed && isHoverExpanding
                            ? { width }
                            : { width: '100%', height: '100%' }
                    }
                >
                    {!isExpanded ? (
                        <>
                            <button
                                type="button"
                                className="sidebar-collapsed left"
                                onClick={onCollapseToggle}
                                title="Open sidebar"
                                aria-label="Open sidebar"
                            >
                                <IconChevronRight size={20} />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* HEADER: title, template edit, pin, collapse */}
                            <div className="app-panel-header">
                                <div className="panel-title-group">
                                    <h4>{currentLabel}</h4>
                                    {mode === 'compendium' && (
                                        <button
                                            type="button"
                                            className="panel-icon-btn"
                                            onClick={handleEditTemplate}
                                            title={`Edit ${currentLabel.toLowerCase()} template`}
                                            aria-label={`Edit ${currentLabel.toLowerCase()} template`}
                                        >
                                            <IconPencilMinus
                                                size={18}
                                                stroke={2}
                                            />
                                        </button>
                                    )}
                                </div>

                                <div className="panel-header-actions">
                                    <button
                                        type="button"
                                        className={`panel-icon-btn ${'panel-float-btn'} ${enableAutoExpandLeft ? '' : 'active'}`}
                                        onClick={onAutoExpandToggle}
                                        title={
                                            enableAutoExpandLeft
                                                ? 'Disable hover to expand'
                                                : 'Expand on hover when collapsed'
                                        }
                                        aria-label={
                                            enableAutoExpandLeft
                                                ? 'Disable hover to expand'
                                                : 'Expand on hover when collapsed'
                                        }
                                        aria-pressed={Boolean(
                                            enableAutoExpandLeft
                                        )}
                                    >
                                        {enableAutoExpandLeft ? (
                                            <IconPin size={18} stroke={2} />
                                        ) : (
                                            <IconPinFilled
                                                size={18}
                                                stroke={2}
                                            />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="panel-icon-btn"
                                        onClick={onCollapseToggle}
                                        title={
                                            isCollapsed
                                                ? 'Open sidebar'
                                                : 'Collapse sidebar'
                                        }
                                        aria-label={
                                            isCollapsed
                                                ? 'Open sidebar'
                                                : 'Collapse sidebar'
                                        }
                                    >
                                        {isCollapsed ? (
                                            <IconChevronRight size={20} />
                                        ) : (
                                            <IconChevronLeft size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT AREA */}
                            <div className="app-panel-content">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div
                                        key={explorerTab}
                                        className="explorer-pane"
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 5 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {isLoading ? (
                                            <div className="panel-state">
                                                Loading...
                                            </div>
                                        ) : currentData.length === 0 ? (
                                            <div className="panel-empty">
                                                <p>
                                                    No{' '}
                                                    {currentLabel.toLowerCase()}{' '}
                                                    yet
                                                </p>
                                                <button
                                                    type="button"
                                                    className="panel-empty-action"
                                                    onClick={handleNewAction}
                                                >
                                                    <IconPlus size={16} /> New{' '}
                                                    {currentLabel}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="explorer-item new-item-btn"
                                                    onClick={handleNewAction}
                                                >
                                                    <span className="left-side">
                                                        <IconPlus size={18} />
                                                        <span>
                                                            New {currentLabel}
                                                        </span>
                                                    </span>
                                                </button>

                                                <div className="explorer-list">
                                                    {currentData.map(
                                                        (entry, index) => {
                                                            const label =
                                                                getEntryLabel(
                                                                    entry
                                                                );
                                                            const isManuscript =
                                                                explorerTab ===
                                                                'chapters';
                                                            const isEditing =
                                                                editingEntryId ===
                                                                entry.id;
                                                            const isActive =
                                                                activeTabId ===
                                                                entry.id;
                                                            const isOpen =
                                                                openTabIds.has(
                                                                    entry.id
                                                                );

                                                            return (
                                                                <div
                                                                    key={
                                                                        entry.id
                                                                    }
                                                                    ref={(
                                                                        ele
                                                                    ) => {
                                                                        tabRefs.current[
                                                                            entry.id
                                                                        ] = ele;
                                                                    }}
                                                                    className={`explorer-item ${isActive ? 'active' : ''} ${isOpen && !isActive ? 'is-open' : ''}`}
                                                                    onClick={() =>
                                                                        handleOpenEntry(
                                                                            entry
                                                                        )
                                                                    }
                                                                >
                                                                    <div className="left-side">
                                                                        {isManuscript && (
                                                                            <span className="item-index">
                                                                                {index +
                                                                                    1}

                                                                                .
                                                                            </span>
                                                                        )}
                                                                        {isEditing ? (
                                                                            <input
                                                                                ref={
                                                                                    editInputRef
                                                                                }
                                                                                className="explorer-rename-input"
                                                                                value={
                                                                                    editValue
                                                                                }
                                                                                aria-label={`Rename ${label}`}
                                                                                onChange={(
                                                                                    e
                                                                                ) =>
                                                                                    setEditValue(
                                                                                        e
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                onKeyDown={(
                                                                                    e
                                                                                ) => {
                                                                                    if (
                                                                                        e.key ===
                                                                                        'Enter'
                                                                                    ) {
                                                                                        e.preventDefault();
                                                                                        handleCommitRename();
                                                                                    } else if (
                                                                                        e.key ===
                                                                                        'Escape'
                                                                                    ) {
                                                                                        e.preventDefault();
                                                                                        handleCancelRename();
                                                                                    }
                                                                                    e.stopPropagation();
                                                                                }}
                                                                                onBlur={
                                                                                    handleCommitRename
                                                                                }
                                                                                onClick={(
                                                                                    e
                                                                                ) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                            />
                                                                        ) : (
                                                                            <span className="item-label">
                                                                                {
                                                                                    label
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {!isEditing && (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                className="listActionBtn edit-btn"
                                                                                title={`Rename ${label}`}
                                                                                aria-label={`Rename ${label}`}
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    handleStartRename(
                                                                                        entry.id,
                                                                                        label
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <IconPencil
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="listActionBtn delete-btn"
                                                                                title={`Delete ${label}`}
                                                                                aria-label={`Delete ${label}`}
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteEntry(
                                                                                        entry
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <IconTrash
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* SUB-NAVIGATION (Compendium categories) */}
                            <AnimatePresence initial={false}>
                                {mode === 'compendium' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="compendium-sub-nav"
                                        role="tablist"
                                        aria-label="Compendium categories"
                                    >
                                        {Object.entries(COMPENDIUM_CONFIG).map(
                                            ([key, config]) => {
                                                const Icon = config.icon;
                                                const isActive =
                                                    explorerTab === key;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={key}
                                                        className={`compendium-sub-nav-btn ${isActive ? 'active' : ''}`}
                                                        onClick={() =>
                                                            onSubTabChange(
                                                                key as CompendiumCategory
                                                            )
                                                        }
                                                        title={config.label}
                                                        aria-label={
                                                            config.label
                                                        }
                                                        role="tab"
                                                        aria-selected={isActive}
                                                    >
                                                        <Icon
                                                            size={20}
                                                            stroke={1.8}
                                                        />
                                                    </button>
                                                );
                                            }
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* BOTTOM NAVIGATION (mode pill) */}
                            <div className="bottom-nav-container">
                                <motion.div
                                    className="bottom-nav-indicator"
                                    animate={{
                                        x: mode === 'manuscript' ? 0 : '100%',
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 350,
                                        damping: 30,
                                    }}
                                />

                                <button
                                    type="button"
                                    className={`bottom-nav-btn ${mode === 'manuscript' ? 'active' : ''}`}
                                    onClick={() => onModeChange('manuscript')}
                                    aria-pressed={mode === 'manuscript'}
                                >
                                    Manuscript
                                </button>
                                <button
                                    type="button"
                                    className={`bottom-nav-btn ${mode === 'compendium' ? 'active' : ''}`}
                                    onClick={() => onModeChange('compendium')}
                                    aria-pressed={mode === 'compendium'}
                                >
                                    Compendium
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </aside>
            {/* DRAG HANDLE: only visible when permanently expanded */}
            {!isCollapsed && (
                <div
                    className={`drag-handle ${isDragging === 'left' ? 'active' : ''}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onDragStart('left', e.clientX);
                    }}
                />
            )}
        </>
    );
}
