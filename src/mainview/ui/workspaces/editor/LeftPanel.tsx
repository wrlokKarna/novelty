import React, { useMemo, useState, useRef, useEffect } from 'react';
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
import {
    Chapter,
    Character,
    Item,
    Location,
    LoreEntry,
    Organization,
} from '../../../types';

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
} as const;
const MANUSCRIPT_CONFIG = {
    chapters: { label: 'Chapters', icon: IconFiles, dataKey: 'chapters' },
} as const;
const EXPLORER_CONFIG = {
    ...MANUSCRIPT_CONFIG,
    ...COMPENDIUM_CONFIG,
} as const;

//const ALL_TABS = { ...MANUSCRIPT_CONFIG, ...COMPENDIUM_CONFIG };

export type EditorPanelTabs = 'manuscript' | 'compendium';

export type CompendiumCategory = keyof typeof COMPENDIUM_CONFIG;
export type ExplorerTabCategories = keyof typeof EXPLORER_CONFIG;

type Props = {
    isCollapsed: boolean;
    isLeftHovered: boolean;
    enableAutoExpandLeft: boolean | undefined;
    mode: EditorPanelTabs;
    explorerTab: CompendiumCategory | 'chapters';
    chapters: Chapter[];
    characters: Character[];
    locations: Location[];
    organizations: Organization[];
    items: Item[];
    loreEntries: LoreEntry[];
    chaptersLoading?: boolean;
    activeTabId: string | null;
    onModeChange: (mode: EditorPanelTabs) => void;
    onSubTabChange: (tab: CompendiumCategory | 'chapters') => void;
    onCollapseToggle: () => void;
    onAutoExpandToggle: () => void;
    handleNewChapter: () => void;
    handleNewCompendiumEntry: (cat: CompendiumCategory) => void;
    handleEditTemplate: () => void;
    openChapter: (c: Chapter) => void;
    openCompendiumEntry: (id: string, cat: CompendiumCategory) => void;
    deleteChapter: (c: Chapter) => void;
    renameChapter: (id: string, title: string) => void;
    deleteCompendiumEntry: (id: string, cat: CompendiumCategory) => void;
    isDragging: string | null;
    onDragStart: (direction: 'left' | 'right', x: number) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    width: number;
};

