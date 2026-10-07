import { useEffect, useState } from 'react';
import { FieldDefinition } from '../../types';
import styles from './TemplateField.module.css';

type Props = {
    field: FieldDefinition;
    index: number;
};

export default function TemplateField({ field, index }: Props) {
    console.log(field.type);

    if (field.type === 'text') {
        return (
            <>
                <FieldText field={field} index={index} />
                <FieldTextEdit field={field} index={index} />
            </>
        );
    } else if (field.type === 'textarea' || field.type === 'richtext') {
        return (
            <>
                <FieldTextArea field={field} index={index} />
                <FieldTextAreaEdit field={field} index={index} />
            </>
        );
    } else if (field.type === 'number') {
        return (
            <>
                <FieldNumber field={field} index={index} />
                <FieldNumberEdit field={field} index={index} />
            </>
        );
    } else if (field.type === 'range') {
        return (
            <>
                <FieldRange field={field} index={index} />
                <FieldRangeEdit field={field} index={index} />
            </>
        );
    } else if (field.type === 'select') {
        return (
            <>
                <FieldSelect field={field} index={index} />
                <FieldSelectEdit field={field} index={index} />
            </>
        );
    } else if (field.type === 'multiselect') {
        return (
            <>
                <FieldMultiSelect field={field} index={index} />
                <FieldMultiSelectEdit field={field} index={index} />
            </>
        );
    } else {
        return <div>no comp {field.type}</div>;
    }
    // TemplateField {field.type}
}

function FieldCardHeader({
    field,
    index,
    card,
}: { card: 'view' | 'edit' } & Props) {
    return (
        <div
            className={`${card === 'view' ? 'fieldViewCard' : styles.fieldEditCard}`}
        >
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {/* textValue */})
            </label>
            {card === 'edit' && (
                <>
                    <button className={styles.deleteBtn}>
                        <span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32px"
                                height="32px"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M6 5H18M9 5V5C10.5769 3.16026 13.4231 3.16026 15 5V5M9 20H15C16.1046 20 17 19.1046 17 18V9C17 8.44772 16.5523 8 16 8H8C7.44772 8 7 8.44772 7 9V18C7 19.1046 7.89543 20 9 20Z"
                                    /*stroke="#000000"*/
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>
                    </button>
                    <button className={styles.dragBtn}>
                        <span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                /*fill="#000000"*/
                                fill="currentColor"
                                width="32px"
                                height="32px"
                                viewBox="0 0 24 24"
                            >
                                <path d="M10,4A2,2,0,1,1,8,2,2,2,0,0,1,10,4ZM8,10a2,2,0,1,0,2,2A2,2,0,0,0,8,10Zm0,8a2,2,0,1,0,2,2A2,2,0,0,0,8,18ZM16,6a2,2,0,1,0-2-2A2,2,0,0,0,16,6Zm0,8a2,2,0,1,0-2-2A2,2,0,0,0,16,14Zm0,8a2,2,0,1,0-2-2A2,2,0,0,0,16,22Z" />
                            </svg>
                        </span>
                    </button>
                </>
            )}
        </div>
    );
}

function FieldLabel({ field, index }: Props) {
    return (
        <label className={styles.fieldLabel} htmlFor={field.label + index}>
            {field.label} ({field.type}: {/*textVaule*/})
        </label>
    );
}

type FieldTextProps = {
    field: FieldDefinition;
    index: number;
};

export function FieldText({ field, index }: FieldTextProps) {
    const [textVaule, setTextVaule] = useState(field.name);
    return (
        <div
            className={`${styles.tmplField} ${styles.field} ${styles.tmplFieldText} ${styles.tmplFieldTextView}`}
        >
            {/*
                <label className={styles.fieldLabel} htmlFor={field.label + index}>
                    {field.label} ({field.type}: {textVaule})
                </label>
                <FieldLabel field={field} index={index} />
            */}
            <FieldCardHeader field={field} index={index} card="view" />
            <input
                id={field.label + index}
                value={textVaule}
                onChange={(e) => setTextVaule(e.target.value)}
            />
        </div>
    );
}

