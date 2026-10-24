import styles from './TitleBar.module.css';
import appStyles from '../../App.module.css';
import { useState, useEffect, useRef } from 'react';
import { useRPC } from '../../contexts/RPCContext';
import AppIcon from '../../components/AppIcon';
import { QuickAccess } from './QuickAccess';
import type { QuickAccessItem } from './quickAccessIndex';
import {
    IconChevronDown,
    IconFolder,
    IconLayoutSidebar,
    IconLayoutSidebarFilled,
    IconLayoutSidebarRight,
    IconLayoutSidebarRightFilled,
    IconMinus,
    IconSearch,
    IconSettings,
    IconSquare,
    IconSquares,
    IconTimelineEventText,
    IconX,
} from '@tabler/icons-react';

type MenuItem = { label: string; shortcut?: string } | 'sep';

const MENUS: Record<string, MenuItem[]> = {
    File: [
        { label: 'New', shortcut: 'Ctrl+N' },
        { label: 'Open...', shortcut: 'Ctrl+O' },
        { label: 'Save', shortcut: 'Ctrl+S' },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
        'sep',
        { label: 'Exit', shortcut: 'Alt+F4' },
    ],
    Edit: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Y' },
        'sep',
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
    ],
    View: [
        { label: 'Toggle Explorer' },
        { label: 'Toggle Chat' },
        'sep',
        { label: 'Zoom In', shortcut: 'Ctrl+Plus' },
        { label: 'Zoom Out', shortcut: 'Ctrl+-' },
    ],
    Help: [
        { label: 'Documentation' },
        { label: 'Keyboard Shortcuts' },
        'sep',
        { label: 'About Novelty' },
    ],
};

