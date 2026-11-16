import type {
    SupportedModes,
    ThemeBorderShape,
    ThemeVariant,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';
import styles from './ThemeCard.common.module.css';

/**
 * Dual-variant themes follow the scheme in use; single-variant themes always
 * render their one supported scheme. Written as a guard so TypeScript narrows
 * `'both'` away from the return type.
 */
export function resolveCardScheme(
    supported: SupportedModes,
    activeScheme: ThemeVariant
): ThemeVariant {
    return supported === 'both' ? activeScheme : supported;
}

export function RenderTheme({ mode }: { mode: SupportedModes }) {
    if (mode === 'both') return null;

    return (
        <div className={styles.themeSupportedModes}>
            <span>{mode}</span>
        </div>
    );
}

export function ThemeVariantToggle({
    value,
    onChange,
}: {
    value: ThemeVariant;
    onChange: (variant: ThemeVariant) => void;
}) {
    return (
        <div className={styles.themeVariantToggle}>
            {(['light', 'dark'] as ThemeVariant[]).map((variant) => (
                <button
                    key={variant}
                    type="button"
                    className={
                        value === variant ? styles.themeVariantActive : ''
                    }
                    aria-pressed={value === variant}
                    onClick={(event) => {
                        event.stopPropagation();
                        onChange(variant);
                    }}
                >
                    {variant}
                </button>
            ))}
        </div>
    );
}

const SWATCH_TOKENS: { key: keyof ThemeColorTokens; label: string }[] = [
    { key: '--bg-primary', label: 'Background' },
    { key: '--accent-primary', label: 'Accent' },
    { key: '--text-primary', label: 'Text' },
    { key: '--border-subtle', label: 'Border' },
];

export function ThemeSwatchRow({ tokens }: { tokens: ThemeColorTokens }) {
    return (
        <div className={styles.themeSwatches}>
            {SWATCH_TOKENS.map((token) => (
                <span
                    key={token.key}
                    className={styles.themeSwatch}
                    style={{ backgroundColor: tokens[token.key] }}
                    title={`${token.label}: ${tokens[token.key]}`}
                />
            ))}
        </div>
    );
}

export function ThemeMetaLine({
    shape,
    density,
}: {
    shape?: ThemeBorderShape;
    density?: UIDensity;
}) {
    const parts = [shape, density].filter(Boolean);
    if (parts.length === 0) return null;

    return <span className={styles.themeMetaLine}>{parts.join(' · ')}</span>;
}
