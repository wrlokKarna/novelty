import { useState, useEffect, useRef } from 'react';
import type {
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
} from '../types/index';
import type { TreeEdge } from '../templates/tree';
import { getTreeRelations } from '../templates/tree';
import { IconX, IconPhoto } from '@tabler/icons-react';
import { RichTextEditor } from './RichTextEditor';
import { isFieldVisible } from '../templates/fieldVisibility';
import TreeFieldEditor from './TreeFieldEditor';

interface CompendiumEntryEditorProps {
    entry: Character | Location | Organization | Item | LoreEntry;
    category: CompendiumCategory;
    template?: EntityTemplate | null;
    onUpdate: (field: string, value: unknown) => void;
    onEditTemplate?: () => void;
    characters?: Character[];
    locations?: Location[];
    organizations?: Organization[];
    items?: Item[];
    loreEntries?: LoreEntry[];
}

export default function CompendiumEntryEditor({
    entry,
    category,
    template,
    onUpdate,
    onEditTemplate,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
}: CompendiumEntryEditorProps) {
    const templateData =
        ((entry as Record<string, unknown>).templateData as Record<
            string,
            unknown
        > | null) || {};
    const fields = (template?.customFields || []).filter((f) =>
        isFieldVisible(f, templateData)
    );

    const portraitFields = fields.filter((f) => f.type === 'portrait');
    const imagesFields = fields.filter((f) => f.type === 'images');
    const regularFields = fields.filter(
        (f) => f.type !== 'portrait' && f.type !== 'images'
    );

    const [showPortraitOptions, setShowPortraitOptions] = useState<
        string | null
    >(null);

    function handleFieldUpdate(fieldName: string, value: unknown) {
        onUpdate('templateData', { ...templateData, [fieldName]: value });
    }

    function handlePortraitFile(fieldName: string, file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            handleFieldUpdate(fieldName, reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    function handleGalleryFile(fieldName: string, file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            const current = (templateData[fieldName] as string[]) || [];
            handleFieldUpdate(fieldName, [...current, reader.result as string]);
        };
        reader.readAsDataURL(file);
    }

    function removeGalleryImage(fieldName: string, index: number) {
        const current = (templateData[fieldName] as string[]) || [];
        handleFieldUpdate(
            fieldName,
            current.filter((_, i) => i !== index)
        );
    }

    return (
        <div className="compendium-entry-editor">
            <div className="entry-header">
                <span className="entry-category-label">
                    {category.toUpperCase()}
                </span>
                <input
                    type="text"
                    className="entry-name-input"
                    value={entry.name}
                    onChange={(e) => onUpdate('name', e.target.value)}
                    placeholder="Untitled Entry"
                />
            </div>

            {fields.length === 0 ? (
                <div className="no-template-prompt">
                    <p>No template configured for {category}s.</p>
                    <p>
                        Create a template to define what fields this entry has.
                    </p>
                    {onEditTemplate && (
                        <button className="btn" onClick={onEditTemplate}>
                            Create Template
                        </button>
                    )}
                </div>
            ) : (
                <div className="entry-content-grid">
                    <div className="entry-fields-column">
                        <div className="entry-fields">
                            {regularFields.map((field) => (
                                <CustomField
                                    key={field.name}
                                    field={field}
                                    value={
                                        templateData?.[field.name] as
                                            | string
                                            | number
                                            | boolean
                                            | string[]
                                            | undefined
                                    }
                                    onUpdate={(value) =>
                                        handleFieldUpdate(field.name, value)
                                    }
                                    entry={
                                        entry as { id: string; name: string }
                                    }
                                    characters={characters}
                                    locations={locations}
                                    organizations={organizations}
                                    items={items}
                                    loreEntries={loreEntries}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="entry-sidebar-column">
                        {portraitFields.map((field) => {
                            const portraitValue = templateData?.[field.name] as
                                string | null | undefined;
                            return (
                                <div
                                    key={field.name}
                                    className="sidebar-section"
                                >
                                    <div className="section-label">
                                        {field.label.toUpperCase()}
                                    </div>
                                    <div className="portrait-box">
                                        {portraitValue ? (
                                            <img
                                                src={portraitValue}
                                                alt={field.label}
                                                className="portrait-image"
                                            />
                                        ) : (
                                            <span className="portrait-placeholder">
                                                No {field.label.toLowerCase()}{' '}
                                                yet
                                            </span>
                                        )}
                                    </div>
                                    <div className="portrait-controls">
                                        <div className="portrait-options-wrapper">
                                            <button
                                                className="icon-btn"
                                                title="Options"
                                                onClick={() =>
                                                    setShowPortraitOptions(
                                                        showPortraitOptions ===
                                                            field.name
                                                            ? null
                                                            : field.name
                                                    )
                                                }
                                            >
                                                ⋮
                                            </button>
                                            {showPortraitOptions ===
                                                field.name && (
                                                <div className="portrait-dropdown">
                                                    {portraitValue && (
                                                        <button
                                                            onClick={() => {
                                                                handleFieldUpdate(
                                                                    field.name,
                                                                    null
                                                                );
                                                                setShowPortraitOptions(
                                                                    null
                                                                );
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="portrait-pagination">
                                            {/* Portrait field */}
                                        </div>
                                        <button
                                            className="icon-btn"
                                            title={`Add ${field.label}`}
                                            onClick={() => {
                                                const input =
                                                    document.createElement(
                                                        'input'
                                                    );
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e: Event) => {
                                                    const file = (
                                                        e.target as HTMLInputElement
                                                    ).files?.[0];
                                                    if (file)
                                                        handlePortraitFile(
                                                            field.name,
                                                            file
                                                        );
                                                };
                                                input.click();
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {imagesFields.map((field) => {
                            const images =
                                (templateData?.[field.name] as string[]) || [];
                            return (
                                <div
                                    key={field.name}
                                    className="sidebar-section"
                                >
                                    <div className="section-label">
                                        {field.label.toUpperCase()}
                                    </div>
                                    {images.length > 0 ? (
                                        <div className="asset-list">
                                            {images.map((img, i) => (
                                                <div
                                                    key={i}
                                                    className="asset-item"
                                                    style={{
                                                        flexDirection: 'column',
                                                        gap: '6px',
                                                    }}
                                                >
                                                    <img
                                                        src={img}
                                                        alt={`${field.label} ${i + 1}`}
                                                        className="gallery-thumb"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="icon-btn"
                                                        onClick={() =>
                                                            removeGalleryImage(
                                                                field.name,
                                                                i
                                                            )
                                                        }
                                                    >
                                                        <IconX size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div
                                            className="portrait-box"
                                            style={{
                                                minHeight: '60px',
                                                marginBottom: '6px',
                                            }}
                                        >
                                            <span className="portrait-placeholder">
                                                No {field.label.toLowerCase()}{' '}
                                                yet
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className="portrait-controls"
                                        style={{ justifyContent: 'flex-end' }}
                                    >
                                        <button
                                            className="icon-btn"
                                            title={`Add ${field.label}`}
                                            onClick={() => {
                                                const input =
                                                    document.createElement(
                                                        'input'
                                                    );
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e: Event) => {
                                                    const file = (
                                                        e.target as HTMLInputElement
                                                    ).files?.[0];
                                                    if (file)
                                                        handleGalleryFile(
                                                            field.name,
                                                            file
                                                        );
                                                };
                                                input.click();
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

interface CustomFieldProps {
    field: FieldDefinition;
    value: unknown;
    onUpdate: (value: unknown) => void;
    entry: { id: string; name: string };
    characters?: Character[];
    locations?: Location[];
    organizations?: Organization[];
    items?: Item[];
    loreEntries?: LoreEntry[];
}

function CustomField({
    field,
    value,
    onUpdate,
    entry,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
}: CustomFieldProps) {
    const spanStyle: React.CSSProperties = {
        gridColumn: `span ${field.span || 4}`,
    };
    if (field.type === 'text') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <input
                    type="text"
                    value={(value as string) || ''}
                    onChange={(e) => onUpdate(e.target.value)}
                    placeholder={field.label}
                />
            </div>
        );
    }
    if (field.type === 'number') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <input
                    type="number"
                    value={(value as number) || ''}
                    onChange={(e) =>
                        onUpdate(
                            e.target.value
                                ? parseInt(e.target.value)
                                : undefined
                        )
                    }
                    placeholder={field.label}
                />
            </div>
        );
    }
    if (field.type === 'textarea') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <textarea
                    value={(value as string) || ''}
                    onChange={(e) => onUpdate(e.target.value)}
                    placeholder={field.label}
                />
            </div>
        );
    }
    if (field.type === 'select') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <select
                    value={(value as string) || ''}
                    onChange={(e) => onUpdate(e.target.value)}
                >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            </div>
        );
    }
    if (field.type === 'checkbox') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onUpdate(e.target.checked)}
                    />
                    {field.label}
                </label>
            </div>
        );
    }
    if (field.type === 'date') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <input
                    type="date"
                    value={(value as string) || ''}
                    onChange={(e) => onUpdate(e.target.value)}
                />
            </div>
        );
    }
    if (field.type === 'multiselect') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <MultiSelectInput
                    options={field.options || []}
                    value={(value as string[]) || []}
                    onChange={(v) => onUpdate(v)}
                    placeholder="Select options..."
                />
            </div>
        );
    }
    if (field.type === 'toggle') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onUpdate(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>
        );
    }
    if (field.type === 'color') {
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <div className="color-picker-wrapper">
                    <input
                        type="color"
                        value={(value as string) || '#000000'}
                        onChange={(e) => onUpdate(e.target.value)}
                    />
                    <span className="color-value">
                        {(value as string) || '#000000'}
                    </span>
                </div>
            </div>
        );
    }
    if (field.type === 'range') {
        const min = field.rangeMin ?? 0;
        const max = field.rangeMax ?? 100;
        const step = field.rangeStep ?? 1;
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>
                    {field.label}: {value !== undefined ? String(value) : min}
                </label>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={(value as number) ?? min}
                    onChange={(e) => onUpdate(Number(e.target.value))}
                />
            </div>
        );
    }
    if (field.type === 'entitylink') {
        const selectedId = value as string | undefined;
        const allowedCategories = field.entitylinkCategories || [
            'character',
            'location',
            'organization',
            'item',
            'lore',
        ];
        const [selectedCategory, setSelectedCategory] = useState<string>(
            allowedCategories[0]
        );

        const getEntriesByCategory = (cat: string) => {
            switch (cat) {
                case 'character':
                    return characters || [];
                case 'location':
                    return locations || [];
                case 'organization':
                    return organizations || [];
                case 'item':
                    return items || [];
                case 'lore':
                    return loreEntries || [];
                default:
                    return [];
            }
        };

        const entries = getEntriesByCategory(selectedCategory);
        const selectedEntry = entries.find((e: any) => e.id === selectedId);

        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <div className="entity-link-wrapper">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {allowedCategories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    <select
                        value={selectedId || ''}
                        onChange={(e) => onUpdate(e.target.value || undefined)}
                    >
                        <option value="">Select {selectedCategory}...</option>
                        {entries.map((e: any) => (
                            <option key={e.id} value={e.id}>
                                {e.name}
                            </option>
                        ))}
                    </select>
                    {selectedEntry && (
                        <span className="entity-link-name">
                            → {selectedEntry.name}
                        </span>
                    )}
                </div>
            </div>
        );
    }
    if (field.type === 'file') {
        const filePath = value as string | undefined;
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <div className="file-picker-wrapper">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                onUpdate(file.name);
                            }
                        }}
                    />
                    {filePath && (
                        <div className="file-preview">
                            <IconPhoto size={24} />
                            <span>{filePath}</span>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => onUpdate(undefined)}
                            >
                                <IconX size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    if (field.type === 'richtext') {
        return (
            <div
                className="field-row custom-field richtext-field"
                style={spanStyle}
            >
                <label>{field.label}</label>
                <RichTextEditor
                    tabId={`richtext-${field.name}`}
                    initialContent={value as string | null}
                    onChange={(content) => onUpdate(content)}
                />
            </div>
        );
    }
    if (field.type === 'tree') {
        const treeEdges = (value as TreeEdge[]) || [];
        return (
            <div className="field-row custom-field" style={spanStyle}>
                <label>{field.label}</label>
                <TreeFieldEditor
                    edges={treeEdges}
                    entryId={entry.id}
                    entryName={entry.name}
                    allowedCategories={
                        field.entitylinkCategories || ['character']
                    }
                    relations={getTreeRelations(field)}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    items={items}
                    loreEntries={loreEntries}
                    onChange={(v) => onUpdate(v)}
                />
            </div>
        );
    }
    return null;
}

function MultiSelectInput({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: string[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = value || [];
    const filtered = options.filter(
        (o) =>
            !selected.includes(o) &&
            o.toLowerCase().includes(query.trim().toLowerCase())
    );

    function select(opt: string) {
        if (!selected.includes(opt)) {
            onChange([...selected, opt]);
        }
        setQuery('');
        setOpen(true);
    }

    function remove(opt: string) {
        onChange(selected.filter((v) => v !== opt));
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const text = query.trim();
            if (text) {
                const match = options.find(
                    (o) => o.toLowerCase() === text.toLowerCase()
                );
                select(match || text);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'Backspace' && !query && selected.length > 0) {
            remove(selected[selected.length - 1]);
        }
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div className="multiselect-combobox" onClick={() => setOpen(true)}>
                {selected.map((s) => (
                    <span key={s} className="ms-chip">
                        {s}
                        <button
                            type="button"
                            className="ms-chip-remove"
                            title="Remove"
                            onClick={(e) => {
                                e.stopPropagation();
                                remove(s);
                            }}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={query}
                    placeholder={
                        selected.length === 0 ? placeholder || 'Select...' : ''
                    }
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            {open && filtered.length > 0 && (
                <div className="multiselect-dropdown">
                    {filtered.map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            className="multiselect-option-pill"
                            onClick={() => select(opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
