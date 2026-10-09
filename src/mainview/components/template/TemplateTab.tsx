import type { FieldDefinition } from '../../types';
import TemplateField, { type EntryRef } from './TemplateField';

type Props = {
    tmplFields: FieldDefinition[];
    templateData?: Record<string, unknown> | null;
    onUpdate?: (fieldName: string, value: unknown) => void;
    entry?: { id: string; name: string };
    characters?: EntryRef[];
    locations?: EntryRef[];
    organizations?: EntryRef[];
    items?: EntryRef[];
    loreEntries?: EntryRef[];
};

export default function TemplateTab({
    tmplFields,
    templateData,
    onUpdate,
    entry,
    characters,
    locations,
    organizations,
    items,
    loreEntries,
}: Props) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
            }}
        >
            {tmplFields.map((field, index) => (
                <TemplateField
                    key={field.name}
                    mode="view"
                    field={field}
                    index={index}
                    value={templateData?.[field.name]}
                    onChange={(value) => onUpdate?.(field.name, value)}
                    entry={entry}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    items={items}
                    loreEntries={loreEntries}
                />
            ))}
        </div>
    );
}
