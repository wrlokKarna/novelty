import {
    IconChevronDown,
    IconChevronUp,
    IconPlus,
    IconX,
} from '@tabler/icons-react';
import dialogStyles from '@/mainview/dialogs/variants/SettingsDialog.module.css';
import type {
    BuiltInThemeMeta,
    ThemeActive,
    ThemeCycleConfig,
    ThemeDefinition,
    ThemeVariant,
} from '@/shared/types/project/settings/appearance/theme';
import styles from './CycleConfig.module.css';

const STRATEGIES: { value: ThemeCycleConfig['strategy']; label: string }[] = [
    { value: 'time-of-day', label: 'Time of day' },
    { value: 'interval', label: 'Interval' },
    { value: 'on-launch', label: 'On launch' },
];

const DEFAULT_CONFIG: ThemeCycleConfig = {
    strategy: 'time-of-day',
    intervalMinutes: 30,
    playlist: [],
};

type ThemeOption = {
    id: ThemeActive;
    name: string;
    supportedModes: ThemeVariant | 'both';
};

export interface CycleConfigProps {
    config?: ThemeCycleConfig;
    builtIns: BuiltInThemeMeta[];
    customThemes: ThemeDefinition[];
    effectiveThemeId: ThemeActive;
    onChange: (config: ThemeCycleConfig) => void;
    onNext: () => void;
}

function ThemeSelect({
    value,
    onChange,
    options,
    placeholder,
}: {
    value?: ThemeActive;
    onChange: (value: ThemeActive | undefined) => void;
    options: ThemeOption[];
    placeholder: string;
}) {
    return (
        <div className={dialogStyles.selectWrapper}>
            <select
                className={dialogStyles.select}
                value={value ?? ''}
                onChange={(event) =>
                    onChange(
                        (event.target.value || undefined) as
                            ThemeActive | undefined
                    )
                }
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
            <IconChevronDown size={14} className={dialogStyles.selectIcon} />
        </div>
    );
}

