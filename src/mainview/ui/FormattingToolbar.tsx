import { createPortal } from 'react-dom';
import {
    IconBlockquote,
    IconBold,
    IconCode,
    IconH1,
    IconH2,
    IconH3,
    IconItalic,
    IconList,
    IconListNumbers,
} from '@tabler/icons-react';
import { KEYS, type SlateEditor } from 'platejs';
import {
    useEditorReadOnly,
    useEditorRef,
    useSelectionVersion,
} from 'platejs/react';
import styles from '../App.module.css';
import {
    isBlockActive,
    toggleBlockquote,
    toggleBulletedList,
    toggleCodeBlock,
    toggleNumberedList,
} from '../components/editor/transforms';
import { EditorToolbarRight } from './EditorToolbarRight';

type ToolbarButton = {
    icon: typeof IconBold;
    action: (editor: SlateEditor) => void;
    isActive: (editor: SlateEditor) => boolean;
    title: string;
};

export function FormattingToolbar({
    editable,
    onToggleEditable,
    isPreviewOpen,
    onTogglePreview,
    showPreview,
    portalTarget,
}: {
    editable?: boolean;
    onToggleEditable?: () => void;
    isPreviewOpen?: boolean;
    onTogglePreview?: () => void;
    showPreview?: boolean;
    portalTarget?: HTMLElement | null;
}) {
    const editor = useEditorRef();
    const readOnly = useEditorReadOnly();

    // Re-render active states whenever the selection moves.
    useSelectionVersion();

    const isReadingMode = typeof editable === 'boolean' ? !editable : readOnly;
    const disabled = isReadingMode;

    const groups: ToolbarButton[][] = [
        [
            {
                icon: IconBold,
                action: (editor) => editor.tf.toggleMark(KEYS.bold),
                isActive: (editor) => !!editor.api.mark(KEYS.bold),
                title: 'Bold',
            },
            {
                icon: IconItalic,
                action: (editor) => editor.tf.toggleMark(KEYS.italic),
                isActive: (editor) => !!editor.api.mark(KEYS.italic),
                title: 'Italic',
            },
        ],
        [
            {
                icon: IconH1,
                action: (editor) => editor.tf.toggleBlock(KEYS.h1),
                isActive: (editor) => isBlockActive(editor, KEYS.h1),
                title: 'Heading 1',
            },
            {
                icon: IconH2,
                action: (editor) => editor.tf.toggleBlock(KEYS.h2),
                isActive: (editor) => isBlockActive(editor, KEYS.h2),
                title: 'Heading 2',
            },
            {
                icon: IconH3,
                action: (editor) => editor.tf.toggleBlock(KEYS.h3),
                isActive: (editor) => isBlockActive(editor, KEYS.h3),
                title: 'Heading 3',
            },
        ],
        [
            {
                icon: IconList,
                action: (editor) => toggleBulletedList(editor),
                isActive: (editor) => isBlockActive(editor, KEYS.ulClassic),
                title: 'Bullet List',
            },
            {
                icon: IconListNumbers,
                action: (editor) => toggleNumberedList(editor),
                isActive: (editor) => isBlockActive(editor, KEYS.olClassic),
                title: 'Ordered List',
            },
        ],
        [
            {
                icon: IconBlockquote,
                action: (editor) => toggleBlockquote(editor),
                isActive: (editor) => isBlockActive(editor, KEYS.blockquote),
                title: 'Blockquote',
            },
            {
                icon: IconCode,
                action: (editor) => toggleCodeBlock(editor),
                isActive: (editor) => isBlockActive(editor, KEYS.codeBlock),
                title: 'Code Block',
            },
        ],
    ];

    const buttonGroupsContent = groups.map((group, gi) => (
        <div
            key={gi}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
            }}
        >
            {gi > 0 && (
                <div
                    style={{
                        width: '1px',
                        height: '16px',
                        backgroundColor: 'var(--editor-toolbar-border)',
                        margin: '0 4px',
                    }}
                />
            )}
            {group.map((btn) => {
                const Icon = btn.icon;
                const active = !disabled && btn.isActive(editor);
                return (
                    <button
                        key={btn.title}
                        className={styles.iconBtn}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={
                            disabled
                                ? undefined
                                : () => {
                                      btn.action(editor);
                                      editor.tf.focus();
                                  }
                        }
                        title={btn.title}
                        disabled={disabled}
                        style={{
                            color: active ? '#fff' : undefined,
                            opacity: disabled ? 0.3 : active ? 1 : 0.6,
                            cursor: disabled ? 'default' : 'pointer',
                            pointerEvents: disabled ? 'none' : undefined,
                        }}
                    >
                        <Icon size={17} stroke={2} />
                    </button>
                );
            })}
        </div>
    ));

    // When portalTarget is provided (chapter editor), render ONLY the formatting buttons directly inside the pinned top bar
    if (portalTarget) {
        return createPortal(
            <div className={styles.hoistedFormatCluster}>
                {buttonGroupsContent}
            </div>,
            portalTarget
        );
    }

    // Fallback for standalone editors (e.g. Scratchpad / plain files)
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
            {buttonGroupsContent}
            <EditorToolbarRight
                isReadingMode={isReadingMode}
                onToggleMode={() => onToggleEditable?.()}
                isPreviewOpen={isPreviewOpen}
                onTogglePreview={onTogglePreview}
                showPreview={showPreview}
            />
        </div>
    );
}
