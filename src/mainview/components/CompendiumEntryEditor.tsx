import { useState, useEffect } from 'react';
import type {
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
    TemplateLayout,
} from '../types/index';
import { isFieldVisible } from '../templates/fieldVisibility';
import TemplateTab from './template/TemplateTab';

interface CompendiumEntryEditorProps {
    entry: Character | Location | Organization | Item | LoreEntry;
    category: CompendiumCategory;
    template?: EntityTemplate | null;
    columns?: number;
    layout?: TemplateLayout | null;
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
    columns,
    layout,
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
    const allFields: FieldDefinition[] = template?.customFields || [];
    const fields = allFields.filter((f) => isFieldVisible(f, templateData));

    function handleFieldUpdate(fieldName: string, value: unknown) {
        onUpdate('templateData', { ...templateData, [fieldName]: value });
    }

    const [entryLabel, setEntryLabel] = useState(entry.name);
    useEffect(() => {
        onUpdate('name', entryLabel);
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
                            tmplFields={fields}
                            templateData={templateData}
                            columns={columns}
                            layout={layout}
                            onUpdate={handleFieldUpdate}
                            entry={{ id: entry.id, name: entry.name }}
                            characters={characters}
                            locations={locations}
                            organizations={organizations}
                            items={items}
                            loreEntries={loreEntries}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
