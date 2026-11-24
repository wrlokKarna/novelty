import { KEYS, type SlateEditor } from 'platejs';

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

export const isBlockActive = (editor: SlateEditor, type: string): boolean => {
    if (!editor.selection) return false;
    const entry = editor.api.block({ at: editor.selection, highest: true });
    return entry ? entry[0].type === type : false;
};

export const setHeadingBlock = (editor: SlateEditor, type: string): void => {
    if (!editor.selection) return;

    const entry = editor.api.block({ at: editor.selection, highest: true });
    if (!entry) return;

    const [, path] = entry;
    const currentType = entry[0].type;

    // Toggle back to normal paragraph if clicking the already-active heading
    const nextType = type !== KEYS.p && currentType === type ? KEYS.p : type;

    editor.tf.setNodes({ type: nextType }, { at: path });
};

export const toggleBlockquote = (editor: SlateEditor): void => {
    editor.tf.toggleBlock(KEYS.blockquote);
};

export const toggleCodeBlock = (editor: SlateEditor): void => {
    editor.tf.toggleBlock(KEYS.codeBlock);
};

export const toggleBulletedList = (editor: SlateEditor): void => {
    editor.tf.toggleBlock(KEYS.ulClassic);
};

export const toggleNumberedList = (editor: SlateEditor): void => {
    editor.tf.toggleBlock(KEYS.olClassic);
};