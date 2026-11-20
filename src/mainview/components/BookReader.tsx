import { useEffect, useRef } from 'react';
import type { Chapter } from '../../shared/types/project';

interface BookReaderProps {
    chapters: Chapter[];
    tabContents: Record<string, string>;
    activeChapterId: string | null;
}

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeChapterHtml(html: string): string {
    const trimmed = html.trim();
    if (!trimmed || UUID_REGEX.test(trimmed)) return '';
    return html.replace(
        /<p>\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*<\/p>/gi,
        ''
    );
}

export function BookReader({
    chapters,
    tabContents,
    activeChapterId,
}: BookReaderProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeChapterId && scrollRef.current) {
            const target = scrollRef.current.querySelector<HTMLElement>(
                `[data-chapter-id="${activeChapterId}"]`
            );
            if (target) {
                target.scrollIntoView({ block: 'start', behavior: 'auto' });
            }
        }
    }, [activeChapterId]);

    const sorted = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
    const withContent = sorted.filter((ch) => {
        const raw = tabContents[ch.id] ?? ch.content ?? '';
        return sanitizeChapterHtml(raw).trim().length > 0;
    });

    return (
        <div className="book-reader" ref={scrollRef}>
            {withContent.length === 0 ? (
                <div className="empty-editor">
                    <p>No chapters with content yet.</p>
                </div>
            ) : (
                withContent.map((ch) => {
                    const cleanHtml = sanitizeChapterHtml(
                        tabContents[ch.id] ?? ch.content ?? ''
                    );
                    return (
                        <section
                            key={ch.id}
                            className="book-reader-chapter"
                            data-chapter-id={ch.id}
                        >
                            <h1>{ch.title}</h1>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: cleanHtml,
                                }}
                            />
                        </section>
                    );
                })
            )}
        </div>
    );
}

export default BookReader;
