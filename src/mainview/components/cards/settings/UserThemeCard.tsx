import type { CSSProperties } from 'react';
import {
    IconArrowBearRight2,
    IconPencil,
    IconTrash,
} from '@tabler/icons-react';
import type {
    ThemeDefinition,
    ThemeVariant,
} from '@/shared/types/project/settings/appearance/theme';
import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';
import {
    BLANK_DARK_TOKENS,
    BLANK_LIGHT_TOKENS,
} from '../../settings/theme/themeDraft';
import commonStyles from './ThemeCard.common.module.css';
import ThemeCardBase from './ThemeCardBase';

export interface UserThemeCardProps {
    cardObj: ThemeDefinition;
    onEdit?: (theme: ThemeDefinition) => void;
    onDelete?: (theme: ThemeDefinition) => void;
    onSelect?: (theme: ThemeDefinition) => void;
    onUseAsBase?: (theme: ThemeDefinition) => void;
    onPreviewStart?: (theme: ThemeDefinition, scheme?: ThemeVariant) => void;
    onPreviewEnd?: () => void;
    isActive?: boolean;
    isPreviewing?: boolean;
    activeScheme?: ThemeVariant;
}

function getPreviewTokens(
    theme: ThemeDefinition,
    scheme: ThemeVariant
): ThemeColorTokens {
    const fallback =
        scheme === 'light' ? BLANK_LIGHT_TOKENS : BLANK_DARK_TOKENS;

    if (theme.supportedModes === 'light') {
        return { ...fallback, ...theme.schemes.light };
    }

    if (theme.supportedModes === 'dark') {
        return { ...fallback, ...theme.schemes.dark };
    }

    return { ...fallback, ...theme.schemes[scheme] };
}

export default function UserThemeCard({
    cardObj,
    onEdit,
    onDelete,
    onSelect,
    onUseAsBase,
    onPreviewStart,
    onPreviewEnd,
    isActive = false,
    isPreviewing = false,
    activeScheme = 'dark',
}: UserThemeCardProps) {
    const baseStyle: CSSProperties = {
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border-subtle, #333)',
        background: isActive
            ? 'var(--bg-tertiary, #1e1e1e)'
            : 'var(--bg-elevated, #1a1a1a)',
    };

    const selectedStyle: CSSProperties = isActive
        ? {
              borderColor: 'var(--accent-primary, #3b82f6)',
              boxShadow: '0 0 0 1px var(--accent-primary, #3b82f6)',
          }
        : {};

    const actions = (
        <>
            {onUseAsBase && (
                <button
                    type="button"
                    className={commonStyles.iconButton}
                    aria-label={`Create a theme based on ${cardObj.name}`}
                    title="Use as base for a new theme"
                    onClick={(event) => {
                        event.stopPropagation();
                        onUseAsBase(cardObj);
                    }}
                >
                    <IconArrowBearRight2 size={16} />
                </button>
            )}

            {onEdit && (
                <button
                    type="button"
                    className={commonStyles.iconButton}
                    aria-label={`Edit theme ${cardObj.name}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit(cardObj);
                    }}
                    title="Edit this theme"
                >
                    <IconPencil size={16} />
                </button>
            )}

            {onDelete && (
                <button
                    type="button"
                    className={commonStyles.iconButtonDelete}
                    aria-label={`Delete theme ${cardObj.name}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete(cardObj);
                    }}
                    title="Delete this theme"
                >
                    <IconTrash size={16} />
                </button>
            )}
        </>
    );

    return (
        <ThemeCardBase
            name={cardObj.name}
            supportedModes={cardObj.supportedModes}
            activeScheme={activeScheme}
            isActive={isActive}
            isPreviewing={isPreviewing}
            shape={cardObj.defaultShape}
            density={cardObj.defaultDensity}
            resolveTokens={(scheme) => getPreviewTokens(cardObj, scheme)}
            onSelect={onSelect ? () => onSelect(cardObj) : undefined}
            onPreviewStart={(scheme) => onPreviewStart?.(cardObj, scheme)}
            onPreviewEnd={onPreviewEnd}
            style={{ ...baseStyle, ...selectedStyle }}
            headerStart={
                <span className={commonStyles.label}>{cardObj.name}</span>
            }
            headerActions={actions}
        />
    );
}
