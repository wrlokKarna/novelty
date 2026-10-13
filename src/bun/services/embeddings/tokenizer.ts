import { getEncoding as tiktokenGetEncoding } from 'js-tiktoken';

let cachedEncoder: ReturnType<typeof tiktokenGetEncoding> | null = null;

function getEncoder() {
    if (!cachedEncoder) {
        cachedEncoder = tiktokenGetEncoding('cl100k_base');
    }
    return cachedEncoder;
}

export function countTokens(text: string): number {
    if (!text) return 0;
    return getEncoder().encode(text).length;
}

export function truncateToTokens(text: string, maxTokens: number): string {
    if (!text) return '';
    const enc = getEncoder();
    const tokens = enc.encode(text);
    if (tokens.length <= maxTokens) return text;
    return enc.decode(tokens.slice(0, maxTokens));
}

export function encode(text: string): number[] {
    return getEncoder().encode(text);
}

export function decode(tokens: number[]): string {
    return getEncoder().decode(tokens);
}