type FieldTextEditProps = {
    field: FieldDefinition;
    index: number;
};
export function FieldTextEdit({ field, index }: FieldTextEditProps) {
    return (
        <div
            className={`${styles.tmplField} ${styles.field} ${styles.tmplFieldText} ${styles.tmplFieldTextEdit}`}
        >
            <FieldCardHeader field={field} index={index} card="edit" />
            <div className={styles.inputPlaceholder}>
                <div className={styles.textPlaceholder}></div>
            </div>
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
            {/*
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {textAreaVaule})
            </label>
            */}
            <FieldCardHeader field={field} index={index} card="view" />
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

export function FieldTextAreaEdit({ field, index }: FieldTextAreaProps) {
    return (
        <div
            className={`${styles.tmplField} ${styles.field} ${styles.tmplFieldText} ${styles.tmplFieldTextAreaEdit}`}
        >
            {/*
            <label className={styles.fieldLabel} htmlFor="">
                {field.name}
            </label>
*/}
            <FieldCardHeader field={field} index={index} card="edit" />
            <div className={styles.textAreaPlaceholder}>
                <div className={styles.textAreaPlaceholderLine}></div>
                <div className={styles.textAreaPlaceholderLine}></div>
                <div className={styles.textAreaPlaceholderLine}></div>
                <div className={styles.textAreaPlaceholderLine}></div>
                <div className={styles.textAreaPlaceholderLine}></div>
            </div>
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
            {/*
            <label className={styles.fieldLabel} htmlFor={field.label + index}>
                {field.label} ({field.type}: {numberVaule})
            </label>
*/}
            <FieldCardHeader field={field} index={index} card="view" />
            <input
                type="number"
                onChange={(e) => setNumberVaule(e.target.value)}
            />
        </div>
    );
}
export function FieldNumberEdit({ field, index }: FieldNumberProps) {
    {
        /*  ${styles.tmplFieldText} ${styles.tmplFieldTextView} */
    }
    return (
        <div
            className={`${styles.tmplField} ${styles.tmplFieldEdit} ${styles.field}`}
        >
            <FieldCardHeader field={field} index={index} card="edit" />
            <div className={styles.numberInputPlaceholder}>
                <span className={styles.lineBar}></span>
            </div>
        </div>
    );
}

export function FieldRange({ field, index }: FieldNumberProps) {
    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <FieldLabel field={field} index={index} />
            <div>Range</div>
        </div>
    );
}
export function FieldRangeEdit({ field, index }: FieldNumberProps) {
    return (
        <div className={`${styles.tmplField} ${styles.field}`}>
            <FieldLabel field={field} index={index} />
            <div>Range Edit</div>
        </div>
    );
}

export function FieldSelect({ field, index }: Props) {
    return (
        <div
            className={`${styles.tmplField} ${styles.tmplFieldView} ${styles.field}`}
        >
            <FieldCardHeader field={field} index={index} card="view" />
            <select name="" id=""></select>
        </div>
    );
}
export function FieldSelectEdit({ field, index }: Props) {
    return (
        <div
            className={`${styles.tmplField} ${styles.tmplFieldEdit} ${styles.field}`}
        >
            <FieldCardHeader field={field} index={index} card="edit" />
            <select name="" id=""></select>
        </div>
    );
}
export function FieldMultiSelect({ field, index }: Props) {
    return (
        <div
            className={`${styles.tmplField} ${styles.tmplFieldView} ${styles.field}`}
        >
            <FieldCardHeader field={field} index={index} card="view" />
            <div className={styles.selectcont}></div>
        </div>
    );
}

type multiSelectOption = {
    label: string;
    enabled: boolean;
};
type multiSelectArr = multiSelectOption[];
export function FieldMultiSelectEdit({ field, index }: Props) {
    const [options, setOptions] = useState<multiSelectArr>([]);

    const [inputValue, SetInputValue] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputValue === '') return;
        setOptions([...options, { label: inputValue, enabled: false }]);
        SetInputValue('');
    };

    const handleOptToggle = (index: number) => {
        setOptions((prevOptions) => {
            const newArr = [...prevOptions];
            newArr[index] = {
                ...newArr[index],
                enabled: !newArr[index].enabled,
            };
            return newArr;
        });
    };

    const handleOptDel = (index: number) => {
        setOptions((prevOptions) => {
            const newArr = [...prevOptions];
            newArr.splice(index, 1);
            return newArr;
        });
    };

    useEffect(() => {
        setOptions([
            {
                label: '1',
                enabled: false,
            },
            {
                label: '2',
                enabled: true,
            },
            {
                label: '3',
                enabled: false,
            },
            {
                label: '4',
                enabled: false,
            },
        ]);
    }, []);
    return (
        <div
            className={`${styles.tmplField} ${styles.tmplFieldEdit} ${styles.field}`}
        >
            <FieldCardHeader field={field} index={index} card="edit" />
            <div className={styles.selectcont}>
                <div className={styles.multiselectInputPills}></div>
                <div className={styles.multiselectInputPills}></div>
                <div className={styles.multiselectInputPills}></div>
            </div>
            <div className={styles.options}>
                {options.map((opt, index) => (
                    <div className={styles.option}>
                        <button onClick={() => handleOptToggle(index)}>
                            {opt.enabled ? (
                                <div className={`${styles.optToggle}`}></div>
                            ) : (
                                <div
                                    className={`${styles.optToggle} ${styles.inactive}`}
                                ></div>
                            )}
                        </button>
                        <span>{opt.label}</span>
                        <button
                            className={styles.delOptBtn}
                            onClick={() => handleOptDel(index)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18px"
                                height="18px"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M6 5H18M9 5V5C10.5769 3.16026 13.4231 3.16026 15 5V5M9 20H15C16.1046 20 17 19.1046 17 18V9C17 8.44772 16.5523 8 16 8H8C7.44772 8 7 8.44772 7 9V18C7 19.1046 7.89543 20 9 20Z"
                                    /*stroke="#000000"*/
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
            <div className={styles.addForm}>
                <form action="" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="add option and press enter or button"
                        value={inputValue}
                        onChange={(e) => SetInputValue(e.currentTarget.value)}
                    />
                    <button type="submit" disabled={inputValue.trim() === ''}>
                        add
                    </button>
                </form>
            </div>
        </div>
    );
}
