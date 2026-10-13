import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useEffect,
    useCallback,
    useState,
} from 'react';
import {
    EditorContent,
    EditorRoot,
    EditorBubble,
    EditorBubbleItem,
    StarterKit,
    Command,
    renderItems,
    handleCommandNavigation,
    useEditor,
} from 'novel';
import {
    IconBold,
    IconItalic,
    IconH1,
    IconH2,
    IconH3,
} from '@tabler/icons-react';
import { FormattingToolbar } from '../ui/FormattingToolbar';
import { suggestionItems } from '../ui/slash-commands';
import { SlashCommandMenu } from '../ui/SlashCommandMenu';

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

const bubbleItems = [
    {
        id: 'bold',
        icon: IconBold,
        action: (editor: any) => editor.chain().focus().toggleBold().run(),
        isActive: (editor: any) => editor.isActive('bold'),
    },
    {
        id: 'italic',
        icon: IconItalic,
        action: (editor: any) => editor.chain().focus().toggleItalic().run(),
        isActive: (editor: any) => editor.isActive('italic'),
    },
    {
        id: 'h1',
        icon: IconH1,
        action: (editor: any) =>
            editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: (editor: any) => editor.isActive('heading', { level: 1 }),
    },
    {
        id: 'h2',
        icon: IconH2,
        action: (editor: any) =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: (editor: any) => editor.isActive('heading', { level: 2 }),
    },
    {
        id: 'h3',
        icon: IconH3,
        action: (editor: any) =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: (editor: any) => editor.isActive('heading', { level: 3 }),
    },
];

function EditorRefCapture({ onReady }: { onReady: (e: any) => void }) {
    const { editor } = useEditor();
    useEffect(() => {
        if (editor) onReady(editor);
    }, [editor, onReady]);
    return null;
}

function BubbleMenu() {
    const { editor } = useEditor();
    if (!editor) return null;

    return (
        <EditorBubble>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    background: '#222',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '4px',
                }}
            >
                {bubbleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <EditorBubbleItem
                            key={item.id}
                            onSelect={item.action}
                            style={{
                                padding: '4px',
                                cursor: 'pointer',
                                color: item.isActive(editor) ? '#fff' : '#888',
                                opacity: item.isActive(editor) ? 1 : 0.6,
                            }}
                        >
                            <Icon size={16} stroke={2} />
                        </EditorBubbleItem>
                    );
                })}
            </div>
        </EditorBubble>
    );
}

const parseContent = (html: string) => {
    if (!html) return undefined;
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;
    if (body.children.length === 0) return undefined;
    const content: any[] = [];
    for (let i = 0; i < body.children.length; i++) {
        const child = body.children[i];
        if (child.tagName === 'P') {
            content.push({
                type: 'paragraph',
                content: child.textContent
                    ? [{ type: 'text', text: child.textContent }]
                    : [],
            });
        } else if (child.tagName === 'H1') {
            content.push({
                type: 'heading',
                attrs: { level: 1 },
                content: child.textContent
                    ? [{ type: 'text', text: child.textContent }]
                    : [],
            });
        } else if (child.tagName === 'H2') {
            content.push({
                type: 'heading',
                attrs: { level: 2 },
                content: child.textContent
                    ? [{ type: 'text', text: child.textContent }]
                    : [],
            });
        } else if (child.tagName === 'H3') {
            content.push({
                type: 'heading',
                attrs: { level: 3 },
                content: child.textContent
                    ? [{ type: 'text', text: child.textContent }]
                    : [],
            });
        }
    }
    return content.length > 0 ? { type: 'doc', content } : undefined;
};

export const RichTextEditor = forwardRef<
    RichTextEditorHandle,
    RichTextEditorProps
>(
    (
        {
            tabId,
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
        },
        forwardedRef
    ) => {
        const editorRef = useRef<any>(null);
        const [editorInstance, setEditorInstance] = useState<any>(null);

        useEffect(() => {
            if (editorInstance && typeof editable === 'boolean') {
                if (editorInstance.isEditable !== editable) {
                    editorInstance.setEditable(editable);
                }
            }
        }, [editorInstance, editable, tabId]);

        const handleEditorReady = useCallback(
            (editor: any) => {
                editorRef.current = editor;
                setEditorInstance(editor);
                editor.on('selectionUpdate', () => {
                    if (onCursorPosition) {
                        const textBefore = editor.state.doc.textBetween(
                            0,
                            editor.state.selection.anchor
                        );
                        const lines = textBefore.split('\n');
                        onCursorPosition(
                            lines.length,
                            lines[lines.length - 1].length + 1
                        );
                    }
                });
            },
            [onCursorPosition]
        );

        useImperativeHandle(
            forwardedRef,
            () => ({
                insertContent(html: string) {
                    if (!editorRef.current || editorRef.current.isDestroyed)
                        return;
                    editorRef.current.chain().focus().insertContent(html).run();
                },
                replaceSelection(html: string) {
                    if (!editorRef.current || editorRef.current.isDestroyed)
                        return;
                    const { from, to } = editorRef.current.state.selection;
                    if (from === to) {
                        editorRef.current
                            .chain()
                            .focus()
                            .insertContent(html)
                            .run();
                    } else {
                        editorRef.current
                            .chain()
                            .focus()
                            .deleteSelection()
                            .insertContent(html)
                            .run();
                    }
                },
                getSelectedText() {
                    if (!editorRef.current || editorRef.current.isDestroyed)
                        return '';
                    const { from, to } = editorRef.current.state.selection;
                    return editorRef.current.state.doc.textBetween(from, to);
                },
            }),
            []
        );

        return (
            <EditorRoot>
                <EditorContent
                    key={tabId}
                    extensions={[
                        StarterKit,
                        Command.configure({
                            suggestion: {
                                items: () => suggestionItems,
                                render: renderItems,
                            },
                        }),
                    ]}
                    editorProps={{
                        attributes: {
                            class: 'novel-editor-content',
                        },
                        handleKeyDown: (_, event) =>
                            handleCommandNavigation(event),
                    }}
                    initialContent={parseContent(initialContent || '')}
                    onUpdate={({ editor }: { editor: any }) => {
                        editorRef.current = editor;
                        onChange(editor?.getHTML() || '');
                    }}
                    slotBefore={
                        showToolbar ? (
                            <FormattingToolbar
                                editable={editable}
                                onToggleEditable={onToggleEditable}
                                isPreviewOpen={isPreviewOpen}
                                onTogglePreview={onTogglePreview}
                                showPreview={showPreview}
                            />
                        ) : null
                    }
                >
                    <EditorRefCapture onReady={handleEditorReady} />
                    {showBubbleMenu && <BubbleMenu />}
                    <SlashCommandMenu items={suggestionItems} />
                </EditorContent>
            </EditorRoot>
        );
    }
);

export default RichTextEditor;
