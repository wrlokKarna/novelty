import React, { useState } from 'react';
import { FieldDefinition } from '../../types';
import styles from './TemplateField.tarun.module.css';

type Props = {
    field: FieldDefinition;
    index: number;
};

function getStorageKey(field: FieldDefinition, index: number) {
    return `template-field-${field.type}-${field.label}-${index}`;
}

function getStoredValue<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') {
        return defaultValue;
    }

    const storedValue = localStorage.getItem(key);

    if (storedValue === null) {
        return defaultValue;
    }

    try {
        return JSON.parse(storedValue);
    } catch {
        return defaultValue;
    }
}

function saveValue<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
}

export default function TemplateFieldTarun({ field, index }: Props) {
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
    const storageKey = getStorageKey(field, index);

    const [textVaule, setTextVaule] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setTextVaule(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {textVaule})
            </label>

            <input
                id={field.label + index}
                value={textVaule}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldTextAreaProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldTextArea({ field, index }: FieldTextAreaProps) {
    const storageKey = getStorageKey(field, index);

    const [textAreaVaule, setTextAreaVaule] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setTextAreaVaule(value);
        saveValue(storageKey, value);
    };

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
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldNumberProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldNumber({ field, index }: FieldNumberProps) {
    const storageKey = getStorageKey(field, index);

    const [numberVaule, setNumberVaule] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setNumberVaule(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {numberVaule})
            </label>

            <input
                id={field.label + index}
                type="number"
                value={numberVaule}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldRangeProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldRange({ field, index }: FieldRangeProps) {
    const storageKey = getStorageKey(field, index);

    const [rangeValue, setRangeValue] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setRangeValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {rangeValue})
            </label>

            <input
                id={field.label + index}
                type="range"
                value={rangeValue}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldMultiselectProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldMultiselect({ field, index }: FieldMultiselectProps) {
    const storageKey = getStorageKey(field, index);

    const [multiselectValue, setMultiselectValue] = useState<string[]>(() =>
        getStoredValue(storageKey, [])
    );

    const handleChange = (value: string[]) => {
        setMultiselectValue(value);
        saveValue(storageKey, value);
    };

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
                    handleChange(
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
    const storageKey = getStorageKey(field, index);

    const [dateValue, setDateValue] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setDateValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {dateValue})
            </label>

            <input
                id={field.label + index}
                type="date"
                value={dateValue}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldPortraitProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldPortrait({ field, index }: FieldPortraitProps) {
    const storageKey = getStorageKey(field, index);

    const [portraitValue, setPortraitValue] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setPortraitValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {portraitValue})
            </label>

            <input
                id={field.label + index}
                type="file"
                accept="image/*"
                onChange={(e) => handleChange(e.target.files?.[0]?.name || '')}
            />
        </div>
    );
}

type FieldEntityLinkProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldEntityLink({ field, index }: FieldEntityLinkProps) {
    const storageKey = getStorageKey(field, index);

    const [entityLinkValue, setEntityLinkValue] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setEntityLinkValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {entityLinkValue})
            </label>

            <input
                id={field.label + index}
                type="text"
                value={entityLinkValue}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldSelectProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldSelect({ field, index }: FieldSelectProps) {
    const storageKey = getStorageKey(field, index);

    const [selectValue, setSelectValue] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setSelectValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {selectValue})
            </label>

            <select
                id={field.label + index}
                value={selectValue}
                onChange={(e) => handleChange(e.target.value)}
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
    const storageKey = getStorageKey(field, index);

    const [toggleValue, setToggleValue] = useState(() =>
        getStoredValue(storageKey, false)
    );

    const handleChange = (value: boolean) => {
        setToggleValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {toggleValue ? 'true' : 'false'})
            </label>

            <input
                id={field.label + index}
                type="checkbox"
                checked={toggleValue}
                onChange={(e) => handleChange(e.target.checked)}
            />
        </div>
    );
}

type FieldColorProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldColor({ field, index }: FieldColorProps) {
    const storageKey = getStorageKey(field, index);

    const [colorValue, setColorValue] = useState(() =>
        getStoredValue(storageKey, field.name || '#000000')
    );

    const handleChange = (value: string) => {
        setColorValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {colorValue})
            </label>

            <input
                id={field.label + index}
                type="color"
                value={colorValue}
                onChange={(e) => handleChange(e.target.value)}
            />
        </div>
    );
}

type FieldImagesProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldImages({ field, index }: FieldImagesProps) {
    const storageKey = getStorageKey(field, index);

    const [imagesValue, setImagesValue] = useState<string[]>(() =>
        getStoredValue(storageKey, [])
    );

    const handleChange = (value: string[]) => {
        setImagesValue(value);
        saveValue(storageKey, value);
    };

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
                    handleChange(
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
    const storageKey = getStorageKey(field, index);

    const [treeValue, setTreeValue] = useState(() =>
        getStoredValue(storageKey, field.name)
    );

    const handleChange = (value: string) => {
        setTreeValue(value);
        saveValue(storageKey, value);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {treeValue})
            </label>

            <select
                id={field.label + index}
                value={treeValue}
                onChange={(e) => handleChange(e.target.value)}
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
