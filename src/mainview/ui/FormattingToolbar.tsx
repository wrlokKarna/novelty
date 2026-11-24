import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IconProps } from '@tabler/icons-react';
import {
    IconAlignCenter,
    IconAlignJustified,
    IconAlignLeft,
    IconAlignRight,
    IconBlockquote,
    IconBold,
    IconChevronDown,
    IconCode,
    IconH1,
    IconH2,
    IconH3,
    IconItalic,
    IconLetterP,
    IconList,
    IconListNumbers,
    IconStrikethrough,
    IconUnderline,
} from '@tabler/icons-react';
import { KEYS } from 'platejs';
import {
    useEditorReadOnly,
    useEditorRef,
    useSelectionVersion,
} from 'platejs/react';
import type { PlateEditor } from 'platejs/react';
import styles from '../App.module.css';
import {
    isBlockActive,
    isListActive,
    setHeadingType,
    toggleBlockquote,
    toggleBulletedList,
    toggleCodeBlock,
    toggleNumberedList,
} from '../components/editor/transforms';
import { EditorToolbarRight } from './EditorToolbarRight';

export type IconComponent = React.ForwardRefExoticComponent<
    IconProps & React.RefAttributes<SVGSVGElement>
>;

export type AlignmentType = 'left' | 'center' | 'justify' | 'right';

function getCurrentAlignment(editor: PlateEditor): AlignmentType {
    if (!editor.selection) return 'left';

    const entry = editor.api.block({ at: editor.selection }) as
        [{ textAlign?: AlignmentType }, unknown] | undefined;

    return entry?.[0]?.textAlign ?? 'left';
}

function isAlignmentActive(editor: PlateEditor, align: AlignmentType): boolean {
    return getCurrentAlignment(editor) === align;
}

function applyAlignmentDomFallback(align: AlignmentType): void {
    const anchor = window.getSelection()?.anchorNode;
    const elementEl =
        anchor instanceof HTMLElement
            ? anchor.closest<HTMLElement>('[data-slate-node="element"]')
            : anchor?.parentElement?.closest<HTMLElement>(
                  '[data-slate-node="element"]'
              );

    if (elementEl) {
        elementEl.setAttribute('data-text-align', align);
        elementEl.style.textAlign = align;
    }
}

function setAlignment(editor: PlateEditor, align: AlignmentType): void {
    if (!editor.selection) return;

    editor.tf.setNodes(
        {
            textAlign: align,
            'data-text-align': align,
        },
        {
            at: editor.selection,
            block: true,
        }
    );

    applyAlignmentDomFallback(align);
}

export interface ToolbarButtonConfig {
    id: string;
    kind: 'button';
    icon: IconComponent;
    action: (editor: PlateEditor) => void;
    isActive: (editor: PlateEditor) => boolean;
    title: string;
}

export interface DropdownOptionItem {
    id: string;
    title: string;
    icon: IconComponent;
    action: (editor: PlateEditor) => void;
    isActive: (editor: PlateEditor) => boolean;
}

export interface ToolbarDropdownConfig {
    id: string;
    kind: 'dropdown';
    items: DropdownOptionItem[];
}

export type ToolbarConfigItem = ToolbarButtonConfig | ToolbarDropdownConfig;

