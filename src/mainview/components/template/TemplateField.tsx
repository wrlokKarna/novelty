import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { IconCheck, IconPencil, IconPhoto, IconX } from '@tabler/icons-react';
import type { CompendiumCategory, FieldDefinition } from '../../types';
import type { TreeEdge } from '../../templates/tree';
import { TREE_PRESETS, getTreeRelations } from '../../templates/tree';
import { RichTextEditor } from '../RichTextEditor';
import TreeFieldEditor from '../TreeFieldEditor';
import TreeRelationsEditor from '../TreeRelationsEditor';
import VisibilityEditor from '../VisibilityEditor';
import styles from './TemplateField.module.css';

export type EntryRef = { id: string; name: string };

export type ViewProps = {
    field: FieldDefinition;
    index: number;
    value?: unknown;
    onChange?: (value: unknown) => void;
    entry?: { id: string; name: string };
    characters?: EntryRef[];
    locations?: EntryRef[];
    organizations?: EntryRef[];
    items?: EntryRef[];
    loreEntries?: EntryRef[];
};

export type EditProps = {
    field: FieldDefinition;
    index: number;
    fields: FieldDefinition[];
    inherited?: boolean;
    editField: (index: number, updates: Partial<FieldDefinition>) => void;
    commitField: (index: number, updates: Partial<FieldDefinition>) => void;
    commitPending: () => void;
    commitOnEnter: (e: ReactKeyboardEvent) => void;
    onRemove: (index: number) => void;
};

export type TemplateFieldProps =
    | ({ mode: 'view' } & ViewProps)
    | ({ mode: 'edit' } & EditProps);

const ALL_CATEGORIES: CompendiumCategory[] = [
    'character',
    'location',
    'organization',
    'item',
    'lore',
];

function useClickOutside<T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    handler: () => void
) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;
    useEffect(() => {
        function listener(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handlerRef.current();
            }
        }
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref]);
}

function entriesForCategory(
    category: CompendiumCategory,
    lists: Pick<
        ViewProps,
        'characters' | 'locations' | 'organizations' | 'items' | 'loreEntries'
    >
): EntryRef[] {
    switch (category) {
        case 'character':
            return lists.characters ?? [];
        case 'location':
            return lists.locations ?? [];
        case 'organization':
            return lists.organizations ?? [];
        case 'item':
            return lists.items ?? [];
        case 'lore':
            return lists.loreEntries ?? [];
        default:
            return [];
    }
}

/* -------------------------------------------------------------------------- */
/*  View shell                                                                */
/* -------------------------------------------------------------------------- */

function ViewShell({
    field,
    index,
    children,
}: Pick<ViewProps, 'field' | 'index'> & { children: ReactNode }) {
    const style: React.CSSProperties = {
        gridColumn: `span ${field.span ?? 4}`,
    };
    return (
        <div
            className={`${styles.tmplField} ${styles.tmplFieldView} ${styles.field}`}
            style={style}
        >
            <div className={styles.fieldViewCard}>
                <label
                    className={styles.fieldLabel}
                    htmlFor={field.label + index}
                >
                    {field.label}
                </label>
            </div>
            {children}
        </div>
    );
}

