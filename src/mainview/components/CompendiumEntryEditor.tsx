import { useState, useEffect, useRef, useCallback } from 'react';
import type {
    Character,
    Location,
    Organization,
    Item,
    LoreEntry,
    CompendiumCategory,
    EntityTemplate,
    FieldDefinition,
    ResolvedField,
    TemplateLayout,
    TemplateSpan,
} from '../types/index';
import { DEFAULT_TEMPLATE_COLUMNS } from '../types/index';
import { isFieldVisible } from '../templates/fieldVisibility';
import { emptyLayout } from '../templates/mergeFields';
import { autoArrangeLayout } from '../templates/autoArrange';
import { FieldLayoutGrid } from './template/layout/FieldLayoutGrid';
import { LayoutToolbar } from './template/layout/LayoutToolbar';
import TemplateTab from './template/TemplateTab';
import TemplateField from './template/TemplateField';

interface CompendiumEntryEditorProps {
    entry: Character | Location | Organization | Item | LoreEntry;
    category: CompendiumCategory;
    template?: EntityTemplate | null;
    columns?: number;
    layout?: TemplateLayout | null;
    onUpdate: (field: string, value: unknown) => void;
    onLayoutChange?: (layout: TemplateLayout) => void;
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
    onLayoutChange,
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

    const [editing, setEditing] = useState(false);
    const [draftLayout, setDraftLayout] = useState<TemplateLayout | null>(
        layout ?? null
    );

    const onLayoutChangeRef = useRef(onLayoutChange);
    onLayoutChangeRef.current = onLayoutChange;
    const draftRef = useRef<TemplateLayout | null>(draftLayout);
    const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    const flushLayoutSave = useCallback(() => {
        if (layoutSaveTimerRef.current) {
            clearTimeout(layoutSaveTimerRef.current);
            layoutSaveTimerRef.current = null;
            if (draftRef.current) {
                onLayoutChangeRef.current?.(draftRef.current);
            }
        }
    }, []);

    useEffect(() => () => flushLayoutSave(), [flushLayoutSave]);

    useEffect(() => {
        setEditing(false);
    }, [entry.id]);

    useEffect(() => {
        if (!editing) setDraftLayout(layout ?? null);
    }, [layout, editing]);

    function commitLayout(next: TemplateLayout) {
        draftRef.current = next;
        setDraftLayout(next);
        if (layoutSaveTimerRef.current) {
            clearTimeout(layoutSaveTimerRef.current);
        }
        layoutSaveTimerRef.current = setTimeout(() => {
            layoutSaveTimerRef.current = null;
            onLayoutChangeRef.current?.(next);
        }, 400);
    }

    function toggleEditing() {
        if (editing) {
            flushLayoutSave();
            setEditing(false);
        } else {
            const next: TemplateLayout = layout ?? {
                order: allFields.map((f) => f.name),
                spans: {},
                rows: {},
                columns: DEFAULT_TEMPLATE_COLUMNS,
            };
            draftRef.current = next;
            setDraftLayout(next);
            setEditing(true);
        }
    }

    function handleFieldUpdate(fieldName: string, value: unknown) {
        onUpdate('templateData', { ...templateData, [fieldName]: value });
    }

    const [entryLabel, setEntryLabel] = useState(entry.name);
    useEffect(() => {
        onUpdate('name', entryLabel);
        console.log('label', entryLabel);
    }, [entryLabel]);

    const draft = draftLayout ?? emptyLayout(DEFAULT_TEMPLATE_COLUMNS);
    const draftColumns = draft.columns ?? DEFAULT_TEMPLATE_COLUMNS;

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
                {allFields.length > 0 && onLayoutChange && (
                    <button
                        type="button"
                        className="btn"
                        onClick={toggleEditing}
                        title="Rearrange fields and widths for this template"
                    >
                        {editing ? 'Done' : 'Arrange fields'}
                    </button>
                )}
            </div>

            {fields.length === 0 && !editing ? (
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
            ) : editing ? (
                <div className="entry-content-grid">
                    <div className="entry-fields-column">
                        <div style={{ marginBottom: '0.75rem' }}>
                            <LayoutToolbar
                                columns={draftColumns}
                                onColumns={(n) =>
                                    commitLayout({
                                        ...draft,
                                        columns: n,
                                    })
                                }
                                onAutoArrange={() =>
                                    commitLayout(
                                        autoArrangeLayout(
                                            allFields as ResolvedField[],
                                            draftColumns
                                        )
                                    )
                                }
                            />
                        </div>
                        <FieldLayoutGrid
                            fields={allFields as ResolvedField[]}
                            layout={draft}
                            columns={draftColumns}
                            interactive
                            onReorder={(order) =>
                                commitLayout({ ...draft, order })
                            }
                            onSpanChange={(name: string, span: TemplateSpan) =>
                                commitLayout({
                                    ...draft,
                                    spans: {
                                        ...(draft.spans ?? {}),
                                        [name]: span,
                                    },
                                })
                            }
                            onRowChange={(name: string, rows: number) =>
                                commitLayout({
                                    ...draft,
                                    rows: {
                                        ...(draft.rows ?? {}),
                                        [name]: rows,
                                    },
                                })
                            }
                            renderItem={(field, index) => (
                                <TemplateField
                                    mode="view"
                                    field={field}
                                    index={index}
                                    columns={draftColumns}
                                    value={templateData?.[field.name]}
                                    onChange={(value) =>
                                        handleFieldUpdate(field.name, value)
                                    }
                                    entry={{ id: entry.id, name: entry.name }}
                                    characters={characters}
                                    locations={locations}
                                    organizations={organizations}
                                    items={items}
                                    loreEntries={loreEntries}
                                />
                            )}
                        />
                    </div>
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