function ToolbarDropdown({
    item,
    editor,
    disabled,
}: {
    item: ToolbarDropdownConfig;
    editor: PlateEditor;
    disabled: boolean;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const matchedOption = !disabled
        ? item.items.find((opt) => {
              try {
                  return opt.isActive(editor);
              } catch {
                  return false;
              }
          })
        : undefined;

    const activeOption = matchedOption ?? item.items[0];
    const hasActiveOption = Boolean(matchedOption);

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () =>
            document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const ActiveIcon = activeOption.icon;

    return (
        <div
            ref={containerRef}
            style={{ position: 'relative', display: 'inline-flex' }}
        >
            <button
                type="button"
                className={styles.iconBtn}
                disabled={disabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                    if (!disabled) setOpen((prev) => !prev);
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    width: 'auto',
                    fontSize: '12px',
                    color: hasActiveOption ? '#fff' : undefined,
                    opacity: disabled ? 0.3 : hasActiveOption ? 1 : 0.85,
                    cursor: disabled ? 'default' : 'pointer',
                    pointerEvents: disabled ? 'none' : undefined,
                }}
            >
                <ActiveIcon size={16} stroke={2} />
                <IconChevronDown size={13} stroke={2} />
            </button>

            {open && !disabled && (
                <div
                    role="menu"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        minWidth: '150px',
                        zIndex: 50,
                        borderRadius: '6px',
                        border: '1px solid var(--editor-toolbar-border)',
                        backgroundColor: 'var(--editor-toolbar-bg)',
                        padding: '4px',
                        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.25)',
                    }}
                >
                    {item.items.map((opt) => {
                        const OptionIcon = opt.icon;
                        const isSelected = opt.id === activeOption.id;

                        return (
                            <button
                                key={opt.id}
                                type="button"
                                role="menuitem"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    editor.tf.focus();
                                    opt.action(editor);
                                    setOpen(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    background: isSelected
                                        ? 'rgba(255, 255, 255, 0.12)'
                                        : 'transparent',
                                    color: isSelected ? '#fff' : 'inherit',
                                    fontSize: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                <OptionIcon size={15} stroke={2} />
                                <span>{opt.title}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

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

    const toolbarConfig: ToolbarConfigItem[] = [
        {
            id: 'headings',
            kind: 'dropdown',
            items: [
                {
                    id: KEYS.p,
                    title: 'Normal text',
                    icon: IconLetterP,
                    action: (ed) => setHeadingType(ed, KEYS.p),
                    isActive: (ed) => isBlockActive(ed, KEYS.p),
                },
                {
                    id: KEYS.h1,
                    title: 'Heading 1',
                    icon: IconH1,
                    action: (ed) => setHeadingType(ed, KEYS.h1),
                    isActive: (ed) => isBlockActive(ed, KEYS.h1),
                },
                {
                    id: KEYS.h2,
                    title: 'Heading 2',
                    icon: IconH2,
                    action: (ed) => setHeadingType(ed, KEYS.h2),
                    isActive: (ed) => isBlockActive(ed, KEYS.h2),
                },
                {
                    id: KEYS.h3,
                    title: 'Heading 3',
                    icon: IconH3,
                    action: (ed) => setHeadingType(ed, KEYS.h3),
                    isActive: (ed) => isBlockActive(ed, KEYS.h3),
                },
            ],
        },
        {
            id: KEYS.bold,
            kind: 'button',
            icon: IconBold,
            action: (ed) => ed.tf.toggleMark(KEYS.bold),
            isActive: (ed) => !!ed.api.mark(KEYS.bold),
            title: 'Bold',
        },
        {
            id: KEYS.italic,
            kind: 'button',
            icon: IconItalic,
            action: (ed) => ed.tf.toggleMark(KEYS.italic),
            isActive: (ed) => !!ed.api.mark(KEYS.italic),
            title: 'Italic',
        },
        {
            id: KEYS.underline,
            kind: 'button',
            icon: IconUnderline,
            action: (ed) => ed.tf.toggleMark(KEYS.underline),
            isActive: (ed) => !!ed.api.mark(KEYS.underline),
            title: 'Underline',
        },
        {
            id: KEYS.strikethrough,
            kind: 'button',
            icon: IconStrikethrough,
            action: (ed) => ed.tf.toggleMark(KEYS.strikethrough),
            isActive: (ed) => !!ed.api.mark(KEYS.strikethrough),
            title: 'Strikethrough',
        },
        {
            id: 'alignment',
            kind: 'dropdown',
            items: [
                {
                    id: 'align-left',
                    title: 'Align Left',
                    icon: IconAlignLeft,
                    action: (ed) => setAlignment(ed, 'left'),
                    isActive: (ed) => isAlignmentActive(ed, 'left'),
                },
                {
                    id: 'align-center',
                    title: 'Align Center',
                    icon: IconAlignCenter,
                    action: (ed) => setAlignment(ed, 'center'),
                    isActive: (ed) => isAlignmentActive(ed, 'center'),
                },
                {
                    id: 'align-right',
                    title: 'Align Right',
                    icon: IconAlignRight,
                    action: (ed) => setAlignment(ed, 'right'),
                    isActive: (ed) => isAlignmentActive(ed, 'right'),
                },
                {
                    id: 'align-justify',
                    title: 'Justify',
                    icon: IconAlignJustified,
                    action: (ed) => setAlignment(ed, 'justify'),
                    isActive: (ed) => isAlignmentActive(ed, 'justify'),
                },
            ],
        },
        {
            id: 'lists',
            kind: 'dropdown',
            items: [
                {
                    id: KEYS.ulClassic,
                    title: 'Bullet List',
                    icon: IconList,
                    action: (ed) => toggleBulletedList(ed),
                    isActive: (ed) => isListActive(ed, KEYS.ulClassic),
                },
                {
                    id: KEYS.olClassic,
                    title: 'Ordered List',
                    icon: IconListNumbers,
                    action: (ed) => toggleNumberedList(ed),
                    isActive: (ed) => isListActive(ed, KEYS.olClassic),
                },
            ],
        },
        {
            id: KEYS.blockquote,
            kind: 'button',
            icon: IconBlockquote,
            action: (ed) => toggleBlockquote(ed),
            isActive: (ed) => isBlockActive(ed, KEYS.blockquote),
            title: 'Blockquote',
        },
        {
            id: KEYS.codeBlock,
            kind: 'button',
            icon: IconCode,
            action: (ed) => toggleCodeBlock(ed),
            isActive: (ed) => isBlockActive(ed, KEYS.codeBlock),
            title: 'Code Block',
        },
    ];

    const buttonGroupsContent = (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
            }}
        >
            {toolbarConfig.map((item, idx) => {
                if (item.kind === 'dropdown') {
                    return (
                        <ToolbarDropdown
                            key={item.id}
                            item={item}
                            editor={editor}
                            disabled={disabled}
                        />
                    );
                }

                const Icon = item.icon;
                const active = !disabled && item.isActive(editor);

                return (
                    <div
                        key={item.id}
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                        {idx === 1 && (
                            <div
                                style={{
                                    width: '1px',
                                    height: '16px',
                                    backgroundColor:
                                        'var(--editor-toolbar-border)',
                                    margin: '0 4px',
                                }}
                            />
                        )}
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={
                                disabled
                                    ? undefined
                                    : () => {
                                          item.action(editor);
                                          editor.tf.focus();
                                      }
                            }
                            title={item.title}
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
                    </div>
                );
            })}
        </div>
    );

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