export default function CycleConfig({
    config: rawConfig,
    builtIns,
    customThemes,
    effectiveThemeId,
    onChange,
    onNext,
}: CycleConfigProps) {
    const config: ThemeCycleConfig = { ...DEFAULT_CONFIG, ...rawConfig };
    const playlist = config.playlist ?? [];

    const options: ThemeOption[] = [
        ...builtIns.map((theme) => ({
            id: theme.id,
            name: theme.name,
            supportedModes: theme.supportedModes,
        })),
        ...customThemes.map((theme) => ({
            id: theme.id,
            name: theme.name,
            supportedModes: theme.supportedModes,
        })),
    ];

    const optionById = new Map(options.map((option) => [option.id, option]));

    const patch = (partial: Partial<ThemeCycleConfig>) => {
        onChange({ ...config, ...partial });
    };

    const togglePlaylist = (themeId: ThemeActive) => {
        const isSelected = playlist.includes(themeId);
        patch({
            playlist: isSelected
                ? playlist.filter((id) => id !== themeId)
                : [...playlist, themeId],
        });
    };

    const movePlaylistItem = (index: number, direction: -1 | 1) => {
        const next = [...playlist];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        patch({ playlist: next });
    };

    const currentName =
        optionById.get(effectiveThemeId)?.name ?? String(effectiveThemeId);

    const dayOptions = options.filter(
        (option) => option.supportedModes !== 'dark'
    );
    const nightOptions = options.filter(
        (option) => option.supportedModes !== 'light'
    );

    return (
        <div className={styles.cycleConfig}>
            <div className={styles.cycleHeader}>
                <div>
                    <span className={styles.cycleTitle}>Cycle settings</span>
                    <p className={styles.cycleHint}>
                        Choose how themes rotate. Currently showing:{' '}
                        <strong>{currentName}</strong>
                    </p>
                </div>
                <button
                    type="button"
                    className={dialogStyles.btnSecondary}
                    onClick={onNext}
                >
                    Next theme
                </button>
            </div>

            <div className={styles.cycleField}>
                <span className={styles.cycleLabel}>Strategy</span>
                <div className={dialogStyles.segmentedToggle}>
                    {STRATEGIES.map((strategy) => (
                        <button
                            key={strategy.value}
                            type="button"
                            className={
                                config.strategy === strategy.value
                                    ? dialogStyles.activeSegment
                                    : ''
                            }
                            onClick={() => patch({ strategy: strategy.value })}
                        >
                            {strategy.label}
                        </button>
                    ))}
                </div>
            </div>

            {config.strategy === 'time-of-day' && (
                <div className={styles.cycleRow}>
                    <div className={styles.cycleField}>
                        <span className={styles.cycleLabel}>Day theme</span>
                        <ThemeSelect
                            value={config.dayTheme}
                            placeholder="Use active theme"
                            options={dayOptions}
                            onChange={(dayTheme) => patch({ dayTheme })}
                        />
                    </div>
                    <div className={styles.cycleField}>
                        <span className={styles.cycleLabel}>Night theme</span>
                        <ThemeSelect
                            value={config.nightTheme}
                            placeholder="Use active theme"
                            options={nightOptions}
                            onChange={(nightTheme) => patch({ nightTheme })}
                        />
                    </div>
                </div>
            )}

            {config.strategy === 'interval' && (
                <div className={styles.cycleField}>
                    <span className={styles.cycleLabel}>
                        Interval (minutes)
                    </span>
                    <input
                        type="number"
                        min={1}
                        max={1440}
                        className={dialogStyles.numberInput}
                        value={config.intervalMinutes ?? 30}
                        onChange={(event) =>
                            patch({
                                intervalMinutes: Math.max(
                                    1,
                                    Number(event.target.value) || 1
                                ),
                            })
                        }
                    />
                </div>
            )}

            {(config.strategy === 'interval' ||
                config.strategy === 'on-launch') && (
                <div className={styles.playlistBlock}>
                    <span className={styles.cycleLabel}>Playlist</span>

                    <div className={styles.playlistPicker}>
                        {options.map((option) => {
                            const selected = playlist.includes(option.id);
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`${styles.playlistOption} ${
                                        selected
                                            ? styles.playlistOptionActive
                                            : ''
                                    }`}
                                    onClick={() => togglePlaylist(option.id)}
                                >
                                    <IconPlus
                                        size={12}
                                        className={
                                            selected ? styles.plusSelected : ''
                                        }
                                    />
                                    {option.name}
                                </button>
                            );
                        })}
                    </div>

                    {playlist.length === 0 ? (
                        <span className={styles.playlistEmpty}>
                            No themes selected. The cycle will fall back to the
                            active theme.
                        </span>
                    ) : (
                        <ol className={styles.playlistOrder}>
                            {playlist.map((themeId, index) => (
                                <li key={themeId}>
                                    <span className={styles.playlistIndex}>
                                        {index + 1}
                                    </span>
                                    <span className={styles.playlistName}>
                                        {optionById.get(themeId)?.name ??
                                            themeId}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.playlistIconButton}
                                        aria-label="Move theme earlier"
                                        disabled={index === 0}
                                        onClick={() =>
                                            movePlaylistItem(index, -1)
                                        }
                                    >
                                        <IconChevronUp size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.playlistIconButton}
                                        aria-label="Move theme later"
                                        disabled={index === playlist.length - 1}
                                        onClick={() =>
                                            movePlaylistItem(index, 1)
                                        }
                                    >
                                        <IconChevronDown size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.playlistIconButton}
                                        aria-label="Remove theme from playlist"
                                        onClick={() =>
                                            patch({
                                                playlist: playlist.filter(
                                                    (id) => id !== themeId
                                                ),
                                            })
                                        }
                                    >
                                        <IconX size={14} />
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}
        </div>
    );
}
