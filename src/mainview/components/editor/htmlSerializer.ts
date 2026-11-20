import type { Descendant, TElement, TText, Value } from 'platejs';

/**
 * Serialize the restricted Plate node set used by the rich text editor back to
 * HTML. Storage, preview and the AI/text extraction helpers all expect HTML,
 * so every edit is converted here instead of switching the persisted format.
 *
 * Only nodes produced by the plugins in `./plugins.ts` are handled; anything
 * unknown falls back to a paragraph so content is never dropped silently.
 */

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
};

/** Slate uses these to keep empty text nodes addressable; they are not content. */
const INVISIBLE_CHARS = /[\u200B\uFEFF]/g;

function escapeHtml(text: string): string {
    return text.replace(/[&<>]/g, (char) => HTML_ESCAPES[char] ?? char);
}

function serializeText(node: TText): string {
    const raw = (node.text ?? '').replace(INVISIBLE_CHARS, '');
    if (!raw) return '';

    let html = escapeHtml(raw).replace(/\n/g, '<br>');

    if (node.code) html = `<code>${html}</code>`;
    if (node.bold) html = `<strong>${html}</strong>`;
    if (node.italic) html = `<em>${html}</em>`;
    if (node.underline) html = `<u>${html}</u>`;
    if (node.strikethrough) html = `<s>${html}</s>`;
    if (node.highlight) html = `<mark>${html}</mark>`;
    if (node.subscript) html = `<sub>${html}</sub>`;
    if (node.superscript) html = `<sup>${html}</sup>`;

    return html;
}

function serializeChildren(node: TElement): string {
    return (node.children ?? []).map(serializeNode).join('');
}

function codeLineText(node: Descendant): string {
    if ('text' in node) return (node as TText).text ?? '';
    return (node.children ?? []).map(codeLineText).join('');
}

function serializeCodeBlock(node: TElement): string {
    const code = (node.children ?? [])
        .map((child) => codeLineText(child as Descendant))
        .join('\n')
        .replace(INVISIBLE_CHARS, '');

    return `<pre><code>${escapeHtml(code)}</code></pre>`;
}

function serializeElement(node: TElement): string {
    const type = (node.type as string | undefined) ?? 'p';

    if (type === 'code_block') return serializeCodeBlock(node);

    // `lic` is an untagged wrapper around a list item's inline content.
    if (type === 'lic') return serializeChildren(node);
    if (type === 'li') return `<li>${serializeChildren(node)}</li>`;
    if (type === 'ul' || type === 'ol') {
        return `<${type}>${serializeChildren(node)}</${type}>`;
    }

    const inner = serializeChildren(node);

    switch (type) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            return `<${type}>${inner}</${type}>`;
        case 'blockquote':
            return `<blockquote>${inner}</blockquote>`;
        case 'hr':
            return '<hr>';
        default:
            return `<p>${inner}</p>`;
    }
}

function serializeNode(node: Descendant): string {
    if ('text' in node) return serializeText(node as TText);

    return serializeElement(node as TElement);
}

export function slateToHtml(value: Value | null | undefined): string {
    if (!value || value.length === 0) return '';

    return value.map(serializeNode).join('');
}

const HTML_TAG =
    /<\/?(?:p|h[1-6]|ul|ol|li|blockquote|pre|code|div|span|strong|b|em|i|u|s|br|a|img|table|hr)\b/i;

/**
 * Plate deserializes strings as HTML. Plain text (`.txt` files, template
 * fields) would otherwise be parsed into nothing, so wrap it in a paragraph.
 */
export function toEditorValue(content: string | null | undefined): string {
    if (!content || content.trim().length === 0) return '';

    if (HTML_TAG.test(content)) return content;

    return `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;
}
