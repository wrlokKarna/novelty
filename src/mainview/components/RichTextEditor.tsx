import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    type ForwardedRef,
} from 'react';
import { RangeApi, type Value } from 'platejs';
import {
    Plate,
    PlateContent,
    usePlateEditor,
    type PlateEditor,
} from 'platejs/react';

import { FormattingToolbar } from '../ui/FormattingToolbar';
import { BubbleToolbar } from './editor/BubbleToolbar';
import { slateToHtml, toEditorValue } from './editor/htmlSerializer';
import { editorPlugins } from './editor/plugins';

interface RichTextEditorProps {
    tabId: string;
    initialContent?: string | null;
    onChange: (content: string) => void;
    showToolbar?: boolean;
    showBubbleMenu?: boolean;
    onCursorPosition?: (line: number, col: number) => void;
    editable?: boolean;
    onToggleEditable?: () => void;
    isPreviewOpen?: boolean;
    onTogglePreview?: () => void;
    showPreview?: boolean;
}

export interface RichTextEditorHandle {
    insertContent: (html: string) => void;
    replaceSelection: (html: string) => void;
    getSelectedText: () => string;
}

function reportCursorPosition(
    editor: PlateEditor,
    notify: (line: number, col: number) => void
) {
    const { selection } = editor;
    if (!selection) return;

    const start = editor.api.start([]);
    if (!start) return;

    // Everything before the caret, so line/col can be counted from it.
    const text = editor.api.string({
        anchor: start,
        focus: selection.anchor,
    });
    const lines = text.split('\n');

    notify(lines.length, lines[lines.length - 1].length + 1);
}

function deserialize(editor: PlateEditor, html: string) {
    const source = toEditorValue(html);
    if (!source) return editor.api.create.value();

    return editor.api.html.deserialize({ element: source });
}

interface EditorBodyProps extends RichTextEditorProps {
    forwardedRef: ForwardedRef<RichTextEditorHandle>;
}

function EditorBody({
    initialContent,
    onChange,
    showToolbar,
    showBubbleMenu,
    onCursorPosition,
    editable,
    onToggleEditable,
    isPreviewOpen,
    onTogglePreview,
    showPreview,
    forwardedRef,
}: EditorBodyProps) {
    const value = toEditorValue(initialContent);

    const editor = usePlateEditor({
        plugins: editorPlugins,
        value,
    });

    // Keep the latest callbacks without re-creating the editor bindings.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const onCursorPositionRef = useRef(onCursorPosition);
    onCursorPositionRef.current = onCursorPosition;

    // HTML last handed to (or received from) the parent. Used to distinguish
    // external content updates from our own onChange echo.
    const lastSynced = useRef(value);

    useEffect(() => {
        const incoming = toEditorValue(initialContent);
        if (incoming === lastSynced.current) return;

        lastSynced.current = incoming;
        editor.tf.setValue(incoming || undefined);
    }, [editor, initialContent]);

    const handleChange = useCallback(({ value }: { value: Value }) => {
        const html = slateToHtml(value);
        lastSynced.current = html;
        onChangeRef.current(html);
    }, []);

    const handleSelectionChange = useCallback(
        ({ editor: currentEditor }: { editor: PlateEditor }) => {
            const notify = onCursorPositionRef.current;
            if (notify) reportCursorPosition(currentEditor, notify);
        },
        []
    );

    useImperativeHandle(
        forwardedRef,
        () => ({
            insertContent(html: string) {
                const nodes = deserialize(editor, html);
                editor.tf.insertNodes(nodes, { select: true });
                editor.tf.focus();
            },
            replaceSelection(html: string) {
                const { selection } = editor;
                const expanded =
                    !!selection && !RangeApi.isCollapsed(selection);
                const nodes = deserialize(editor, html);

                if (!selection || nodes.length === 0) {
                    if (expanded) editor.tf.delete();
                    if (nodes.length > 0) {
                        editor.tf.insertNodes(nodes, { select: true });
                    }
                    editor.tf.focus();
                    return;
                }

                if (expanded) {
                    editor.tf.delete();

                    // Deleting the whole block leaves an empty paragraph
                    // behind; reuse its path so the replacement takes its
                    // place instead of adding a blank line above it.
                    const block = editor.api.block();
                    if (block && editor.api.isEmpty(block[0])) {
                        editor.tf.removeNodes({ at: block[1] });
                        editor.tf.insertNodes(nodes, {
                            at: block[1],
                            select: true,
                        });
                        editor.tf.focus();
                        return;
                    }
                }

                editor.tf.insertNodes(nodes, { select: true });
                editor.tf.focus();
            },
            getSelectedText() {
                const { selection } = editor;
                if (!selection) return '';

                const [start, end] = RangeApi.edges(selection);
                return editor.api.string({ anchor: start, focus: end });
            },
        }),
        [editor]
    );

    return (
        <Plate
            editor={editor}
            readOnly={editable === false}
            onChange={handleChange}
            onSelectionChange={handleSelectionChange}
        >
            {showToolbar ? (
                <FormattingToolbar
                    editable={editable}
                    onToggleEditable={onToggleEditable}
                    isPreviewOpen={isPreviewOpen}
                    onTogglePreview={onTogglePreview}
                    showPreview={showPreview}
                />
            ) : null}

            <PlateContent
                className="plate-editor-content"
                placeholder="Start writing…"
            />

            {showBubbleMenu ? <BubbleToolbar /> : null}
        </Plate>
    );
}

export const RichTextEditor = forwardRef<
    RichTextEditorHandle,
    RichTextEditorProps
>(function RichTextEditor(props, forwardedRef) {
    // Remounting per tab gives `usePlateEditor` a fresh initial value when the
    // active chapter/file changes.
    return (
        <EditorBody key={props.tabId} {...props} forwardedRef={forwardedRef} />
    );
});

export default RichTextEditor;
