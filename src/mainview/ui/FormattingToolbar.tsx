import { useEditor } from 'novel';
import {
    IconBold,
    IconItalic,
    IconH1,
    IconH2,
    IconH3,
    IconList,
    IconListNumbers,
    IconBlockquote,
    IconCode,
} from '@tabler/icons-react';
import styles from '../App.module.css';
import { EditorToolbarRight } from './EditorToolbarRight';

export function FormattingToolbar({
    editable,
    onToggleEditable,
    isPreviewOpen,
    onTogglePreview,
    showPreview,
}: {
    editable?: boolean;
    onToggleEditable?: () => void;
    isPreviewOpen?: boolean;
    onTogglePreview?: () => void;
    showPreview?: boolean;
}) {
    const { editor } = useEditor();
    if (!editor) return null;

    const isReadingMode =
        typeof editable === 'boolean' ? !editable : !editor.isEditable;

    const groups = [
        [
            {
                icon: IconBold,
                action: () => editor.chain().focus().toggleBold().run(),
                isActive: editor.isActive('bold'),
                title: 'Bold',
            },
            {
                icon: IconItalic,
                action: () => editor.chain().focus().toggleItalic().run(),
                isActive: editor.isActive('italic'),
                title: 'Italic',
            },
        ],
        [
            {
                icon: IconH1,
                action: () =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run(),
                isActive: editor.isActive('heading', { level: 1 }),
                title: 'Heading 1',
            },
            {
                icon: IconH2,
                action: () =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run(),
                isActive: editor.isActive('heading', { level: 2 }),
                title: 'Heading 2',
            },
            {
                icon: IconH3,
                action: () =>
                    editor.chain().focus().toggleHeading({ level: 3 }).run(),
                isActive: editor.isActive('heading', { level: 3 }),
                title: 'Heading 3',
            },
        ],
        [
            {
                icon: IconList,
                action: () => editor.chain().focus().toggleBulletList().run(),
                isActive: editor.isActive('bulletList'),
                title: 'Bullet List',
            },
            {
                icon: IconListNumbers,
                action: () => editor.chain().focus().toggleOrderedList().run(),
                isActive: editor.isActive('orderedList'),
                title: 'Ordered List',
            },
        ],
        [
            {
                icon: IconBlockquote,
                action: () => editor.chain().focus().toggleBlockquote().run(),
                isActive: editor.isActive('blockquote'),
                title: 'Blockquote',
            },
            {
                icon: IconCode,
                action: () => editor.chain().focus().toggleCodeBlock().run(),
                isActive: editor.isActive('codeBlock'),
                title: 'Code Block',
            },
        ],
    ];

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: '4px 8px',
                borderBottom: '1px solid var(--editor-toolbar-border)',
                flexWrap: 'wrap',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: 'var(--editor-toolbar-bg)',
            }}
        >
            {groups.map((group, gi) => (
                <div
                    key={gi}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                    }}
                >
                    {gi > 0 && (
                        <div
                            style={{
                                width: '1px',
                                height: '20px',
                                backgroundColor: 'var(--editor-toolbar-border)',
                                margin: '0 4px',
                            }}
                        />
                    )}
                    {group.map((btn) => {
                        const Icon = btn.icon;
                        const disabled = !editor.isEditable;
                        return (
                            <button
                                key={btn.title}
                                className={styles.iconBtn}
                                onClick={disabled ? undefined : btn.action}
                                title={btn.title}
                                disabled={disabled}
                                style={{
                                    color: btn.isActive ? '#fff' : undefined,
                                    opacity: disabled
                                        ? 0.3
                                        : btn.isActive
                                          ? 1
                                          : 0.6,
                                    cursor: disabled ? 'default' : 'pointer',
                                    pointerEvents: disabled
                                        ? 'none'
                                        : undefined,
                                }}
                            >
                                <Icon size={18} stroke={2} />
                            </button>
                        );
                    })}
                </div>
            ))}
            <EditorToolbarRight
                isReadingMode={isReadingMode}
                onToggleMode={() => {
                    editor.setEditable(!editor.isEditable);
                    onToggleEditable?.();
                }}
                isPreviewOpen={isPreviewOpen}
                onTogglePreview={onTogglePreview}
                showPreview={showPreview}
            />
        </div>
    );
}
