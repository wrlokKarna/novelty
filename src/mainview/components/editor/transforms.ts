import { toggleCodeBlock } from '@platejs/code-block';
import { toggleBulletedList, toggleNumberedList } from '@platejs/list-classic';
import { KEYS, type SlateEditor } from 'platejs';

export { toggleBulletedList, toggleCodeBlock, toggleNumberedList };

/**
 * Apply the block type chosen from the `/` menu to the current block. The
 * slash input has already been removed by the combobox, so the selection sits
 * in the block that should be converted.
 *
 * Standalone transforms are used instead of `editor.tf.<pluginKey>` so the
 * shared editor kit does not need to be typed as a tuple.
 */
export function applyBlockCommand(editor: SlateEditor, type: string) {
    switch (type) {
        case KEYS.ulClassic:
            return toggleBulletedList(editor);
        case KEYS.olClassic:
            return toggleNumberedList(editor);
        case KEYS.blockquote:
            return toggleBlockquote(editor);
        case KEYS.codeBlock:
            return toggleCodeBlock(editor);
        default:
            return editor.tf.toggleBlock(type);
    }
}

export function isBlockActive(editor: SlateEditor, type: string): boolean {
    return editor.api.some({ match: { type } });
}

export function toggleBlockquote(editor: SlateEditor) {
    return editor.tf.toggleBlock(KEYS.blockquote, { wrap: true });
}
