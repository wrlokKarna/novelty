import type { FieldDefinition } from '../../types';
import { DEFAULT_TEMPLATE_COLUMNS } from '../../types';
import TemplateField, { type EntryRef } from './TemplateField';

type Props = {
    tmplFields: FieldDefinition[];
    templateData?: Record<string, unknown> | null;
    columns?: number;
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
    columns = DEFAULT_TEMPLATE_COLUMNS,
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
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: '16px',
            }}
        >
            {tmplFields.map((field, index) => (
                <TemplateField
                    key={field.name}
                    mode="view"
                    field={field}
                    index={index}
                    columns={columns}
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