export default function LeftPanel({
    isCollapsed,
    isLeftHovered,
    enableAutoExpandLeft,
    mode,
    activeTabId,
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
    renameChapter,
    deleteCompendiumEntry,
    isDragging,
    onDragStart,
    onMouseEnter,
    onMouseLeave,
    width,
}: Props) {
    const [editingChapterId, setEditingChapterId] = useState<string | null>(
        null
    );
    const [editValue, setEditValue] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingChapterId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingChapterId]);

    const handleStartRename = (id: string, currentTitle: string) => {
        setEditingChapterId(id);
        setEditValue(currentTitle);
    };

    const handleCommitRename = () => {
        if (editingChapterId && editValue.trim()) {
            renameChapter(editingChapterId, editValue.trim());
        }
        setEditingChapterId(null);
        setEditValue('');
    };

    const handleCancelRename = () => {
        setEditingChapterId(null);
        setEditValue('');
    };

    const isHoverExpanding = isLeftHovered && enableAutoExpandLeft;
    const isExpanded = !isCollapsed || isHoverExpanding;

    const currentLabel =
        explorerTab === 'chapters'
            ? 'Chapters'
            : COMPENDIUM_CONFIG[explorerTab as CompendiumCategory].label;

    //const currentTabConfig = ALL_TABS[explorerTab];

    const currentData = useMemo(() => {
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

    const handleNewAction = () => {
        if (mode === 'manuscript') handleNewChapter();
        else handleNewCompendiumEntry(explorerTab as CompendiumCategory);
    };

    return (
        <>
            <aside
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                // 2. Apply width style here so resizing actually moves the container
                style={{ width: width }}
                className={`app-panel app-panel-left ${isCollapsed ? 'collapsed' : ''} ${isCollapsed && isLeftHovered && enableAutoExpandLeft ? 'float' : ''}`}
            >
                {!isExpanded ? (
                    <div
                        className="sidebar-collapsed-pill"
                        onClick={onCollapseToggle}
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingBottom: '120px',
                            cursor: 'pointer',
                            backgroundColor: '#1e293b',
                            color: '#94a3b8',
                        }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        <IconChevronRight size={20} />
                    </div>
                ) : (
                    <>
                        {/* HEADER: Title + Edit Template */}
                        <div
                            className="app-panel-header"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <h4 style={{ margin: 0 }}>{currentLabel}</h4>
                                {mode === 'compendium' && (
                                    <button
                                        onClick={handleEditTemplate}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            height: '20px',
                                        }}
                                        title="Edit Template"
                                    >
                                        <IconPencilMinus size={20} stroke={2} />
                                    </button>
                                )}
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '4px',
                                    alignItems: 'center',
                                }}
                            >
                                <button
                                    className="icon-btn"
                                    onClick={onAutoExpandToggle}
                                >
                                    {enableAutoExpandLeft ? (
                                        <IconPinFilled stroke={2} />
                                    ) : (
                                        <IconPin stroke={2} />
                                    )}
                                </button>
                                <button
                                    className="icon-btn"
                                    onClick={onCollapseToggle}
                                >
                                    {isCollapsed ? (
                                        <IconChevronRight size={24} />
                                    ) : (
                                        <IconChevronLeft size={24} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div
                            className="app-panel-content"
                            style={{ display: 'grid', overflow: 'hidden' }}
                        >
                            <div
                                style={{
                                    gridArea: '1 / 1 / 2 / 2',
                                    position: 'relative',
                                }}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={explorerTab}
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 5 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        {chaptersLoading ? (
                                            <div className="loading">
                                                Loading...
                                            </div>
                                        ) : currentData.length === 0 ? (
                                            /* EMPTY STATE */
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minHeight: '200px',
                                                    gap: '12px',
                                                    color: '#94a3b8',
                                                }}
                                            >
                                                <p style={{ fontSize: '16px' }}>
                                                    No{' '}
                                                    {currentLabel.toLowerCase()}{' '}
                                                    yet
                                                </p>
                                                <button
                                                    onClick={handleNewAction}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e2e8f0',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <IconPlus size={16} /> New{' '}
                                                    {currentLabel}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {/* LIST ITEM: The "New" Button */}
                                                <div
                                                    className="chapter-item new-item-btn"
                                                    onClick={handleNewAction}
                                                    style={{
                                                        color: '#3b82f6',
                                                        fontWeight: '500',
                                                        cursor: 'pointer',
                                                        height: '32px',
                                                        border: 'dashed 1px',
                                                        margin: '12px 14px 8px 0',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: '8px',
                                                        }}
                                                    >
                                                        <IconPlus size={18} />{' '}
                                                        New {currentLabel}
                                                    </span>
                                                </div>

                                                {/* THE ACTUAL LIST */}
                                                <div className="chapter-list">
                                                    {currentData.map(
                                                        (
                                                            entry: any,
                                                            index: number
                                                        ) => {
                                                            const label =
                                                                entry.title ||
                                                                entry.name;
                                                            const isManuscript =
                                                                mode ===
                                                                'manuscript';

                                                            return (
                                                                <div
                                                                    key={
                                                                        entry.id
                                                                    }
                                                                    className={`chapter-item ${activeTabId === entry.id ? 'active' : ''}`}
                                                                    onClick={() =>
                                                                        isManuscript
                                                                            ? openChapter(
                                                                                  entry
                                                                              )
                                                                            : openCompendiumEntry(
                                                                                  entry.id,
                                                                                  explorerTab as CompendiumCategory
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
                                                                        {isManuscript &&
                                                                        editingChapterId ===
                                                                            entry.id ? (
                                                                            <input
                                                                                ref={
                                                                                    editInputRef
                                                                                }
                                                                                className="chapter-rename-input"
                                                                                value={
                                                                                    editValue
                                                                                }
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
                                                                                    )
                                                                                        handleCommitRename();
                                                                                    if (
                                                                                        e.key ===
                                                                                        'Escape'
                                                                                    )
                                                                                        handleCancelRename();
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

                                                                    {isManuscript &&
                                                                        editingChapterId !==
                                                                            entry.id && (
                                                                            <button
                                                                                className="listActionBtn edit-btn"
                                                                                title="Rename Chapter"
                                                                                onClick={(
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    handleStartRename(
                                                                                        entry.id,
                                                                                        entry.title ||
                                                                                            ''
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <IconPencil
                                                                                    size={
                                                                                        14
                                                                                    }
                                                                                />
                                                                            </button>
                                                                        )}

                                                                    <button
                                                                        className="listActionBtn delete-btn"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            isManuscript
                                                                                ? deleteChapter(
                                                                                      entry
                                                                                  )
                                                                                : deleteCompendiumEntry(
                                                                                      entry.id,
                                                                                      explorerTab as CompendiumCategory
                                                                                  );
                                                                        }}
                                                                    >
                                                                        <IconTrash
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>
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
                        </div>

                        {/* SUB-NAVIGATION (Compendium Icons) */}
                        <AnimatePresence>
                            {mode === 'compendium' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="compendium-sub-nav"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '8px',
                                    }}
                                >
                                    {Object.entries(COMPENDIUM_CONFIG).map(
                                        ([key, config]) => {
                                            const Icon = config.icon;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() =>
                                                        onSubTabChange(
                                                            key as CompendiumCategory
                                                        )
                                                    }
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color:
                                                            explorerTab === key
                                                                ? '#3b82f6'
                                                                : '#94a3b8',
                                                    }}
                                                >
                                                    <Icon size={22} />
                                                </button>
                                            );
                                        }
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* BOTTOM NAVIGATION (The Pill) */}
                        <div
                            className="bottom-nav-container"
                            style={{
                                position: 'relative',
                                padding: '4px',
                                display: 'flex',
                                backgroundColor: 'transparent',
                                borderRadius: '10px',
                                margin: '0px 20px 10px 10px',
                            }}
                        >
                            <motion.div
                                animate={{
                                    x: mode === 'manuscript' ? 0 : '100%',
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 350,
                                    damping: 30,
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '4px',
                                    left: '4px',
                                    width: 'calc(50% - 4px)',
                                    height: 'calc(100% - 8px)',
                                    backgroundColor: 'var(--accent-subtle)',
                                    borderRadius: '6px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    zIndex: 0,
                                    border: '1px solid var(--accent-focus)',
                                }}
                            />

                            <button
                                onClick={() => onModeChange('manuscript')}
                                style={tabBtnStyle(mode === 'manuscript')}
                            >
                                Manuscript
                            </button>
                            <button
                                onClick={() => onModeChange('compendium')}
                                style={tabBtnStyle(mode === 'compendium')}
                            >
                                Compendium
                            </button>
                        </div>
                    </>
                )}
            </aside>
            {/* DRAG HANDLE: Only visible when permanently expanded */}
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

const tabBtnStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    zIndex: 1,
    fontWeight: isActive ? 'bold' : 'normal',
    color: isActive ? 'var(--text-accent)' : '#64748b',
    fontSize: '14px',
});
