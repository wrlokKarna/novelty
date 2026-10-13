import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    large?: boolean;
    children: ReactNode;
    id?: string;
    className?: string;
}

export default function Dialog({
    open,
    onClose,
    title,
    large,
    children,
    id,
    className,
}: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

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
                    <h2>{title}</h2>
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
                    {children}
                </div>
            </div>
        </dialog>
    );
}
