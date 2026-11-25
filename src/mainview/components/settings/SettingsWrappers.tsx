import styles from './../../dialogs/variants/SettingsDialog.module.css';

export function Toggle({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={`${styles.toggleSwitch} ${checked ? styles.toggleActive : ''}`}
            onClick={() => onChange(!checked)}
            disabled={disabled}
        >
            <span className={styles.toggleThumb} />
        </button>
    );
}

export function NumberInput({
    value,
    onChange,
    min,
    max,
    disabled,
    id,
}: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    id: string;
}) {
    return (
        <input
            id={id}
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            min={min}
            max={max}
            disabled={disabled}
            className={styles.numberInput}
        />
    );
}
