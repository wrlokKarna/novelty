import { useMemo } from 'react';
import styles from './ThinkingPanel.module.css';

const FENCE_PATTERN = /^\s*(```|~~~)/;

export function splitMarkdownBlocks(text: string): string[] {
    if (!text) return [];

    const lines = text.split('\n');
    const blocks: string[] = [];
    let current: string[] = [];
    let inFence = false;

    const flush = () => {
        if (current.length > 0) {
            blocks.push(current.join('\n'));
            current = [];
        }
    };

    for (const line of lines) {
        if (FENCE_PATTERN.test(line)) {
            inFence = !inFence;
            current.push(line);
            continue;
        }

        if (!inFence && line.trim() === '') {
            flush();
            continue;
        }

        current.push(line);
    }

    flush();
    return blocks;
}

interface ProgressiveMarkdownProps {
    text: string;
    isStreaming: boolean;
    renderMarkdown: (text: string) => React.ReactNode;
}

export default function ProgressiveMarkdown({
    text,
    isStreaming,
    renderMarkdown,
}: ProgressiveMarkdownProps) {
    const blocks = useMemo(() => splitMarkdownBlocks(text), [text]);

    if (!text) return null;

    if (!isStreaming) {
        return <>{renderMarkdown(text)}</>;
    }

    return (
        <>
            {blocks.map((block, index) => {
                const isLast = index === blocks.length - 1;
                return (
                    <div
                        key={index}
                        className={styles.markdownBlock}
                        data-streaming-block={isLast ? 'true' : undefined}
                    >
                        {renderMarkdown(block)}
                        {isLast && <span className={styles.caret} />}
                    </div>
                );
            })}
        </>
    );
}
