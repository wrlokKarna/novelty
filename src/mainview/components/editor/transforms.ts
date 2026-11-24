import { toggleList } from '@platejs/list-classic';
import { KEYS } from 'platejs';
import { type PlateEditor } from 'platejs/react';

export function applyBlockCommand(editor: PlateEditor, type: string) {
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

export const isBlockActive = (editor: PlateEditor, type: string): boolean => {
    if (!editor.selection) return false;
    const entry = editor.api.block({ at: editor.selection, highest: true });
    return entry ? entry[0].type === type : false;
};

export const setHeadingType = (editor: PlateEditor, type: string): void => {
    if (!editor.selection) return;

    const entry = editor.api.block({ at: editor.selection, highest: true });
    if (!entry) return;

    const [, path] = entry;
    const currentType = entry[0].type;

    // Toggle back to normal paragraph if clicking the already-active heading
    const nextType = type !== KEYS.p && currentType === type ? KEYS.p : type;

    editor.tf.setNodes({ type: nextType }, { at: path });
};

export const toggleBlockquote = (editor: PlateEditor): void => {
    editor.tf.toggleBlock(KEYS.blockquote);
};

export const toggleCodeBlock = (editor: PlateEditor): void => {
    editor.tf.toggleBlock(KEYS.codeBlock);
};
export const isListActive = (
    editor: PlateEditor,
    listType: string
): boolean => {
    const selection = editor.selection;
    if (!selection) return false;

    try {
        return editor.api.some({
            at: selection,
            match: { type: listType },
        });
    } catch {
        return false;
    }
};

const toggleListOnCurrentBlock = (
    editor: PlateEditor,
    listType: typeof KEYS.ulClassic | typeof KEYS.olClassic
): void => {
    const blockEntry = editor.api.block({
        at: editor.selection ?? undefined,
    });

    if (!blockEntry) return;


    editor.tf.withoutNormalizing(() => {
        toggleList(editor, { type: listType });
    });
};

export const toggleBulletedList = (editor: PlateEditor): void => {
    toggleListOnCurrentBlock(editor, KEYS.ulClassic);
};

export const toggleNumberedList = (editor: PlateEditor): void => {
    toggleListOnCurrentBlock(editor, KEYS.olClassic);
};