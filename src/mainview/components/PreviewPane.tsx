import type { RefObject } from 'react';
import {
    IconBooks,
    IconFileText,
    IconLayoutSidebarLeftExpand,
    IconLayoutSidebarRightExpand,
    IconMaximize,
    IconMinimize,
    IconX,
} from '@tabler/icons-react';
import type { Chapter } from '../../shared/types/project';
import styles from '../App.module.css';
import { BookReader } from './BookReader';

export type ReaderMode = 'chapter' | 'book';

interface PreviewPaneProps {
    chapters: Chapter[];
    tabContents: Record<string, string>;
    activeChapterId: string | null;
    readerMode: ReaderMode;
    onReaderModeChange: (mode: ReaderMode) => void;
    onClose: () => void;
    previewPosition?: 'left' | 'right';
    onTogglePosition?: () => void;
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    bodyScrollRef?: RefObject<HTMLDivElement>;
    onBodyScroll?: () => void;
    width?: number | string;
    chapterLinks?: Record<string, string | null>;
    onUnlink?: (id: string) => void;
    onStartLinking?: (id: string, e?: React.MouseEvent) => void;
    linkingSourceId?: string | null;
    onTextChange?: (id: string, text: string) => void;
}

export function PreviewPane({
    chapters,
    tabContents,
    activeChapterId,
    readerMode,
    onReaderModeChange,
    onClose,
    previewPosition = 'right',
    onTogglePosition,
    isFullscreen = false,
    onToggleFullscreen,
    bodyScrollRef,
    onBodyScroll,
    width,
}: PreviewPaneProps) {
    const activeChapter = activeChapterId
        ? chapters.find((c) => c.id === activeChapterId)
        : undefined;
    const activeContent = activeChapter
        ? (tabContents[activeChapter.id] ?? activeChapter.content ?? '').trim()
        : '';

    const dynamicPreviewTitle = activeChapter?.title?.trim()
        ? `${activeChapter.title.trim()} Preview`
        : 'Chapter Preview';

    const isBookMode = readerMode === 'book';
    const nextMode: ReaderMode = isBookMode ? 'chapter' : 'book';
    const toggleLabel = isBookMode ? 'Chapter' : 'Book';
    const ToggleIcon = isBookMode ? IconFileText : IconBooks;

    const splitLabel =
        previewPosition === 'right' ? 'Left Split' : 'Right Split';
    const SplitIcon =
        previewPosition === 'right'
            ? IconLayoutSidebarLeftExpand
            : IconLayoutSidebarRightExpand;

    return (
        <div
            className={`preview-pane ${styles.previewRoot}`}
            style={{
                ...(width ? { width } : {}),
                backgroundColor: '#141416',
                color: '#e5e5e7',
            }}
        >
            {/* Top Header Row: "PREVIEW" + "LEFT SPLIT" / "RIGHT SPLIT" */}
            <div
                className={`${styles.paneHeaderRow} ${styles.previewTopHeaderRow}`}
                style={{ backgroundColor: '#141416' }}
            >
                <span className={styles.paneTitleBadge}>PREVIEW</span>

                {onTogglePosition && !isFullscreen && (
                    <button
                        type="button"
                        className={`tb-btn ${styles.paneHeaderActionBtn}`}
                        onClick={onTogglePosition}
                        title={splitLabel}
                    >
                        <SplitIcon size={12} stroke={2.2} />
                        <span>{splitLabel}</span>
                    </button>
                )}
            </div>

            {/* Second Row: BOOK/CHAPTER Toggle + Centered Title + Fullscreen + Close */}
            <div
                className={`preview-pane-header ${styles.previewControlsBar}`}
                style={{
                    backgroundColor: '#141416',
                    borderBottom: '1px solid #26262a',
                }}
            >
                <div className={styles.previewControlsLeft}>
                    <button
                        type="button"
                        className={`tb-btn active ${styles.previewModeBtn}`}
                        onClick={() => onReaderModeChange(nextMode)}
                        title={
                            isBookMode
                                ? 'Switch to Current Chapter'
                                : 'Switch to Full Book'
                        }
                    >
                        <ToggleIcon size={14} stroke={2} />
                        <span>{toggleLabel}</span>
                    </button>
                </div>

                <span
                    className={`preview-pane-title ${styles.previewCenterTitle}`}
                    title={dynamicPreviewTitle}
                    style={{ color: '#e5e5e7' }}
                >
                    {dynamicPreviewTitle}
                </span>

                <div className={styles.previewControlsRight}>
                    {onToggleFullscreen && (
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={onToggleFullscreen}
                            title={
                                isFullscreen
                                    ? 'Exit Full Screen'
                                    : 'Full Screen Preview'
                            }
                        >
                            {isFullscreen ? (
                                <IconMinimize size={16} stroke={2} />
                            ) : (
                                <IconMaximize size={16} stroke={2} />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={onClose}
                        title="Close Preview"
                    >
                        <IconX size={18} stroke={2} />
                    </button>
                </div>
            </div>

            {/* Preview Reading Surface Matched to Left Chapter Pane (#141416) */}
            <div
                ref={bodyScrollRef}
                onScroll={onBodyScroll}
                className={`preview-pane-body ${styles.previewReadingSurface}`}
                style={{
                    backgroundColor: '#141416',
                    color: '#e5e5e7',
                }}
            >
                {readerMode === 'book' ? (
                    <BookReader
                        chapters={chapters}
                        tabContents={tabContents}
                        activeChapterId={activeChapterId}
                    />
                ) : !activeChapter ? (
                    <div
                        className="empty-editor"
                        style={{ backgroundColor: '#141416' }}
                    >
                        <p>No chapter selected.</p>
                    </div>
                ) : !activeContent ? (
                    <div
                        className="empty-editor"
                        style={{ backgroundColor: '#141416' }}
                    >
                        <p>This chapter has no content yet.</p>
                    </div>
                ) : (
                    <div
                        className="book-reader"
                        style={{
                            backgroundColor: '#141416',
                            color: '#e5e5e7',
                        }}
                    >
                        <section
                            className="book-reader-chapter"
                            data-chapter-id={activeChapter.id}
                            style={{
                                backgroundColor: '#141416',
                                color: '#e5e5e7',
                            }}
                        >
                            <h1>{activeChapter.title}</h1>
                            <div
                                style={{ color: '#e5e5e7' }}
                                dangerouslySetInnerHTML={{
                                    __html:
                                        tabContents[activeChapter.id] ??
                                        activeChapter.content ??
                                        '',
                                }}
                            />
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PreviewPane;
