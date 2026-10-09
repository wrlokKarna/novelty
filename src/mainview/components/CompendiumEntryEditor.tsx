import { useState, useEffect } from 'react';
import type {
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    CompendiumCategory,
    EntityTemplate,
} from '../types/index';
import { IconX } from '@tabler/icons-react';
import { isFieldVisible } from '../templates/fieldVisibility';
import TemplateTab from './template/TemplateTab';

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

    const [entryLabel, setEntryLabel] = useState(entry.name);
    useEffect(() => {
        onUpdate('name', entryLabel);
        console.log('label', entryLabel);
    }, [entryLabel]);

    return (
        <div className="compendium-entry-editor">
            <div className="entry-header">
                <span className="entry-category-label">
                    {category.toUpperCase()}
                </span>
                <input
                    type="text"
                    className="entry-name-input"
                    value={entryLabel}
                    onChange={(e) => setEntryLabel(e.target.value)}
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
                        <TemplateTab
                            tmplFields={regularFields}
                            templateData={templateData}
                            onUpdate={handleFieldUpdate}
                            entry={{ id: entry.id, name: entry.name }}
                            characters={characters}
                            locations={locations}
                            organizations={organizations}
                            items={items}
                            loreEntries={loreEntries}
                        />
                    </div>

                    <div className="entry-sidebar-column">
                        {portraitFields.map((field) => {
                            const portraitValue = templateData?.[
                                field.name
                            ] as string | null | undefined;
                            return (
                                <div key={field.name} className="sidebar-section">
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
                                                No{' '}
                                                {field.label.toLowerCase()} yet
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
                                                input.onchange = (
                                                    e: Event
                                                ) => {
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
                                <div key={field.name} className="sidebar-section">
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
                                                        flexDirection:
                                                            'column',
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
                                                No{' '}
                                                {field.label.toLowerCase()} yet
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className="portrait-controls"
                                        style={{
                                            justifyContent: 'flex-end',
                                        }}
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
                                                input.onchange = (
                                                    e: Event
                                                ) => {
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