function OptionDropdown({
    options,
    selected = [],
    onPick,
}: {
    options: string[];
    selected?: string[];
    onPick: (option: string) => void;
}) {
    return (
        <div className={styles.dropdown}>
            <div className={styles.options}>
                {options.map((option) => (
                    <button
                        key={option}
                        type="button"
                        className={`${styles.option} ${
                            selected.includes(option) ? styles.selected : ''
                        }`}
                        onClick={() => onPick(option)}
                    >
                        <span>{option}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  View controls                                                             */
/* -------------------------------------------------------------------------- */

function FieldText({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <input
                id={field.label + index}
                type="text"
                className={styles.textInput}
                placeholder={field.label}
                value={(value as string) ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </ViewShell>
    );
}

function FieldNumber({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <input
                id={field.label + index}
                type="number"
                className={styles.textInput}
                placeholder={field.label}
                value={value === undefined || value === null ? '' : String(value)}
                onChange={(e) =>
                    onChange?.(
                        e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                    )
                }
            />
        </ViewShell>
    );
}

function FieldTextArea({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <textarea
                id={field.label + index}
                className={styles.textarea}
                placeholder="Describe this entity... (use / to reference)"
                value={(value as string) ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </ViewShell>
    );
}

function FieldRichText({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <RichTextEditor
                tabId={`richtext-${field.name}`}
                initialContent={(value as string) ?? null}
                onChange={(content) => onChange?.(content)}
            />
        </ViewShell>
    );
}

function FieldDate({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <input
                id={field.label + index}
                type="date"
                className={`${styles.textInput} ${styles.dateInput}`}
                value={(value as string) ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </ViewShell>
    );
}

function FieldColor({ field, index, value, onChange }: ViewProps) {
    const color = (value as string) ?? '#000000';
    return (
        <ViewShell field={field} index={index}>
            <div className={styles.colorPicker}>
                <input
                    type="color"
                    className={styles.colorInput}
                    value={color}
                    onChange={(e) => onChange?.(e.target.value)}
                />
                <span className={styles.colorValue}>{color}</span>
            </div>
        </ViewShell>
    );
}

function FieldRange({ field, index, value, onChange }: ViewProps) {
    const min = field.rangeMin ?? 0;
    const max = field.rangeMax ?? 100;
    const step = field.rangeStep ?? 1;
    const current = (value as number) ?? min;
    return (
        <ViewShell field={field} index={index}>
            <div className={styles.rangeWrap}>
                <input
                    type="range"
                    className={styles.rangeInput}
                    min={min}
                    max={max}
                    step={step}
                    value={current}
                    onChange={(e) => onChange?.(Number(e.target.value))}
                />
                <span className={styles.rangeValue}>{current}</span>
            </div>
        </ViewShell>
    );
}

function FieldCheckbox({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <input
                id={field.label + index}
                type="checkbox"
                className={styles.checkbox}
                checked={Boolean(value)}
                onChange={(e) => onChange?.(e.target.checked)}
            />
        </ViewShell>
    );
}

function FieldToggle({ field, index, value, onChange }: ViewProps) {
    return (
        <ViewShell field={field} index={index}>
            <input
                id={field.label + index}
                type="checkbox"
                className={styles.toggle}
                checked={Boolean(value)}
                onChange={(e) => onChange?.(e.target.checked)}
            />
        </ViewShell>
    );
}

function FieldFile({ field, index, value, onChange }: ViewProps) {
    const fileName = value as string | undefined;
    return (
        <ViewShell field={field} index={index}>
            <div className={styles.filePicker}>
                <input
                    type="file"
                    className={styles.fileInput}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onChange?.(file.name);
                    }}
                />
                {fileName && (
                    <div className={styles.filePreview}>
                        <IconPhoto size={24} />
                        <span>{fileName}</span>
                        <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => onChange?.(undefined)}
                        >
                            <IconX size={16} />
                        </button>
                    </div>
                )}
            </div>
        </ViewShell>
    );
}

function FieldPortrait({ field, index, value, onChange }: ViewProps) {
    const src = value as string | undefined;
    return (
        <ViewShell field={field} index={index}>
            <div className={styles.portraitBox}>
                {src ? (
                    <img
                        src={src}
                        alt={field.label}
                        className={styles.portraitImage}
                    />
                ) : (
                    <IconPhoto size={28} />
                )}
            </div>
            <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => onChange?.(reader.result as string);
                    reader.readAsDataURL(file);
                }}
            />
        </ViewShell>
    );
}

function FieldImages({ field, index, value, onChange }: ViewProps) {
    const images = (value as string[]) ?? [];
    return (
        <ViewShell field={field} index={index}>
            {images.length > 0 && (
                <div className={styles.assetList}>
                    {images.map((img, i) => (
                        <div key={i} className={styles.assetItem}>
                            <img
                                src={img}
                                alt={`${field.label} ${i + 1}`}
                                className={styles.galleryThumb}
                            />
                            <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() =>
                                    onChange?.(
                                        images.filter((_, idx) => idx !== i)
                                    )
                                }
                            >
                                <IconX size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <input
                type="file"
                accept="image/*"
                multiple
                className={styles.fileInput}
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    let loaded = 0;
                    const next = [...images];
                    files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            next.push(reader.result as string);
                            loaded += 1;
                            if (loaded === files.length) onChange?.(next);
                        };
                        reader.readAsDataURL(file);
                    });
                }}
            />
        </ViewShell>
    );
}

function FieldSelect({ field, index, value, onChange }: ViewProps) {
    const options = field.options ?? [];
    const selected = (value as string) ?? null;
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useClickOutside(containerRef, () => setOpen(false));

    const filtered = options.filter((option) =>
        option.toLowerCase().includes(query.trim().toLowerCase())
    );

    const selectOption = (option: string) => {
        onChange?.(option);
        setQuery('');
        setOpen(false);
    };

    const clearOption = () => {
        onChange?.(undefined);
        setQuery('');
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const text = query.trim();
            if (text) {
                const match = options.find(
                    (o) => o.toLowerCase() === text.toLowerCase()
                );
                selectOption(match || text);
            } else {
                setOpen(false);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'Backspace' && !query && selected !== null) {
            clearOption();
        }
    };

    return (
        <ViewShell field={field} index={index}>
            <div className={styles.multiselect} ref={containerRef}>
                <div
                    className={styles.selectcont}
                    onClick={() => setOpen(true)}
                >
                    {selected !== null && (
                        <span className={styles.optionPill}>
                            {selected}
                            <button
                                type="button"
                                className={styles.removeOpt}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearOption();
                                }}
                            >
                                ×
                            </button>
                        </span>
                    )}
                    <input
                        type="text"
                        className={styles.comboboxInput}
                        value={query}
                        placeholder={selected === null ? 'Select...' : ''}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {open && filtered.length > 0 && (
                    <OptionDropdown
                        options={filtered}
                        selected={selected ? [selected] : []}
                        onPick={selectOption}
                    />
                )}
            </div>
        </ViewShell>
    );
}

