import React, { useState } from 'react';
import { FieldDefinition } from '../../types';
import styles from './TemplateField.module.css';

type Props = {
    field: FieldDefinition;
    index: number;
};

export default function TemplateField({ field, index }: Props) {
    if (field.type === 'text') {
        return <FieldText field={field} index={index} />;
    } else if (field.type === 'textarea' || field.type === 'richtext') {
        return <FieldTextArea field={field} index={index} />;
    } else if (field.type === 'number') {
        return <FieldNumber field={field} index={index} />;
    } else {
        return <div>no comp {field.type}</div>;
    }
    // TemplateField {field.type}
}

type FieldTextProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldText({ field, index }: FieldTextProps) {
    const [textVaule, setTextVaule] = useState(field.name);
    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {textVaule})
            </label>
            <input
                id={field.label + index}
                value={textVaule}
                onChange={(e) => setTextVaule(e.target.value)}
            />
        </div>
    );
}

type FieldTextAreaProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldTextArea({ field, index }: FieldTextAreaProps) {
    const [textAreaVaule, setTextAreaVaule] = useState(field.name);
    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {textAreaVaule})
            </label>
            <textarea
                wrap="off"
                placeholder="Describe this entity... (use / to reference)"
                value={textAreaVaule}
                onChange={(e) => setTextAreaVaule(e.target.value)}
            >
                {' '}
            </textarea>
        </div>
    );
}

// needs work on Rich Text

type FieldNumberProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldNumber({ field, index }: FieldNumberProps) {
    const [numberVaule, setNumberVaule] = useState(field.name);
    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {numberVaule})
            </label>
            <input
                type="number"
                onChange={(e) => setNumberVaule(e.target.value)}
            />
        </div>
    );
}
