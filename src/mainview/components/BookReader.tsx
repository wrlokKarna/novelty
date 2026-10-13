import { useEffect, useRef } from 'react';
import type { Chapter } from '../types/index';

interface BookReaderProps {
    chapters: Chapter[];
    tabContents: Record<string, string>;
    activeChapterId: string | null;
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
    const withContent = sorted.filter(
        (ch) => (tabContents[ch.id] ?? ch.content ?? '').trim().length > 0
    );

    return (
        <div className="book-reader" ref={scrollRef}>
            {withContent.length === 0 ? (
                <div className="empty-editor">
                    <p>No chapters with content yet.</p>
                </div>
            ) : (
                withContent.map((ch) => (
                    <section
                        key={ch.id}
                        className="book-reader-chapter"
                        data-chapter-id={ch.id}
                    >
                        <h1>{ch.title}</h1>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: tabContents[ch.id] ?? ch.content ?? '',
                            }}
                        />
                    </section>
                ))
            )}
        </div>
    );
}

export default BookReader;