function FieldMultiSelect({ field, index, value, onChange }: ViewProps) {
    const options = field.options ?? [];
    const selected = (value as string[]) ?? [];
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useClickOutside(containerRef, () => setOpen(false));

    const filtered = options.filter(
        (option) =>
            !selected.includes(option) &&
            option.toLowerCase().includes(query.trim().toLowerCase())
    );

    const selectOption = (option: string) => {
        onChange?.(selected.includes(option) ? selected : [...selected, option]);
        setQuery('');
        setOpen(true);
    };

    const removeOption = (option: string) => {
        onChange?.(selected.filter((o) => o !== option));
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const text = query.trim();
            if (text) {
                const match = options.find(
                    (o) => o.toLowerCase() === text.toLowerCase()
                );
                selectOption(match || text);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'Backspace' && !query && selected.length > 0) {
            removeOption(selected[selected.length - 1]);
        }
    };

    return (
        <ViewShell field={field} index={index}>
            <div className={styles.multiselect} ref={containerRef}>
                <div
                    className={styles.selectcont}
                    onClick={() => setOpen(true)}
                >
                    {selected.map((option) => (
                        <span key={option} className={styles.optionPill}>
                            {option}
                            <button
                                type="button"
                                className={styles.removeOpt}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeOption(option);
                                }}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        className={styles.comboboxInput}
                        value={query}
                        placeholder={
                            selected.length === 0 ? 'Select options...' : ''
                        }
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {open && filtered.length > 0 && (
                    <OptionDropdown options={filtered} onPick={selectOption} />
                )}
            </div>
        </ViewShell>
    );
}

function FieldEntityLink({
    field,
    index,
    value,
    onChange,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
}: ViewProps) {
    const categories =
        field.entitylinkCategories && field.entitylinkCategories.length > 0
            ? field.entitylinkCategories
            : ALL_CATEGORIES;
    const [category, setCategory] = useState<CompendiumCategory>(categories[0]);
    const selected = value as string | undefined;

    const entries = entriesForCategory(category, {
        characters,
        locations,
        organizations,
        items,
        loreEntries,
    });
    const selectedEntry = entries.find((entry) => entry.id === selected);

    return (
        <ViewShell field={field} index={index}>
            <div className={styles.entityLink}>
                <select
                    className={styles.select}
                    value={category}
                    onChange={(e) =>
                        setCategory(e.target.value as CompendiumCategory)
                    }
                >
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
                <select
                    className={styles.select}
                    value={selected ?? ''}
                    onChange={(e) => onChange?.(e.target.value || undefined)}
                >
                    <option value="">Select {category}...</option>
                    {entries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                            {entry.name}
                        </option>
                    ))}
                </select>
                {selectedEntry && (
                    <span className={styles.entityLinkName}>
                        → {selectedEntry.name}
                    </span>
                )}
            </div>
        </ViewShell>
    );
}