export function TitleBar({
    isCollapsed,
    isChatCollapsed,
    setIsCollapsed,
    setIsChatCollapsed,
    onProjectsClick,
    onSettingsClick,
    onTitleClick,
    onTimelineClick,
    projectName,
    quickAccessItems,
    onQuickAccessSelect,
    extras,
}: {
    isCollapsed: boolean;
    isChatCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    setIsChatCollapsed: (isChatCollapsed: boolean) => void;
    onProjectsClick: () => void;
    onSettingsClick: () => void;
    onTitleClick: () => void;
    onTimelineClick: () => void;
    projectName: string | null;
    quickAccessItems: QuickAccessItem[];
    onQuickAccessSelect: (item: QuickAccessItem) => void;
    extras?: React.ReactNode;
}) {
    const rpc = useRPC();

    const [isMaximized, setIsMaximized] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const menuBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        rpc.addMessageListener('window-state-changed', (payload) => {
            const isMax = payload.valueOf();
            setIsMaximized(isMax);
        });

        (async () => {
            const maximized = await rpc.request['window:is-maximized']();
            setIsMaximized(maximized);
        })();
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                menuBarRef.current &&
                !menuBarRef.current.contains(e.target as Node)
            ) {
                setActiveMenu(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        function handleShortcut(e: KeyboardEvent) {
            if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) {
                return;
            }

            if (isSearchOpen) {
                e.preventDefault();
                setIsSearchOpen(false);
                return;
            }

            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return;
            }

            e.preventDefault();
            setIsSearchOpen(true);
        }
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [isSearchOpen]);

    return (
        <>
            <div
                className={`${styles.titleBar} electrobun-webkit-app-region-drag`}
            >
                <div
                    className={`${styles.applicationMenu} electrobun-webkit-app-region-no-drag`}
                >
                    <button
                        className={styles.appIconBtn}
                        title="Novelty"
                        aria-label="Novelty"
                    >
                        <AppIcon />
                    </button>
                    <div className={styles.menuBar} ref={menuBarRef}>
                        {Object.entries(MENUS).map(([label, items]) => (
                            <div key={label} className={styles.menuWrapper}>
                                <button
                                    className={`${styles.menuBtn} ${
                                        activeMenu === label
                                            ? styles.menuBtnOpen
                                            : ''
                                    }`}
                                    onClick={() =>
                                        setActiveMenu(
                                            activeMenu === label ? null : label
                                        )
                                    }
                                    onMouseEnter={() =>
                                        activeMenu !== null &&
                                        activeMenu !== label
                                            ? setActiveMenu(label)
                                            : undefined
                                    }
                                >
                                    {label}
                                </button>
                                {activeMenu === label && (
                                    <div className={styles.menuDropdown}>
                                        {items.map((item, i) =>
                                            item === 'sep' ? (
                                                <div
                                                    key={i}
                                                    className={
                                                        styles.menuDivider
                                                    }
                                                />
                                            ) : (
                                                <button
                                                    key={i}
                                                    className={styles.menuItem}
                                                    onClick={() =>
                                                        setActiveMenu(null)
                                                    }
                                                >
                                                    <span>{item.label}</span>
                                                    {item.shortcut && (
                                                        <span
                                                            className={
                                                                styles.menuShortcut
                                                            }
                                                        >
                                                            {item.shortcut}
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    className={`${styles.titleBarCenterWrapper} ${
                        isSearchOpen ? styles.active : ''
                    }`}
                >
                    <div className={styles.titleBarCenter}>
                        <button
                            className={styles.projectBtn}
                            onClick={onProjectsClick}
                            title="Open Projects"
                            aria-label="Open Projects"
                        >
                            <IconFolder stroke={2} />
                        </button>
                        <div className={styles.centerDivider} />

                        <button
                            className={styles.projectTitleBtn}
                            onClick={onTitleClick}
                            title="Open Project Manager"
                        >
                            <span>{projectName || 'Novelty'}</span>
                            <IconChevronDown
                                className={styles.chevron}
                                size={14}
                                stroke={2}
                            />
                        </button>

                        <div className={styles.centerDivider} />

                        <button
                            className={styles.searchBtn}
                            onClick={() => setIsSearchOpen(true)}
                            title="Quick Access (Ctrl+K)"
                            aria-label="Quick Access"
                        >
                            <IconSearch stroke={2} />
                        </button>
                    </div>

                    {isSearchOpen && (
                        <QuickAccess
                            items={quickAccessItems}
                            onSelect={onQuickAccessSelect}
                            onClose={() => setIsSearchOpen(false)}
                        />
                    )}
                </div>

                <div
                    className={`${styles.titleBarRight} electrobun-webkit-app-region-no-drag`}
                >
                    {extras && <div className="title-bar-extras">{extras}</div>}
                    <div className={styles.leftButtons}>
                        <button
                            className={`${appStyles.iconBtn} ${styles.hidden}`}
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            title={`${isCollapsed ? 'Open' : 'Close'} Explorer`}
                        >
                            {isCollapsed ? (
                                <IconLayoutSidebar stroke={2} />
                            ) : (
                                <IconLayoutSidebarFilled />
                            )}
                        </button>
                        <button
                            className={`${appStyles.iconBtn} ${styles.hidden}`}
                            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                            title={`${isChatCollapsed ? 'Open' : 'Close'} Chat`}
                        >
                            {isChatCollapsed ? (
                                <IconLayoutSidebarRight stroke={2} />
                            ) : (
                                <IconLayoutSidebarRightFilled />
                            )}
                        </button>
                        <button
                            className={appStyles.iconBtn}
                            onClick={onTimelineClick}
                            title="Timeline"
                            aria-label="Timeline"
                        >
                            <IconTimelineEventText stroke={2} />
                        </button>
                        <button
                            className={appStyles.iconBtn}
                            onClick={onSettingsClick}
                            title="Open settings"
                            aria-label="Open settings"
                        >
                            <IconSettings stroke={2} />
                        </button>
                    </div>
                    <div className={styles.windowControls}>
                        <button
                            className={styles.windowBtn}
                            onClick={() => rpc.send['minimize-window']()}
                            title="Minimize"
                            aria-label="Minimize"
                        >
                            <IconMinus stroke={2} />
                        </button>
                        <button
                            className={styles.windowBtn}
                            onClick={() => rpc.send['maximize-window']()}
                            title={isMaximized ? 'Restore' : 'Maximize'}
                            aria-label={isMaximized ? 'Restore' : 'Maximize'}
                        >
                            {isMaximized ? (
                                <IconSquares stroke={2} />
                            ) : (
                                <IconSquare stroke={2} />
                            )}
                        </button>
                        <button
                            className={`${styles.windowBtn} ${styles.windowClose}`}
                            onClick={() => rpc.send['close-window']()}
                            title="Close"
                            aria-label="Close"
                        >
                            <IconX stroke={2} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
