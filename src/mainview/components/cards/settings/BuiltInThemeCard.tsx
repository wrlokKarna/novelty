import { IconArrowBearRight2 } from '@tabler/icons-react';
import { BUILT_IN_THEME_TOKENS } from '@/shared/constants/project/settings/appearance/builtInThemeTokens';
import type {
    BuiltInThemeMeta,
    ThemeVariant,
} from '@/shared/types/project/settings/appearance/theme';
import styles from './BuiltInThemeCard.module.css';
import commonStyles from './ThemeCard.common.module.css';
import ThemeCardBase from './ThemeCardBase';

export interface BuiltInThemeCardProps {
    theme: BuiltInThemeMeta;
    activeId?: string;
    activeScheme?: ThemeVariant;
    isPreviewing?: boolean;
    onSelect?: (theme: BuiltInThemeMeta) => void;
    onUseAsBase?: (theme: BuiltInThemeMeta) => void;
    onPreviewStart?: (theme: BuiltInThemeMeta, scheme?: ThemeVariant) => void;
    onPreviewEnd?: () => void;
}

export default function BuiltInThemeCard({
    theme,
    activeId = '',
    activeScheme = 'dark',
    isPreviewing = false,
    onSelect,
    onUseAsBase,
    onPreviewStart,
    onPreviewEnd,
}: BuiltInThemeCardProps) {
    const isThisActive = activeId === theme.id;

    return (
        <ThemeCardBase
            name={theme.name}
            supportedModes={theme.supportedModes}
            activeScheme={activeScheme}
            isActive={isThisActive}
            isPreviewing={isPreviewing}
            shape={theme.defaultShape}
            density={theme.defaultDensity}
            resolveTokens={(scheme) => BUILT_IN_THEME_TOKENS[theme.id][scheme]}
            onSelect={onSelect ? () => onSelect(theme) : undefined}
            onPreviewStart={(scheme) => onPreviewStart?.(theme, scheme)}
            onPreviewEnd={onPreviewEnd}
            className={styles.themeCard}
            headerStart={
                <div className={styles.themeNameContainer}>
                    <span className={commonStyles.label}>{theme.name}</span>
                    <span className={styles.builtInBadge}>built-in</span>
                    {isThisActive && (
                        <span className={styles.activeThemeBadge}>active</span>
                    )}
                </div>
            }
            headerActions={
                onUseAsBase ? (
                    <button
                        type="button"
                        className={commonStyles.iconButton}
                        title={`Create a theme based on ${theme.name}`}
                        aria-label={`Create a theme based on ${theme.name}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onUseAsBase(theme);
                        }}
                    >
                        <IconArrowBearRight2 size={16} />
                    </button>
                ) : undefined
            }
        />
    );
}