function FieldTree({
    field,
    index,
    value,
    onChange,
    entry,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
}: ViewProps) {
    const edges = (value as TreeEdge[]) ?? [];
    return (
        <ViewShell field={field} index={index}>
            <TreeFieldEditor
                edges={edges}
                entryId={entry?.id ?? ''}
                entryName={entry?.name ?? field.label}
                allowedCategories={
                    field.entitylinkCategories ?? ['character']
                }
                relations={getTreeRelations(field)}
                characters={characters}
                locations={locations}
                organizations={organizations}
                items={items}
                loreEntries={loreEntries}
                onChange={(next) => onChange?.(next)}
            />
        </ViewShell>
    );
}

export function TemplateFieldView(props: ViewProps) {
    switch (props.field.type) {
        case 'text':
            return <FieldText {...props} />;
        case 'textarea':
            return <FieldTextArea {...props} />;
        case 'richtext':
            return <FieldRichText {...props} />;
        case 'number':
            return <FieldNumber {...props} />;
        case 'range':
            return <FieldRange {...props} />;
        case 'select':
            return <FieldSelect {...props} />;
        case 'multiselect':
            return <FieldMultiSelect {...props} />;
        case 'checkbox':
            return <FieldCheckbox {...props} />;
        case 'toggle':
            return <FieldToggle {...props} />;
        case 'date':
            return <FieldDate {...props} />;
        case 'color':
            return <FieldColor {...props} />;
        case 'file':
            return <FieldFile {...props} />;
        case 'portrait':
            return <FieldPortrait {...props} />;
        case 'images':
            return <FieldImages {...props} />;
        case 'entitylink':
            return <FieldEntityLink {...props} />;
        case 'tree':
            return <FieldTree {...props} />;
        default:
            return null;
    }
}

/* -------------------------------------------------------------------------- */
/*  Edit controls                                                             */
/* -------------------------------------------------------------------------- */

function FieldEditHeader({
    field,
    index,
    inherited,
    onRemove,
    commitField,
}: Pick<EditProps, 'field' | 'index' | 'inherited' | 'onRemove' | 'commitField'>) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(field.label);

    const startEdit = () => {
        setDraft(field.label);
        setEditing(true);
    };

    const save = () => {
        commitField(index, { label: draft });
        setEditing(false);
    };

    const cancel = () => {
        setDraft(field.label);
        setEditing(false);
    };

    return (
        <div className={styles.fieldEditCard}>
            <div className={styles.editHeaderInfo}>
                <label
                    className={styles.enabledToggle}
                    title="Enable for this project"
                >
                    <input
                        type="checkbox"
                        checked={!field.disabled}
                        onChange={() =>
                            commitField(index, { disabled: !field.disabled })
                        }
                    />
                </label>
                {editing ? (
                    <>
                        <div className={styles.labelInputWrap}>
                            <input
                                autoFocus
                                type="text"
                                className={styles.labelInput}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') save();
                                    else if (e.key === 'Escape') cancel();
                                }}
                            />
                            <button
                                type="button"
                                className={styles.labelCancelBtn}
                                onClick={cancel}
                                title="Cancel"
                            >
                                <IconX size={14} />
                            </button>
                        </div>
                        <button
                            type="button"
                            className={styles.labelSaveBtn}
                            onClick={save}
                            title="Save label"
                        >
                            <IconCheck size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <span className={styles.fieldLabel}>
                            {field.label} ({field.type})
                        </span>
                        <button
                            type="button"
                            className={styles.labelEditBtn}
                            onClick={startEdit}
                            title="Rename field"
                        >
                            <IconPencil size={14} />
                        </button>
                    </>
                )}
                {inherited && (
                    <span className={styles.inheritedBadge}>INHERITED</span>
                )}
            </div>
            <label className={styles.spanControl}>
                Span
                <select
                    value={field.span || 4}
                    onChange={(e) =>
                        commitField(index, {
                            span: Number(e.target.value) as 1 | 2 | 3 | 4,
                        })
                    }
                >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                </select>
            </label>
            <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => onRemove(index)}
                title="Remove field"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22px"
                    height="22px"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M6 5H18M9 5V5C10.5769 3.16026 13.4231 3.16026 15 5V5M9 20H15C16.1046 20 17 19.1046 17 18V9C17 8.44772 16.5523 8 16 8H8C7.44772 8 7 8.44772 7 9V18C7 19.1046 7.89543 20 9 20Z"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            <button
                type="button"
                className={styles.dragBtn}
                title="Drag to reorder"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    width="18px"
                    height="18px"
                    viewBox="0 0 24 24"
                >
                    <path d="M10,4A2,2,0,1,1,8,2,2,2,0,0,1,10,4ZM8,10a2,2,0,1,0,2,2A2,2,0,0,0,8,10Zm0,8a2,2,0,1,0,2,2A2,2,0,0,0,8,18ZM16,6a2,2,0,1,0-2-2A2,2,0,0,0,16,6Zm0,8a2,2,0,1,0-2-2A2,2,0,0,0,16,14Zm0,8a2,2,0,1,0-2-2A2,2,0,0,0,16,22Z" />
                </svg>
            </button>
        </div>
    );
}

