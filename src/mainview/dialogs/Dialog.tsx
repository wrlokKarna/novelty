import {
    useEffect,
    useRef,
    useState,
    type KeyboardEventHandler,
    type ReactNode,
    type Ref,
} from 'react';
import {
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
    IconMaximize,
    IconMinimize,
    IconSearch,
} from '@tabler/icons-react';
import styles from './Dialog.module.css';
import {
    DialogSidebarContext,
    type SidebarMode,
} from '../components/DialogSidebarContext';
import AppIcon from '../components/AppIcon';

export interface DialogSearch {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    inputRef?: Ref<HTMLInputElement>;
}

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    large?: boolean;
    children: ReactNode;
    id?: string;
    className?: string;
    hasSidebar?: boolean;
    search?: DialogSearch;
    onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
}

export default function Dialog({
    open,
    onClose,
    title,
    large,
    children,
    id,
    className,
    hasSidebar,
    search,
    onKeyDown,
}: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const localSearchInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = search?.inputRef ?? localSearchInputRef;
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded');
    const [expanded, setExpanded] = useState(false);

    const cycleSidebar = () =>
        setSidebarMode((prev) =>
            prev === 'expanded'
                ? 'collapsed'
                : prev === 'collapsed'
                  ? 'hidden'
                  : 'expanded'
        );

    useEffect(() => {
        if (open) {
            setSidebarMode('expanded');
            setExpanded(false);
        }
    }, [open]);

    const toggleExpanded = () => setExpanded((prev) => !prev);

    const sidebarLabel =
        sidebarMode === 'expanded'
            ? 'Collapse sidebar'
            : sidebarMode === 'collapsed'
              ? 'Hide sidebar'
              : 'Expand sidebar';

    useEffect(() => {
        if (open) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [open]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
                return;
            }

            if (
                open &&
                search &&
                (e.ctrlKey || e.metaKey) &&
                e.key.toLowerCase() === 'k'
            ) {
                e.preventDefault();
                e.stopPropagation();
                const input =
                    (typeof searchInputRef === 'object' &&
                        searchInputRef &&
                        'current' in searchInputRef &&
                        searchInputRef.current) ||
                    null;
                if (input) {
                    input.focus();
                    input.select?.();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose, search, searchInputRef]);

    return (
        <dialog
            ref={dialogRef}
            id={id}
            className={`${styles.dialog} ${large ? styles.large : ''} ${expanded ? styles.expanded : ''} ${className ?? ''}`}
            onClose={onClose}
            onKeyDown={onKeyDown}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            {' '}
            <div className={`${styles.dialogWrapper} ${className ?? ''}`}>
                <div
                    className={styles.header}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.headerLeft}>
                        {hasSidebar && (
                            <button
                                className={styles.sidebarToggleBtn}
                                onClick={cycleSidebar}
                                aria-label={sidebarLabel}
                                aria-expanded={sidebarMode === 'expanded'}
                                title={sidebarLabel}
                            >
                                <span
                                    className={styles.toggleIconBox}
                                    aria-hidden
                                >
                                    {sidebarMode === 'hidden' ? (
                                        <IconLayoutSidebarLeftExpand
                                            className={`${styles.iconLayer} ${styles.expandIcon}`}
                                            size={24}
                                            stroke={2}
                                        />
                                    ) : (
                                        <>
                                            <AppIcon
                                                className={`${styles.iconLayer} ${styles.appIcon}`}
                                                aria-hidden
                                            />
                                            <IconLayoutSidebarLeftCollapse
                                                className={`${styles.iconLayer} ${styles.actionIcon}`}
                                                size={24}
                                                stroke={2}
                                            />
                                        </>
                                    )}
                                </span>
                            </button>
                        )}
                        <h2>{title}</h2>
                    </div>
                    <div className={styles.headerRight}>
                        {search && (
                            <div className={styles.headerSearchWrapper}>
                                <div className={styles.headerSearch}>
                                    <IconSearch size={16} stroke={2} />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        aria-label={
                                            search.placeholder ?? 'Search'
                                        }
                                        placeholder={
                                            search.placeholder ?? 'Search...'
                                        }
                                        value={search.value}
                                        onChange={(e) =>
                                            search.onChange(e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            className={styles.expandBtn}
                            onClick={toggleExpanded}
                            aria-label={
                                expanded ? 'Restore dialog' : 'Expand dialog'
                            }
                            title={
                                expanded ? 'Restore dialog' : 'Expand dialog'
                            }
                        >
                            {expanded ? (
                                <IconMinimize size={20} stroke={2} />
                            ) : (
                                <IconMaximize size={20} stroke={2} />
                            )}
                        </button>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={20}
                                height={20}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path
                                    stroke="none"
                                    d="M0 0h24v24H0z"
                                    fill="none"
                                />
                                <path d="M18 6l-12 12" />
                                <path d="M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div
                    className={`${styles.body} ${className ?? ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <DialogSidebarContext.Provider
                        value={{ mode: sidebarMode, cycle: cycleSidebar }}
                    >
                        {children}
                    </DialogSidebarContext.Provider>
                </div>
            </div>
        </dialog>
    );
}
