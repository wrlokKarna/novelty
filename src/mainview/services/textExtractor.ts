import type { RichTextEditorHandle } from '../components/RichTextEditor';
import type { Chapter } from '../types/index';

export interface ExtractionSource {
    text: string;
    label: string;
}

export interface ExtractOptions {
    editorRef?: React.RefObject<RichTextEditorHandle | null>;
    activeTabId?: string | null;
    activeTabType?: string | null;
    chapters: Chapter[];
    chapterContents?: Record<string, string>;
    mentionChapterId?: string | null;
    rpc: {
        request: {
            'file:read-content': (path: string) => Promise<string | null>;
            'db:get-chapter': (id: string) => Promise<Chapter | undefined>;
        };
    };
}

export async function getTextSource(
    options: ExtractOptions
): Promise<ExtractionSource> {
    const {
        editorRef,
        activeTabId,
        activeTabType,
        chapters,
        chapterContents,
        mentionChapterId,
        rpc,
    } = options;

    // 1. Explicit @-mention chapter
    if (mentionChapterId) {
        const ch = chapters.find((c) => c.id === mentionChapterId);
        if (ch) {
            const text = await loadChapterText(ch, chapterContents, rpc);
            if (text) return { text, label: `Chapter: ${ch.title}` };
        }
    }

    // 2. Editor selection
    if (editorRef?.current) {
        const selected = editorRef.current.getSelectedText();
        if (selected && selected.length > 0) {
            return { text: selected, label: 'Selection' };
        }
    }

    // 3. Active tab chapter
    if (activeTabId && activeTabType === 'chapter') {
        const ch = chapters.find((c) => c.id === activeTabId);
        if (ch) {
            const text = await loadChapterText(ch, chapterContents, rpc);
            if (text) return { text, label: `Chapter: ${ch.title}` };
        }
    }

    // 4. All chapters
    const allTexts: string[] = [];
    for (const ch of chapters) {
        const text = await loadChapterText(ch, chapterContents, rpc);
        if (text) allTexts.push(`--- ${ch.title} ---\n${text}`);
    }
    if (allTexts.length > 0) {
        return {
            text: allTexts.join('\n\n'),
            label: `All Chapters (${chapters.length})`,
        };
    }

    return { text: '', label: 'No content' };
}

async function loadChapterText(
    ch: Chapter,
    chapterContents?: Record<string, string>,
    rpc?: {
        request: {
            'file:read-content': (path: string) => Promise<string | null>;
            'db:get-chapter': (id: string) => Promise<Chapter | undefined>;
        };
    }
): Promise<string | null> {
    if (ch.content) return ch.content;
    if (chapterContents && chapterContents[ch.id])
        return chapterContents[ch.id];
    if (ch.filePath && rpc) {
        try {
            return await rpc.request['file:read-content'](ch.filePath);
        } catch {
            /* ignore */
        }
    }
    if (rpc) {
        try {
            const full = await rpc.request['db:get-chapter'](ch.id);
            if (full?.content) return full.content;
        } catch {
            /* ignore */
        }
    }
    return null;
}
