import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { ThemeDefinition } from '@/shared/types/project/settings/appearance/theme';
import { RenderTheme } from './ThemeCard.util';
import styles from './UserThemeCard.module.css';

export interface UserThemeCardProps {
    cardObj: ThemeDefinition;
    onEdit?: (theme: ThemeDefinition) => void;
    onDelete?: (theme: ThemeDefinition) => void;
    isActive?: boolean;
}

export default function UserThemeCard({
    cardObj,
    onEdit,
    onDelete,
    isActive = false,
}: UserThemeCardProps) {
    const baseStyle: React.CSSProperties = {
        borderRadius: 'var(--border-radius-md, 8px)',
        border: '1px solid var(--border-subtle, #333)',
        background: isActive
            ? 'var(--bg-tertiary, #1e1e1e)'
            : 'var(--bg-elevated, #1a1a1a)',
    };

    const selectedStyle = isActive
        ? {
              borderColor: 'var(--accent-primary, #3b82f6)',
              boxShadow: '0 0 0 1px var(--accent-primary, #3b82f6)',
          }
        : {};

    return (
        <div
            className={styles.themeCard}
            style={{ ...baseStyle, ...selectedStyle }}
        >
            <div className={styles.themeCardHeader}>
                <div>
                    <span className={styles.label}>{cardObj.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {onEdit && (
                        <button
                            className={styles.iconButton}
                            aria-label={`Edit theme ${cardObj.name}`}
                            onClick={() => onEdit(cardObj)}
                            title="Edit this theme"
                        >
                            <IconPencil size={18} />
                        </button>
                    )}

                    {onDelete && (
                        <button
                            className={styles.iconButtonDelete}
                            aria-label={`Delete theme ${cardObj.name}`}
                            onClick={() => onDelete(cardObj)}
                            title="Delete this theme"
                        >
                            <IconTrash size={18} />
                        </button>
                    )}
                </div>
                <div className={styles.themeFeatures}>
                    {RenderTheme({ mode: cardObj.supportedModes })}
                </div>
            </div>

            <div className={styles.themePreview}></div>
        </div>
    );
}
