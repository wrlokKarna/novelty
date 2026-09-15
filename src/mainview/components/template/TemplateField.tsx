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
    } else if (field.type === 'range') {
        return <FieldRange field={field} index={index} />;
    } else if (field.type === 'multiselect') {
        return <FieldMultiselect field={field} index={index} />;
    } else if (field.type === 'date') {
        return <FieldDate field={field} index={index} />;
    } else if (field.type === 'portrait') {
        return <FieldPortrait field={field} index={index} />;
    } else if (field.type === 'entitylink') {
        return <FieldEntityLink field={field} index={index} />;
    } else if (field.type === 'select') {
        return <FieldSelect field={field} index={index} />;
    } else if (field.type === 'toggle') {
        return <FieldToggle field={field} index={index} />;
    } else if (field.type === 'color') {
        return <FieldColor field={field} index={index} />;
    } else if (field.type === 'images') {
        return <FieldImages field={field} index={index} />;
    } else if (field.type === 'tree') {
        return <FieldTree field={field} index={index} />;
    } else {
        return <div>no comp {field.type}</div>;
    }
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
                id={field.label + index}
                wrap="off"
                placeholder="Describe this entity... (use / to reference)"
                value={textAreaVaule}
                onChange={(e) => setTextAreaVaule(e.target.value)}
            />
        </div>
    );
}

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
                id={field.label + index}
                type="number"
                value={numberVaule}
                onChange={(e) => setNumberVaule(e.target.value)}
            />
        </div>
    );
}

type FieldRangeProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldRange({ field, index }: FieldRangeProps) {
    const [rangeValue, setRangeValue] = useState(field.name);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {rangeValue})
            </label>
            <input
                id={field.label + index}
                type="range"
                value={rangeValue}
                onChange={(e) => setRangeValue(e.target.value)}
            />
        </div>
    );
}

type FieldMultiselectProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldMultiselect({ field, index }: FieldMultiselectProps) {
    const [multiselectValue, setMultiselectValue] = useState<string[]>([]);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {multiselectValue.join(', ')})
            </label>
            <select
                id={field.label + index}
                multiple
                value={multiselectValue}
                onChange={(e) =>
                    setMultiselectValue(
                        Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                        )
                    )
                }
            >
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
            </select>
        </div>
    );
}

type FieldDateProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldDate({ field, index }: FieldDateProps) {
    const [dateValue, setDateValue] = useState(field.name);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {dateValue})
            </label>
            <input
                id={field.label + index}
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
            />
        </div>
    );
}

type FieldPortraitProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldPortrait({ field, index }: FieldPortraitProps) {
    const [portraitValue, setPortraitValue] = useState(field.name);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {portraitValue})
            </label>
            <input
                id={field.label + index}
                type="file"
                accept="image/*"
                onChange={(e) =>
                    setPortraitValue(e.target.files?.[0]?.name || '')
                }
            />
        </div>
    );
}

type FieldEntityLinkProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldEntityLink({ field, index }: FieldEntityLinkProps) {
    const [entityLinkValue, setEntityLinkValue] = useState(field.name);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {entityLinkValue})
            </label>
            <input
                id={field.label + index}
                type="text"
                value={entityLinkValue}
                onChange={(e) => setEntityLinkValue(e.target.value)}
            />
        </div>
    );
}

type FieldSelectProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldSelect({ field, index }: FieldSelectProps) {
    const [selectValue, setSelectValue] = useState(field.name);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {selectValue})
            </label>
            <select
                id={field.label + index}
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
            >
                <option value="">Select an option</option>
                <option value="option1">Option 1</option>
                <option value="option2">Option 2</option>
                <option value="option3">Option 3</option>
            </select>
        </div>
    );
}

type FieldToggleProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldToggle({ field, index }: FieldToggleProps) {
    const [toggleValue, setToggleValue] = useState(false);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {toggleValue ? 'true' : 'false'})
            </label>
            <input
                id={field.label + index}
                type="checkbox"
                checked={toggleValue}
                onChange={(e) => setToggleValue(e.target.checked)}
            />
        </div>
    );
}

type FieldColorProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldColor({ field, index }: FieldColorProps) {
    const [colorValue, setColorValue] = useState(field.name || '#000000');

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {colorValue})
            </label>
            <input
                id={field.label + index}
                type="color"
                value={colorValue}
                onChange={(e) => setColorValue(e.target.value)}
            />
        </div>
    );
}

type FieldImagesProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldImages({ field, index }: FieldImagesProps) {
    const [imagesValue, setImagesValue] = useState<string[]>([]);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {imagesValue.join(', ')})
            </label>
            <input
                id={field.label + index}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                    setImagesValue(
                        Array.from(e.target.files || [], (file) => file.name)
                    )
                }
            />
        </div>
    );
}

type FieldTreeProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldTree({ field, index }: FieldTreeProps) {
    const [treeValue, setTreeValue] = useState(field.name);

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {treeValue})
            </label>
            <select
                id={field.label + index}
                value={treeValue}
                onChange={(e) => setTreeValue(e.target.value)}
            >
                <option value="">Select tree item</option>
                <option value="parent">Parent</option>
                <option value="child1">-- Child 1</option>
                <option value="child2">-- Child 2</option>
                <option value="child3">-- Child 3</option>
            </select>
        </div>
    );
}
