import { IconChevronDown } from '@tabler/icons-react';
import dialogStyles from '@/mainview/dialogs/variants/SettingsDialog.module.css';
import type {
    BuiltInThemeMeta,
    SupportedModes,
    ThemeActive,
    ThemeBorderShape,
    ThemeDefinition,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import styles from './ThemeBuilder.module.css';
import {
    BLANK_DARK_TOKENS,
    BLANK_LIGHT_TOKENS,
    CORE_COLOR_TOKENS,
    toColorInputValue,
    type CoreColorTokenKey,
    type ThemeDraft,
} from './themeDraft';
import ThemePreview from './ThemePreview';

const SUPPORTED_MODES: { value: SupportedModes; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'both', label: 'Light + Dark' },
];

const BORDER_SHAPES: ThemeBorderShape[] = ['rounded', 'pill', 'sharp'];
const DENSITIES: UIDensity[] = ['compact', 'comfortable', 'spacious'];

export interface ThemeBuilderFormProps {
    draft: ThemeDraft;
    builtIns: BuiltInThemeMeta[];
    customThemes: ThemeDefinition[];
    onChange: (draft: ThemeDraft) => void;
    onChooseBase: (baseId: ThemeActive | null) => void;
    onCancel: () => void;
    onSave: () => void;
    showTitle?: boolean;
}

