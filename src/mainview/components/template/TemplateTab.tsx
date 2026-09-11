import React from 'react';
import { FieldDefinition } from '../../types';
import TemplateField from './TemplateField';

type Props = {
    tmplFields: FieldDefinition[];
};

export default function TemplateTab({ tmplFields }: Props) {
    console.log('[fields]: ', tmplFields);
    return (
        <div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40%, auto))',
                }}
            >
                {tmplFields.map((f, index) => (
                    <TemplateField field={f} index={index} />
                ))}
            </div>
        </div>
    );
}
