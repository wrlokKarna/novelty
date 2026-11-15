import type { BuiltInThemeMeta } from '@/shared/types/project/settings/appearance/theme';
import styles from './BuiltInThemeCard.module.css';

export interface BuiltInThemeCardProps {
    theme: BuiltInThemeMeta;
    activeId?: string;
}

//const DEFAULT_BG_COLOR = '#0f0f23';
//const DEFAULT_TEXT_COLOR = '#e8e8e8';
//const DEFAULT_ACCENT_COLOR = '#7c3aed';

export default function BuiltInThemeCard({
    theme,
    activeId = '',
}: BuiltInThemeCardProps) {
    /*
      const getPreviewColors = (): [string, string, string] => {

          const themeMeta = theme as unknown as {
              schemes?: {
                  light?: {
                      '--bg-primary': string;
                      '--text-primary': string;
                      '--accent-primary': string;
                  };
              };
          };

          if (themeMeta.schemes?.light) {
              return [
                  themeMeta.schemes.light['--bg-primary'] || DEFAULT_BG_COLOR,
                  themeMeta.schemes.light['--text-primary'] || DEFAULT_TEXT_COLOR,
                  themeMeta.schemes.light['--accent-primary'] ||
                      DEFAULT_ACCENT_COLOR,
              ];
          }

          return [DEFAULT_BG_COLOR, DEFAULT_TEXT_COLOR, DEFAULT_ACCENT_COLOR];
      };

      const [bgColor, textColor, accentColor] = getPreviewColors();
    */

    const isThisActive = activeId === theme.id;

    return (
        <div
            className={`${styles.themeCard} ${isThisActive ? styles.active : ''}`}
            style={{
                ...(isThisActive && {
                    background: 'var(--bg-tertiary, #1e1e1e)',
                }),
            }}
        >
            <div className={styles.themeHeader}>
                {' '}
                <div className={styles.themeNameContainer}>
                    <span className={styles.label}>{theme.name}</span>
                    <span className={styles.builtInBadge}>Built-in</span>
                </div>
            </div>
            <div className={styles.themePreview}>
                <div
                    className={styles.themeColorPreviewDot}
                    style={{
                        backgroundColor: `var(--theme-${theme.id}-background)`,
                        border: `1px solid var(--theme-${theme.id}-color-text)`,
                    }}
                />
                <div
                    className={styles.themeColorPreviewDot}
                    style={{
                        backgroundColor: `var(--theme-${theme.id}-accent)`,
                        opacity: 0.7,
                    }}
                />
                <div
                    className={styles.themeColorPreviewDot}
                    style={{
                        backgroundColor: `var(--theme-${theme.id}-color-text)`,
                    }}
                />
                <div
                    className={styles.themeColorPreviewDot}
                    style={{
                        backgroundColor: `var(--theme-${theme.id}-highlight)`,
                    }}
                />
            </div>
        </div>
    );
}