function EditBase({
    field,
    index,
    commitField,
}: Pick<EditProps, 'field' | 'index' | 'commitField'>) {
    return (
        <>
            <div className={styles.editRow}>
                <label className={styles.requiredToggle}>
                    <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                            commitField(index, { required: e.target.checked })
                        }
                    />
                    Required
                </label>
            </div>
        </>
    );
}

function EditShell(
    props: EditProps & { children?: ReactNode }
) {
    const {
        field,
        index,
        fields,
        inherited,
        commitField,
        onRemove,
        children,
    } = props;
    return (
        <div className={`${styles.tmplField} ${styles.tmplFieldEdit} ${styles.field}`}>
            <FieldEditHeader
                field={field}
                index={index}
                inherited={inherited}
                onRemove={onRemove}
                commitField={commitField}
            />
            <EditBase
                field={field}
                index={index}
                commitField={commitField}
            />
            {children}
            <VisibilityEditor
                fields={fields}
                currentIndex={index}
                value={field.visibleWhen}
                onChange={(v) => commitField(index, { visibleWhen: v })}
            />
        </div>
    );
}

function OptionsManager({
    field,
    index,
    editField,
    commitField,
    commitPending,
    commitOnEnter,
}: Pick<
    EditProps,
    | 'field'
    | 'index'
    | 'editField'
    | 'commitField'
    | 'commitPending'
    | 'commitOnEnter'
>) {
    const options = field.options ?? [];
    const [draft, setDraft] = useState('');

    const setOptions = (next: string[], commit: boolean) => {
        if (commit) commitField(index, { options: next });
        else editField(index, { options: next });
    };

    const add = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const value = draft.trim();
        if (!value) return;
        if (!options.includes(value)) setOptions([...options, value], true);
        setDraft('');
    };

    const rename = (i: number, value: string) => {
        const next = [...options];
        next[i] = value;
        setOptions(next, false);
    };

    const remove = (i: number) => {
        setOptions(
            options.filter((_, idx) => idx !== i),
            true
        );
    };

    return (
        <>
            <div className={styles.selectcont}>
                {options.length === 0 ? (
                    <div className={styles.multiselectInputPills} />
                ) : (
                    options.map((option, i) => (
                        <span key={i} className={styles.optionPill}>
                            {option}
                        </span>
                    ))
                )}
            </div>
            <div className={styles.options}>
                {options.map((option, i) => (
                    <div key={i} className={styles.option}>
                        <span className={styles.optToggle} />
                        <input
                            className={styles.optionInput}
                            value={option}
                            onChange={(e) => rename(i, e.target.value)}
                            onBlur={commitPending}
                            onKeyDown={commitOnEnter}
                        />
                        <button
                            type="button"
                            className={styles.delOptBtn}
                            onClick={() => remove(i)}
                            title="Delete option"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18px"
                                height="18px"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M6 5H18M9 5V5C10.5769 3.16026 13.4231 3.16026 15 5V5M9 20H15C16.1046 20 17 19.1046 17 18V9C17 8.44772 16.5523 8 16 8H8C7.44772 8 7 8.44772 7 9V18C7 19.1046 7.89543 20 9 20Z"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
            <div className={styles.addForm}>
                <form onSubmit={add}>
                    <input
                        type="text"
                        placeholder="add option and press enter or button"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    <button type="submit" disabled={draft.trim() === ''}>
                        add
                    </button>
                </form>
            </div>
        </>
    );
}

function RangeConfig({
    field,
    index,
    editField,
    commitPending,
    commitOnEnter,
}: Pick<
    EditProps,
    'field' | 'index' | 'editField' | 'commitPending' | 'commitOnEnter'
>) {
    return (
        <div className={styles.editRow}>
            <input
                type="number"
                className={styles.textInput}
                placeholder="Min"
                value={field.rangeMin ?? 0}
                onChange={(e) =>
                    editField(index, { rangeMin: Number(e.target.value) })
                }
                onBlur={commitPending}
                onKeyDown={commitOnEnter}
            />
            <input
                type="number"
                className={styles.textInput}
                placeholder="Max"
                value={field.rangeMax ?? 100}
                onChange={(e) =>
                    editField(index, { rangeMax: Number(e.target.value) })
                }
                onBlur={commitPending}
                onKeyDown={commitOnEnter}
            />
            <input
                type="number"
                className={styles.textInput}
                placeholder="Step"
                value={field.rangeStep ?? 1}
                onChange={(e) =>
                    editField(index, { rangeStep: Number(e.target.value) })
                }
                onBlur={commitPending}
                onKeyDown={commitOnEnter}
            />
        </div>
    );
}

function CategoriesConfig({
    field,
    index,
    commitField,
}: Pick<EditProps, 'field' | 'index' | 'commitField'>) {
    const current = field.entitylinkCategories ?? ALL_CATEGORIES;
    const toggle = (cat: CompendiumCategory) => {
        const next = current.includes(cat)
            ? current.filter((c) => c !== cat)
            : [...current, cat];
        commitField(index, { entitylinkCategories: next });
    };
    return (
        <div className={styles.categoriesRow}>
            <span className={styles.configLabel}>Allowed categories:</span>
            <div className={styles.categoryList}>
                {ALL_CATEGORIES.map((cat) => (
                    <label key={cat} className={styles.categoryToggle}>
                        <input
                            type="checkbox"
                            checked={current.includes(cat)}
                            onChange={() => toggle(cat)}
                        />
                        {cat}
                    </label>
                ))}
            </div>
        </div>
    );
}

function TreeConfig(props: EditProps) {
    return (
        <>
            <CategoriesConfig
                field={props.field}
                index={props.index}
                commitField={props.commitField}
            />
            <TreeRelationsEditor
                relations={props.field.treeRelations || TREE_PRESETS.family}
                onChange={(relations) =>
                    props.commitField(props.index, { treeRelations: relations })
                }
            />
        </>
    );
}

function FieldTextEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldTextAreaEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldRichTextEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldNumberEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldDateEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldColorEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldCheckboxEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldToggleEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldFileEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldPortraitEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldImagesEdit(props: EditProps) {
    return <EditShell {...props} />;
}
function FieldSelectEdit(props: EditProps) {
    return (
        <EditShell {...props}>
            <OptionsManager {...props} />
        </EditShell>
    );
}
function FieldMultiSelectEdit(props: EditProps) {
    return (
        <EditShell {...props}>
            <OptionsManager {...props} />
        </EditShell>
    );
}
function FieldRangeEdit(props: EditProps) {
    return (
        <EditShell {...props}>
            <RangeConfig {...props} />
        </EditShell>
    );
}
function FieldEntityLinkEdit(props: EditProps) {
    return (
        <EditShell {...props}>
            <CategoriesConfig
                field={props.field}
                index={props.index}
                commitField={props.commitField}
            />
        </EditShell>
    );
}
function FieldTreeEdit(props: EditProps) {
    return (
        <EditShell {...props}>
            <TreeConfig {...props} />
        </EditShell>
    );
}

export function TemplateFieldEdit(props: EditProps) {
    switch (props.field.type) {
        case 'text':
            return <FieldTextEdit {...props} />;
        case 'textarea':
            return <FieldTextAreaEdit {...props} />;
        case 'richtext':
            return <FieldRichTextEdit {...props} />;
        case 'number':
            return <FieldNumberEdit {...props} />;
        case 'range':
            return <FieldRangeEdit {...props} />;
        case 'select':
            return <FieldSelectEdit {...props} />;
        case 'multiselect':
            return <FieldMultiSelectEdit {...props} />;
        case 'checkbox':
            return <FieldCheckboxEdit {...props} />;
        case 'toggle':
            return <FieldToggleEdit {...props} />;
        case 'date':
            return <FieldDateEdit {...props} />;
        case 'color':
            return <FieldColorEdit {...props} />;
        case 'file':
            return <FieldFileEdit {...props} />;
        case 'portrait':
            return <FieldPortraitEdit {...props} />;
        case 'images':
            return <FieldImagesEdit {...props} />;
        case 'entitylink':
            return <FieldEntityLinkEdit {...props} />;
        case 'tree':
            return <FieldTreeEdit {...props} />;
        default:
            return null;
    }
}

export default function TemplateField(props: TemplateFieldProps) {
    if (props.mode === 'edit') {
        return <TemplateFieldEdit {...props} />;
    }
    return <TemplateFieldView {...props} />;
}
