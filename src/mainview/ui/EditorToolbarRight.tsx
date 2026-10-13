import { useState, useRef, useEffect } from 'react';
import {
    IconBook,
    IconPencil,
    IconDotsVertical,
    IconEye,
} from '@tabler/icons-react';
import styles from '../App.module.css';

export function EditorToolbarRight({
    isReadingMode,
    onToggleMode,
    isPreviewOpen,
    onTogglePreview,
    showPreview,
}: {
    isReadingMode: boolean;
    onToggleMode: () => void;
    isPreviewOpen?: boolean;
    onTogglePreview?: () => void;
    showPreview?: boolean;
}) {
    const [showOptions, setShowOptions] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setShowOptions(false);
            }
        }
        if (showOptions) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [showOptions]);

    const placeholderOptions = ['Option 1', 'Option 2', 'Option 3'];

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginLeft: 'auto',
            }}
        >
            {showPreview && (
                <button
                    className={styles.iconBtn}
                    onClick={onTogglePreview}
                    title={isPreviewOpen ? 'Close Preview' : 'Open Preview'}
                    style={
                        isPreviewOpen
                            ? { color: 'var(--accent, #4c9aff)' }
                            : undefined
                    }
                >
                    <IconEye size={18} stroke={2} />
                </button>
            )}

            <button
                className={styles.iconBtn}
                onClick={onToggleMode}
                title={
                    isReadingMode
                        ? 'Switch to Edit Mode'
                        : 'Switch to Reading Mode'
                }
            >
                {isReadingMode ? (
                    <IconPencil size={18} stroke={2} />
                ) : (
                    <IconBook size={18} stroke={2} />
                )}
            </button>

            <div
                style={{
                    width: '1px',
                    height: '20px',
                    backgroundColor: 'var(--editor-toolbar-border)',
                    margin: '0 4px',
                }}
            />

            <div ref={menuRef} style={{ position: 'relative' }}>
                <button
                    className={styles.iconBtn}
                    onClick={() => setShowOptions(!showOptions)}
                    title="More Options"
                >
                    <IconDotsVertical size={18} stroke={2} />
                </button>
                {showOptions && (
                    <div
                        style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '4px',
                            background: 'var(--editor-slash-bg)',
                            border: '1px solid var(--editor-slash-border)',
                            borderRadius: '6px',
                            padding: '4px',
                            zIndex: 20,
                            minWidth: '120px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        }}
                    >
                        {placeholderOptions.map((option) => (
                            <button
                                key={option}
                                className={styles.iconTextBtn}
                                onClick={() => setShowOptions(false)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '6px 8px',
                                    color: 'var(--editor-slash-text)',
                                    borderRadius: '4px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                        'var(--editor-slash-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                        'transparent';
                                }}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
