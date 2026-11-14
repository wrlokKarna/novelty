import type {
    BuiltInThemeMeta,
    ThemeActive,
    ThemeDefinition,
    ThemesBuiltIn,
} from '@/shared/types/project/settings/appearance/theme';

//'@/shared/types/utils/contexts/theme';

export const BUILT_IN_THEMES: Record<ThemesBuiltIn, BuiltInThemeMeta> = {
    default: {
        id: 'default',
        name: 'Default',
        isBuiltIn: true,
        supportedModes: 'both',
    },
    'sapphire-slate': {
        id: 'sapphire-slate',
        name: 'Sapphire Slate',
        isBuiltIn: true,
        supportedModes: 'both',
    },
    'midnight-gold': {
        id: 'midnight-gold',
        name: 'Midnight Gold',
        isBuiltIn: true,
        supportedModes: 'dark',
    },
    'emerald-noir': {
        id: 'emerald-noir',
        name: 'Emerald Noir',
        isBuiltIn: true,
        supportedModes: 'dark',
    },
    'crimson-dusk': {
        id: 'crimson-dusk',
        name: 'Crimson Dusk',
        isBuiltIn: true,
        supportedModes: 'both',
    },
};

export function getThemeMetadata(
    themeId: ThemeActive,
    customThemes?: Record<string, ThemeDefinition>
): BuiltInThemeMeta | ThemeDefinition {
    if (themeId in BUILT_IN_THEMES) {
        return BUILT_IN_THEMES[themeId as ThemesBuiltIn];
    }
    if (customThemes && customThemes[themeId]) {
        return customThemes[themeId];
    }
    return BUILT_IN_THEMES.default;
}
