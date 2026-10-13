import { IconBooks, IconFileText, IconX } from '@tabler/icons-react';
import type { Chapter } from '../types/index';
import { BookReader } from './BookReader';
import styles from '../App.module.css';

export type ReaderMode = 'chapter' | 'book';

interface PreviewPaneProps {
    chapters: Chapter[];
    tabContents: Record<string, string>;
    activeChapterId: string | null;
    readerMode: ReaderMode;
    onReaderModeChange: (mode: ReaderMode) => void;
    onClose: () => void;
    width: number;
}

export function PreviewPane({
    chapters,
    tabContents,
    activeChapterId,
    readerMode,
    onReaderModeChange,
    onClose,
    width,
}: PreviewPaneProps) {
    const activeChapter = activeChapterId
        ? chapters.find((c) => c.id === activeChapterId)
        : undefined;
    const activeContent = activeChapter
        ? (tabContents[activeChapter.id] ?? activeChapter.content ?? '').trim()
        : '';

    const segmentBtn = (
        mode: ReaderMode,
        label: string,
        Icon: typeof IconFileText
    ) => (
        <button
            className={styles.iconTextBtn}
            onClick={() => onReaderModeChange(mode)}
            title={
                mode === 'book' ? 'Full Book (entire novel)' : 'Current Chapter'
            }
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                color:
                    readerMode === mode
                        ? 'var(--text-primary, #fff)'
                        : 'var(--text-muted, #595d68)',
                background:
                    readerMode === mode
                        ? 'var(--editor-toolbar-border, #333)'
                        : 'transparent',
            }}
        >
            <Icon size={14} stroke={2} />
            {label}
        </button>
    );

    return (
        <div className="preview-pane" style={{ width }}>
            <div className="preview-pane-header">
                <span className="preview-pane-title">Preview</span>
                <div className="preview-pane-modes">
                    {segmentBtn('chapter', 'Chapter', IconFileText)}
                    {segmentBtn('book', 'Book', IconBooks)}
                </div>
                <button
                    className={styles.iconBtn}
                    onClick={onClose}
                    title="Close Preview"
                    style={{ marginLeft: 'auto' }}
                >
                    <IconX size={18} stroke={2} />
                </button>
            </div>
            <div className="preview-pane-body">
                {readerMode === 'book' ? (
                    <BookReader
                        chapters={chapters}
                        tabContents={tabContents}
                        activeChapterId={activeChapterId}
                    />
                ) : !activeChapter ? (
                    <div className="empty-editor">
                        <p>No chapter selected.</p>
                    </div>
                ) : !activeContent ? (
                    <div className="empty-editor">
                        <p>This chapter has no content yet.</p>
                    </div>
                ) : (
                    <div className="book-reader">
                        <section
                            className="book-reader-chapter"
                            data-chapter-id={activeChapter.id}
                        >
                            <h1>{activeChapter.title}</h1>
                            <div
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