export default function ThemeBuilderForm({
    draft,
    builtIns,
    customThemes,
    onChange,
    onChooseBase,
    onCancel,
    onSave,
    showTitle = true,
}: ThemeBuilderFormProps) {
    const isEditing = draft.isEditing;
    const showLight = draft.supportedModes !== 'dark';
    const showDark = draft.supportedModes !== 'light';
    const scheme = draft.schemeTab;
    const tokens = draft.schemes[scheme];

    const patch = (partial: Partial<ThemeDraft>) =>
        onChange({ ...draft, ...partial });

    const handleSupportedModes = (supportedModes: SupportedModes) => {
        const nextScheme =
            supportedModes === 'dark'
                ? 'dark'
                : supportedModes === 'light'
                  ? 'light'
                  : draft.schemeTab;

        patch({ supportedModes, schemeTab: nextScheme });
    };

    const handleBaseChange = (value: string) => {
        onChooseBase(value ? (value as ThemeActive) : null);
    };

    const handleTokenChange = (key: CoreColorTokenKey, value: string) => {
        patch({
            schemes: {
                ...draft.schemes,
                [scheme]: { ...tokens, [key]: value },
            },
        });
    };

    return (
        <div className={styles.themeBuilder}>
            {showTitle ? (
                <header className={styles.builderHeader}>
                    <div>
                        <h3 className={styles.builderTitle}>
                            {isEditing ? 'Edit theme' : 'Create theme'}
                        </h3>
                        <p className={styles.builderHint}>
                            {isEditing
                                ? 'Update the colors, shape and density of this user theme.'
                                : 'Start from scratch or clone an existing built-in or user theme, then make it yours.'}
                        </p>
                    </div>
                    <span className={styles.readonlyBadge}>
                        {isEditing ? 'User theme' : 'New theme'}
                    </span>
                </header>
            ) : (
                <p className={styles.builderIntro}>
                    {isEditing
                        ? 'Built-in presets stay read-only. Only user themes can be edited.'
                        : 'Pick a base below, tune the eight core tokens, then set the shape and density.'}
                </p>
            )}

            <section className={styles.builderSection}>
                <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Theme name</span>
                        <input
                            type="text"
                            className={dialogStyles.textInputFull}
                            placeholder="e.g. Cyberpunk Teal"
                            value={draft.name}
                            onChange={(e) => patch({ name: e.target.value })}
                        />
                    </label>

                    {!isEditing && (
                        <div className={styles.field}>
                            <span className={styles.fieldLabel}>
                                Start from
                            </span>
                            <div className={dialogStyles.selectWrapper}>
                                <select
                                    className={dialogStyles.select}
                                    value={draft.baseId ?? ''}
                                    onChange={(e) =>
                                        handleBaseChange(e.target.value)
                                    }
                                >
                                    <option value="">Blank theme</option>
                                    <optgroup label="Built-in themes">
                                        {builtIns.map((theme) => (
                                            <option
                                                key={theme.id}
                                                value={theme.id}
                                            >
                                                {theme.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                    {customThemes.length > 0 && (
                                        <optgroup label="My themes">
                                            {customThemes.map((theme) => (
                                                <option
                                                    key={theme.id}
                                                    value={theme.id}
                                                >
                                                    {theme.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <IconChevronDown
                                    size={14}
                                    className={dialogStyles.selectIcon}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.field}>
                    <span className={styles.fieldLabel}>Variants</span>
                    <div className={dialogStyles.segmentedToggle}>
                        {SUPPORTED_MODES.map((mode) => (
                            <button
                                key={mode.value}
                                type="button"
                                className={
                                    draft.supportedModes === mode.value
                                        ? dialogStyles.activeSegment
                                        : ''
                                }
                                onClick={() => handleSupportedModes(mode.value)}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.builderColumns}>
                <div className={styles.colorEditor}>
                    <div className={styles.sectionHeadingRow}>
                        <span className={styles.sectionHeading}>Colors</span>
                        <div className={styles.schemeTabs}>
                            {showLight && (
                                <button
                                    type="button"
                                    className={`${styles.schemeTab} ${
                                        scheme === 'light'
                                            ? styles.schemeTabActive
                                            : ''
                                    }`}
                                    onClick={() =>
                                        patch({ schemeTab: 'light' })
                                    }
                                >
                                    Light
                                </button>
                            )}
                            {showDark && (
                                <button
                                    type="button"
                                    className={`${styles.schemeTab} ${
                                        scheme === 'dark'
                                            ? styles.schemeTabActive
                                            : ''
                                    }`}
                                    onClick={() => patch({ schemeTab: 'dark' })}
                                >
                                    Dark
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.tokenGrid}>
                        {CORE_COLOR_TOKENS.map((token) => {
                            const fallback =
                                scheme === 'light'
                                    ? BLANK_LIGHT_TOKENS[token.key]
                                    : BLANK_DARK_TOKENS[token.key];

                            return (
                                <div
                                    key={token.key}
                                    className={styles.tokenRow}
                                    title={token.key}
                                >
                                    <span className={styles.tokenLabel}>
                                        {token.label}
                                    </span>
                                    <div className={styles.tokenInputs}>
                                        <input
                                            type="color"
                                            className={styles.colorInput}
                                            aria-label={`${token.label} color`}
                                            value={toColorInputValue(
                                                tokens[token.key],
                                                fallback
                                            )}
                                            onChange={(e) =>
                                                handleTokenChange(
                                                    token.key,
                                                    e.target.value
                                                )
                                            }
                                        />
                                        <input
                                            type="text"
                                            className={styles.hexInput}
                                            aria-label={`${token.label} hex value`}
                                            spellCheck={false}
                                            value={tokens[token.key]}
                                            onChange={(e) =>
                                                handleTokenChange(
                                                    token.key,
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <aside className={styles.previewColumn}>
                    <span className={styles.sectionHeading}>Live preview</span>
                    <ThemePreview
                        tokens={tokens}
                        shape={draft.shape}
                        density={draft.density}
                        scheme={scheme}
                    />
                </aside>
            </section>

            <section className={styles.builderSection}>
                <div className={styles.field}>
                    <span className={styles.fieldLabel}>Border shape</span>
                    <div className={dialogStyles.segmentedToggle}>
                        {BORDER_SHAPES.map((shape) => (
                            <button
                                key={shape}
                                type="button"
                                className={
                                    draft.shape === shape
                                        ? dialogStyles.activeSegment
                                        : ''
                                }
                                onClick={() => patch({ shape })}
                            >
                                {shape}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.field}>
                    <span className={styles.fieldLabel}>Interface density</span>
                    <div className={dialogStyles.segmentedToggle}>
                        {DENSITIES.map((density) => (
                            <button
                                key={density}
                                type="button"
                                className={
                                    draft.density === density
                                        ? dialogStyles.activeSegment
                                        : ''
                                }
                                onClick={() => patch({ density })}
                            >
                                {density}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <footer className={styles.builderActions}>
                <button
                    type="button"
                    className={dialogStyles.btnSecondary}
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={dialogStyles.btnAccent}
                    onClick={onSave}
                    disabled={!draft.name.trim()}
                >
                    {isEditing ? 'Update theme' : 'Save & apply'}
                </button>
            </footer>
        </div>
    );
}
