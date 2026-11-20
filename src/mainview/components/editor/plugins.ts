import {
    BasicBlocksPlugin,
    BasicMarksPlugin,
} from '@platejs/basic-nodes/react';
import { CodeBlockPlugin } from '@platejs/code-block/react';
import { ListPlugin } from '@platejs/list-classic/react';
import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react';
import { KEYS, type SlateEditor } from 'platejs';
import { ParagraphPlugin } from 'platejs/react';

import { SlashInputElement } from './SlashNode';

/**
 * Plugin kit backing `RichTextEditor`. The node set is deliberately limited to
 * the blocks/marks the serializer in `./htmlSerializer` understands.
 */
export const editorPlugins = [
    // Paragraphs default to `div`; render them as real `<p>` tags so the DOM
    // and the editor styles agree.
    ParagraphPlugin.configure({ render: { as: 'p' } }),
    BasicBlocksPlugin,
    BasicMarksPlugin,
    ListPlugin,
    CodeBlockPlugin,
    SlashPlugin.configure({
        options: {
            triggerQuery: (editor: SlateEditor) =>
                !editor.api.some({
                    match: { type: editor.getType(KEYS.codeBlock) },
                }),
        },
    }),
    SlashInputPlugin.withComponent(SlashInputElement),
];
