import {
    flip,
    offset,
    useFloatingToolbar,
    useFloatingToolbarState,
} from '@platejs/floating';
import {
    IconBold,
    IconH1,
    IconH2,
    IconH3,
    IconItalic,
} from '@tabler/icons-react';
import { KEYS, type SlateEditor } from 'platejs';
import {
    useEditorId,
    useEditorRef,
    useEventEditorValue,
    useSelectionVersion,
} from 'platejs/react';

type BubbleItem = {
    title: string;
    icon: typeof IconBold;
    isActive: (editor: SlateEditor) => boolean;
    toggle: (editor: SlateEditor) => void;
};

const bubbleItems: BubbleItem[] = [
    {
        icon: IconBold,
        isActive: (editor) => !!editor.api.mark(KEYS.bold),
        title: 'Bold',
        toggle: (editor) => editor.tf.toggleMark(KEYS.bold),
    },
    {
        icon: IconItalic,
        isActive: (editor) => !!editor.api.mark(KEYS.italic),
        title: 'Italic',
        toggle: (editor) => editor.tf.toggleMark(KEYS.italic),
    },
    {
        icon: IconH1,
        isActive: (editor) => editor.api.some({ match: { type: KEYS.h1 } }),
        title: 'Heading 1',
        toggle: (editor) => editor.tf.toggleBlock(KEYS.h1),
    },
    {
        icon: IconH2,
        isActive: (editor) => editor.api.some({ match: { type: KEYS.h2 } }),
        title: 'Heading 2',
        toggle: (editor) => editor.tf.toggleBlock(KEYS.h2),
    },
    {
        icon: IconH3,
        isActive: (editor) => editor.api.some({ match: { type: KEYS.h3 } }),
        title: 'Heading 3',
        toggle: (editor) => editor.tf.toggleBlock(KEYS.h3),
    },
];

/**
 * Selection bubble menu. `@platejs/floating` only ships hooks, so the visual
 * shell is local.
 */
export function BubbleToolbar() {
    const editor = useEditorRef();
    const editorId = useEditorId();
    const focusedEditorId = useEventEditorValue('focus');

    const state = useFloatingToolbarState({
        editorId,
        focusedEditorId,
        floatingOptions: {
            middleware: [
                offset(12),
                flip({
                    fallbackPlacements: [
                        'top-start',
                        'top-end',
                        'bottom-start',
                        'bottom-end',
                    ],
                }),
            ],
            placement: 'top',
        },
    });

    const { ref, props: floatingProps, hidden } = useFloatingToolbar(state);

    // Re-render active states when the selection moves.
    useSelectionVersion();

    return (
        <div
            ref={ref}
            style={{
                ...floatingProps.style,
                alignItems: 'center',
                background: '#222',
                border: '1px solid #444',
                borderRadius: '6px',
                display: hidden ? 'none' : 'flex',
                gap: '2px',
                padding: '4px',
                position: 'absolute',
                zIndex: 50,
            }}
            onMouseDown={(event) => event.preventDefault()}
        >
            {bubbleItems.map(({ icon: Icon, isActive, title, toggle }) => {
                const active = isActive(editor);
                return (
                    <button
                        key={title}
                        type="button"
                        title={title}
                        onClick={() => toggle(editor)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: active ? '#fff' : '#888',
                            cursor: 'pointer',
                            display: 'flex',
                            opacity: active ? 1 : 0.6,
                            padding: '4px',
                        }}
                    >
                        <Icon size={16} stroke={2} />
                    </button>
                );
            })}
        </div>
    );
}
