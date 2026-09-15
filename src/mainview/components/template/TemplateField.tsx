import React, { useState } from 'react';
import { FieldDefinition } from '../../types';
import styles from './TemplateField.module.css';

/* =========================================================
   TEMPLATE FIELD
   ========================================================= */

type Props = {
    field: FieldDefinition;
    index: number;
};

export default function TemplateField({ field, index }: Props) {
    const type = String(field.type);

    switch (type) {
        case 'text':
            return <FieldText field={field} index={index} />;

        case 'number':
            return <FieldNumber field={field} index={index} />;

        case 'textarea':
            return <FieldTextArea field={field} index={index} />;

        case 'richtext':
            return <FieldRichText field={field} index={index} />;

        case 'slider':
            return <FieldSlider field={field} index={index} />;

        case 'dropdown':
            return <FieldDropdown field={field} index={index} />;

        case 'multiselect':
            return <FieldMultiselect field={field} index={index} />;

        case 'toggle':
            return <FieldToggle field={field} index={index} />;

        case 'color':
            return <FieldColor field={field} index={index} />;

        case 'images':
            return <FieldImages field={field} index={index} />;

        case 'tree':
            return <FieldTree field={field} index={index} />;

        case 'date':
            return <FieldDate field={field} index={index} />;

        case 'portrait':
            return <FieldPortrait field={field} index={index} />;

        case 'entitylink':
            return <FieldEntityLink field={field} index={index} />;

        default:
            return (
                <div className={`${styles.tmplField} ${styles.field}`}>
                    <div className={styles.unknownField}>
                        Unsupported field type: {type}
                    </div>
                </div>
            );
    }
}

/* =========================================================
   COMMON TYPES
   ========================================================= */

type FieldProps = {
    field: FieldDefinition;
    index: number;
};

/* =========================================================
   TEXT
   ========================================================= */

export function FieldText({ field, index }: FieldProps) {
    const [value, setValue] = useState(String(field.name ?? ''));

    const fieldId = `field-text-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <input
                id={fieldId}
                className={styles.control}
                type="text"
                value={value}
                placeholder={field.label}
                onChange={(event) => setValue(event.target.value)}
            />
        </div>
    );
}

/* =========================================================
   NUMBER
   ========================================================= */

export function FieldNumber({ field, index }: FieldProps) {
    const [value, setValue] = useState(String(field.name ?? ''));

    const fieldId = `field-number-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <input
                id={fieldId}
                className={styles.control}
                type="number"
                value={value}
                placeholder="Enter number"
                onChange={(event) => setValue(event.target.value)}
            />
        </div>
    );
}

/* =========================================================
   LONG TEXT
   ========================================================= */

export function FieldTextArea({ field, index }: FieldProps) {
    const [value, setValue] = useState(String(field.name ?? ''));

    const fieldId = `field-textarea-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <textarea
                id={fieldId}
                className={`${styles.control} ${styles.textarea}`}
                placeholder="Describe this entity... (use / to reference)"
                value={value}
                onChange={(event) => setValue(event.target.value)}
            />
        </div>
    );
}

/* =========================================================
   RICH TEXT
   ========================================================= */

export function FieldRichText({ field, index }: FieldProps) {
    const [value, setValue] = useState(String(field.name ?? ''));

    const fieldId = `field-richtext-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <textarea
                id={fieldId}
                className={`${styles.control} ${styles.richText}`}
                placeholder="Enter rich text..."
                value={value}
                onChange={(event) => setValue(event.target.value)}
            />
        </div>
    );
}

/* =========================================================
   SLIDER
   ========================================================= */

export function FieldSlider({ field, index }: FieldProps) {
    const [value, setValue] = useState(0);

    const fieldId = `field-slider-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <div className={styles.sliderHeader}>
                <label className={styles.fieldLabel} htmlFor={fieldId}>
                    {field.label}
                </label>

                <span className={styles.sliderValue}>{value}</span>
            </div>

            <input
                id={fieldId}
                className={styles.slider}
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(event) => setValue(Number(event.target.value))}
            />
        </div>
    );
}

/* =========================================================
   DROPDOWN
   ========================================================= */

export function FieldDropdown({ field, index }: FieldProps) {
    const [value, setValue] = useState('');

    const fieldId = `field-dropdown-${index}`;

    const options =
        field.options && field.options.length > 0
            ? field.options
            : ['Option 1', 'Option 2', 'Option 3'];

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <select
                id={fieldId}
                className={styles.control}
                value={value}
                onChange={(event) => setValue(event.target.value)}
            >
                <option value="">Select an option...</option>

                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

/* =========================================================
   MULTI SELECT
   ========================================================= */

export function FieldMultiselect({ field, index }: FieldProps) {
    const [selectedValues, setSelectedValues] = useState<string[]>([]);

    const fieldId = `field-multiselect-${index}`;

    const options = field.options ?? [];

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const values = Array.from(event.target.selectedOptions).map(
            (option) => option.value
        );

        setSelectedValues(values);
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <select
                id={fieldId}
                className={`${styles.control} ${styles.multiselect}`}
                multiple
                value={selectedValues}
                onChange={handleChange}
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

/* =========================================================
   TOGGLE
   ========================================================= */

export function FieldToggle({ field, index }: FieldProps) {
    const [checked, setChecked] = useState(false);

    const fieldId = `field-toggle-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <div className={styles.toggleRow}>
                <label className={styles.fieldLabel} htmlFor={fieldId}>
                    {field.label}
                </label>

                <label className={styles.switch}>
                    <input
                        id={fieldId}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setChecked(event.target.checked)}
                    />

                    <span className={styles.switchTrack}>
                        <span className={styles.switchThumb} />
                    </span>
                </label>
            </div>
        </div>
    );
}

