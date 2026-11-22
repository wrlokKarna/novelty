import type { RefObject } from 'react';
import {
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
    customTitle?: string;
    customContent?: string;
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
    customTitle,
    customContent,
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
    const isCustomMode = typeof customTitle === 'string';
    const activeChapter =
        !isCustomMode && activeChapterId
            ? chapters.find((c) => c.id === activeChapterId)
            : undefined;
    const activeContent = isCustomMode
        ? (customContent ?? '').trim()
        : activeChapter
          ? (
                tabContents[activeChapter.id] ??
                activeChapter.content ??
                ''
            ).trim()
          : '';

    const chapterTabLabel = isCustomMode
        ? customTitle
        : activeChapter?.title?.trim()
          ? activeChapter.title.trim()
          : 'Chapter';

    const splitTooltip =
        previewPosition === 'right'
            ? 'Move Preview Left'
            : 'Move Preview Right';
    const SplitIcon =
        previewPosition === 'right'
            ? IconLayoutSidebarRightExpand
            : IconLayoutSidebarLeftExpand;

    return (
        <div
            className={`preview-pane ${styles.previewRoot}`}
            style={{
                ...(width ? { width } : {}),
                backgroundColor: '#141416',
                color: '#e5e5e7',
            }}
        >
            {/* Pinned Sticky Top Bar: Corner PREVIEW | Centered Book & Chapter/Scratchpad Name | Right Action Icons */}
            <div className={styles.unifiedSplitHeaderRow}>
                <span
                    className={styles.paneTitleBadge}
                    style={{
                        lineHeight: 1.2,
                        paddingBottom: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}
                >
                    PREVIEW
                </span>

                <div className={styles.previewCenterTabsGroup}>
                    <button
                        type="button"
                        className={`${styles.previewUnderlineTab} ${
                            readerMode === 'book'
                                ? styles.previewUnderlineTabActive
                                : ''
                        }`}
                        onClick={() => onReaderModeChange('book')}
                        title="Full Book Preview"
                    >
                        Book
                    </button>

                    <button
                        type="button"
                        className={`${styles.previewUnderlineTab} ${
                            readerMode === 'chapter'
                                ? styles.previewUnderlineTabActive
                                : ''
                        }`}
                        onClick={() => onReaderModeChange('chapter')}
                        title={chapterTabLabel}
                    >
                        {chapterTabLabel}
                    </button>
                </div>

                <div className={styles.splitRightActionCluster}>
                    {onTogglePosition && !isFullscreen && (
                        <button
                            type="button"
                            className={styles.previewHeaderIconBtn}
                            onClick={onTogglePosition}
                            title={splitTooltip}
                        >
                            <SplitIcon size={18} stroke={2} />
                        </button>
                    )}
                    {onToggleFullscreen && (
                        <button
                            type="button"
                            className={styles.previewHeaderIconBtn}
                            onClick={onToggleFullscreen}
                            title={
                                isFullscreen
                                    ? 'Exit Full Screen'
                                    : 'Full Screen Preview'
                            }
                        >
                            {isFullscreen ? (
                                <IconMinimize size={18} stroke={2} />
                            ) : (
                                <IconMaximize size={18} stroke={2} />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.previewHeaderIconBtn}
                        onClick={onClose}
                        title="Close Preview"
                    >
                        <IconX size={18} stroke={2} />
                    </button>
                </div>
            </div>

            {/* Preview Reading Surface (#141416) */}
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
                ) : !isCustomMode && !activeChapter ? (
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
                        <p>
                            {isCustomMode
                                ? 'Scratchpad is empty.'
                                : 'This chapter has no content yet.'}
                        </p>
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
                            data-chapter-id={activeChapter?.id ?? 'scratch'}
                            style={{
                                backgroundColor: '#141416',
                                color: '#e5e5e7',
                            }}
                        >
                            <h1>{chapterTabLabel}</h1>
                            <div
                                style={{ color: '#e5e5e7' }}
                                dangerouslySetInnerHTML={{
                                    __html: isCustomMode
                                        ? (customContent ?? '')
                                        : (tabContents[activeChapter!.id] ??
                                          activeChapter!.content ??
                                          ''),
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
