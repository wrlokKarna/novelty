import { countTokens, encode, decode } from './tokenizer';

export interface TextChunk {
    text: string;
    tokenCount: number;
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function splitIntoParagraphs(text: string): string[] {
    return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
}

function mergeParagraphs(paragraphs: string[], maxTokens: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    let current = '';

    for (const para of paragraphs) {
        const test = current ? `${current}\n\n${para}` : para;
        if (countTokens(test) > maxTokens && current) {
            chunks.push({
                text: current.trim(),
                tokenCount: countTokens(current.trim()),
            });
            current = para;
        } else {
            current = test;
        }
    }

    if (current.trim()) {
        chunks.push({
            text: current.trim(),
            tokenCount: countTokens(current.trim()),
        });
    }

    return chunks;
}

function chunkPlainText(
    text: string,
    maxTokens: number,
    overlapTokens: number
): TextChunk[] {
    const tokens = encode(text);
    const chunks: TextChunk[] = [];

    let start = 0;
    while (start < tokens.length) {
        const end = Math.min(start + maxTokens, tokens.length);
        const chunkTokens = tokens.slice(start, end);
        const chunkText = decode(chunkTokens);
        chunks.push({ text: chunkText.trim(), tokenCount: chunkTokens.length });
        start = end - overlapTokens;
        if (start >= tokens.length - overlapTokens) break;
    }

    return chunks;
}

export function chunkText(
    text: string,
    maxTokens: number,
    overlapTokens: number
): TextChunk[] {
    if (!text || !text.trim()) return [];

    const tokenCount = countTokens(text);
    if (tokenCount <= maxTokens) {
        return [{ text: text.trim(), tokenCount }];
    }

    const paragraphs = splitIntoParagraphs(text);
    if (paragraphs.length <= 1) {
        return chunkPlainText(text, maxTokens, overlapTokens);
    }

    const chunks = mergeParagraphs(paragraphs, maxTokens);

    if (overlapTokens <= 0 || chunks.length <= 1) return chunks;

    const overlapped: TextChunk[] = [chunks[0]];
    for (let i = 1; i < chunks.length; i++) {
        const prevTokens = encode(chunks[i - 1].text);
        const overlapSlice = prevTokens.slice(-overlapTokens);
        const overlapText = decode(overlapSlice);
        const combined = `${overlapText}\n\n${chunks[i].text}`;
        overlapped.push({
            text: combined.trim(),
            tokenCount: countTokens(combined.trim()),
        });
    }

    return overlapped;
}

export function chunkHtml(
    html: string,
    maxTokens: number,
    overlapTokens: number
): TextChunk[] {
    return chunkText(stripHtml(html), maxTokens, overlapTokens);
}