/* =========================================================
   COLOR
   ========================================================= */

export function FieldColor({ field, index }: FieldProps) {
    const [value, setValue] = useState('#000000');

    const fieldId = `field-color-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <div className={styles.colorControl}>
                <input
                    id={fieldId}
                    type="color"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />

                <span>{value.toUpperCase()}</span>
            </div>
        </div>
    );
}

/* =========================================================
   IMAGES
   ========================================================= */

export function FieldImages({ field, index }: FieldProps) {
    const [imageNames, setImageNames] = useState<string[]>([]);

    const fieldId = `field-images-${index}`;

    const handleImages = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;

        if (!files) {
            setImageNames([]);
            return;
        }

        setImageNames(Array.from(files).map((file) => file.name));
    };

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <div className={styles.fileDropZone}>
                <input
                    id={fieldId}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                />

                <div className={styles.fileDropContent}>
                    <span className={styles.fileIcon}>+</span>

                    <span>Add images</span>

                    <small>PNG, JPG, WEBP</small>
                </div>
            </div>

            {imageNames.length > 0 && (
                <div className={styles.fileList}>
                    {imageNames.map((name) => (
                        <div className={styles.fileItem} key={name}>
                            {name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* =========================================================
   TREE
   ========================================================= */

export function FieldTree({ field, index }: FieldProps) {
    const [value, setValue] = useState('');

    const fieldId = `field-tree-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <select
                id={fieldId}
                className={styles.control}
                value={value}
                onChange={(event) => setValue(event.target.value)}
            >
                <option value="">Select...</option>
                <option value="root">Root</option>
                <option value="branch">Branch</option>
                <option value="leaf">Leaf</option>
            </select>
        </div>
    );
}

/* =========================================================
   DATE
   ========================================================= */

export function FieldDate({ field, index }: FieldProps) {
    const [value, setValue] = useState('');

    const fieldId = `field-date-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <input
                id={fieldId}
                className={styles.control}
                type="date"
                value={value}
                onChange={(event) => setValue(event.target.value)}
            />
        </div>
    );
}

/* =========================================================
   PORTRAIT
   ========================================================= */

export function FieldPortrait({ field, index }: FieldProps) {
    const [portraitName, setPortraitName] = useState('');
    const [preview, setPreview] = useState<string | null>(null);

    const fieldId = `field-portrait-${index}`;

    const handlePortrait = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            setPortraitName('');
            setPreview(null);
            return;
        }

        setPortraitName(file.name);

        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
    };

    return (
        <div
            className={`${styles.tmplField} ${styles.field} ${styles.portraitField}`}
        >
            <label className={styles.fieldLabel} htmlFor={fieldId}>
                {field.label}
            </label>

            <div className={styles.portraitBox}>
                {preview ? (
                    <img
                        src={preview}
                        alt="Portrait preview"
                        className={styles.portraitImage}
                    />
                ) : (
                    <div className={styles.emptyMedia}>
                        <span>No portrait yet</span>
                    </div>
                )}

                <input
                    id={fieldId}
                    type="file"
                    accept="image/*"
                    onChange={handlePortrait}
                    className={styles.hiddenFileInput}
                />

                <label htmlFor={fieldId} className={styles.mediaAddButton}>
                    +
                </label>
            </div>

            {portraitName && (
                <div className={styles.selectedFile}>{portraitName}</div>
            )}
        </div>
    );
}

/* =========================================================
   ENTITY LINK
   ========================================================= */

export function FieldEntityLink({ field, index }: FieldProps) {
    const [entityValue, setEntityValue] = useState(String(field.name ?? ''));

    const entityTypeId = `entity-type-${index}`;
    const entityId = `entity-${index}`;

    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={entityTypeId}>
                {field.label}
            </label>

            <select
                id={entityTypeId}
                className={styles.control}
                defaultValue="character"
            >
                <option value="character">character</option>

                <option value="location">location</option>

                <option value="item">item</option>

                <option value="event">event</option>
            </select>

            <input
                id={entityId}
                className={`${styles.control} ${styles.entityInput}`}
                type="text"
                placeholder="Select entity..."
                value={entityValue}
                onChange={(event) => setEntityValue(event.target.value)}
            />
        </div>
    );
}
