import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import styles from './Dialog.module.css';
import {
    DialogSidebarContext,
    type SidebarMode,
} from '../components/DialogSidebarContext';
import AppIcon from '../components/AppIcon';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    large?: boolean;
    children: ReactNode;
    id?: string;
    className?: string;
    hasSidebar?: boolean;
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
}: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded');

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
        }
    }, [open]);

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
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    return (
        <dialog
            ref={dialogRef}
            id={id}
            className={`${styles.dialog} ${large ? styles.large : ''} ${className ?? ''}`}
            onClose={onClose}
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
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M18 6l-12 12" />
                            <path d="M6 6l12 12" />
                        </svg>
                    </button>
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
