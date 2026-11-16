import { BUILT_IN_THEME_TOKENS } from '@/shared/constants/project/settings/appearance/builtInThemeTokens';
import { BUILT_IN_THEMES } from '@/shared/constants/project/settings/appearance/themeRegistry';
import type {
    SupportedModes,
    ThemeActive,
    ThemeBorderShape,
    ThemeDefinition,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';

export type CoreColorTokenKey =
    | '--bg-primary'
    | '--bg-secondary'
    | '--bg-elevated'
    | '--text-primary'
    | '--text-secondary'
    | '--accent-primary'
    | '--accent-hover'
    | '--border-subtle';

export const CORE_COLOR_TOKENS: { key: CoreColorTokenKey; label: string }[] = [
    { key: '--bg-primary', label: 'Background' },
    { key: '--bg-secondary', label: 'Background (secondary)' },
    { key: '--bg-elevated', label: 'Elevated surface' },
    { key: '--text-primary', label: 'Text' },
    { key: '--text-secondary', label: 'Text (secondary)' },
    { key: '--accent-primary', label: 'Accent' },
    { key: '--accent-hover', label: 'Accent (hover)' },
    { key: '--border-subtle', label: 'Border' },
];

export type ThemeScheme = 'light' | 'dark';

export type ThemeDraft = {
    id: string | null;
    name: string;
    baseId: ThemeActive | null;
    supportedModes: SupportedModes;
    schemeTab: ThemeScheme;
    schemes: { light: ThemeColorTokens; dark: ThemeColorTokens };
    shape: ThemeBorderShape;
    density: UIDensity;
    isEditing: boolean;
};

export const BLANK_LIGHT_TOKENS: ThemeColorTokens = {
    ...BUILT_IN_THEME_TOKENS.default.light,
};

export const BLANK_DARK_TOKENS: ThemeColorTokens = {
    ...BUILT_IN_THEME_TOKENS.default.dark,
};

function normalizeTokens(
    source: Partial<ThemeColorTokens> | undefined,
    fallback: ThemeColorTokens
): ThemeColorTokens {
    const normalized: ThemeColorTokens = { ...fallback };

    if (!source) return normalized;

    for (const key of Object.keys(source) as (keyof ThemeColorTokens)[]) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) {
            normalized[key] = value;
        }
    }

    return normalized;
}

function getDefinitionSchemes(theme: ThemeDefinition): {
    light: ThemeColorTokens;
    dark: ThemeColorTokens;
} {
    const light =
        theme.supportedModes === 'dark' ? undefined : theme.schemes.light;
    const dark =
        theme.supportedModes === 'light' ? undefined : theme.schemes.dark;

    return {
        light: normalizeTokens(light, BLANK_LIGHT_TOKENS),
        dark: normalizeTokens(dark, BLANK_DARK_TOKENS),
    };
}

function getBaseMeta(
    themeId: ThemeActive,
    customThemes: Record<string, ThemeDefinition>
): {
    name: string;
    supportedModes: SupportedModes;
    shape: ThemeBorderShape;
    density: UIDensity;
    schemes: { light: ThemeColorTokens; dark: ThemeColorTokens };
} {
    const custom = customThemes[themeId];
    if (custom) {
        return {
            name: custom.name,
            supportedModes: custom.supportedModes,
            shape: custom.defaultShape ?? 'rounded',
            density: custom.defaultDensity ?? 'comfortable',
            schemes: getDefinitionSchemes(custom),
        };
    }

    if (themeId in BUILT_IN_THEMES) {
        const builtIn =
            BUILT_IN_THEMES[themeId as keyof typeof BUILT_IN_THEMES];
        const tokens = BUILT_IN_THEME_TOKENS[builtIn.id];

        return {
            name: builtIn.name,
            supportedModes: builtIn.supportedModes,
            shape: builtIn.defaultShape ?? 'rounded',
            density: builtIn.defaultDensity ?? 'comfortable',
            schemes: {
                light: { ...tokens.light },
                dark: { ...tokens.dark },
            },
        };
    }

    return {
        name: themeId,
        supportedModes: 'both',
        shape: 'rounded',
        density: 'comfortable',
        schemes: {
            light: { ...BLANK_LIGHT_TOKENS },
            dark: { ...BLANK_DARK_TOKENS },
        },
    };
}

export function createBlankDraft(): ThemeDraft {
    return {
        id: null,
        name: '',
        baseId: null,
        supportedModes: 'both',
        schemeTab: 'light',
        schemes: {
            light: { ...BLANK_LIGHT_TOKENS },
            dark: { ...BLANK_DARK_TOKENS },
        },
        shape: 'rounded',
        density: 'comfortable',
        isEditing: false,
    };
}

export function draftFromBase(
    baseId: ThemeActive,
    customThemes: Record<string, ThemeDefinition> = {}
): ThemeDraft {
    const base = getBaseMeta(baseId, customThemes);

    return {
        ...createBlankDraft(),
        name: `Copy of ${base.name}`,
        baseId,
        supportedModes: base.supportedModes,
        schemeTab: base.supportedModes === 'dark' ? 'dark' : 'light',
        schemes: base.schemes,
        shape: base.shape,
        density: base.density,
    };
}

export function applyBaseToDraft(
    draft: ThemeDraft,
    baseId: ThemeActive,
    customThemes: Record<string, ThemeDefinition> = {}
): ThemeDraft {
    const base = draftFromBase(baseId, customThemes);
    const shouldRename =
        !draft.name.trim() || draft.name.startsWith('Copy of ');

    return {
        ...draft,
        baseId,
        name: shouldRename ? base.name : draft.name,
        supportedModes: base.supportedModes,
        schemeTab: base.schemeTab,
        schemes: base.schemes,
        shape: base.shape,
        density: base.density,
    };
}

export function draftFromTheme(theme: ThemeDefinition): ThemeDraft {
    return {
        id: theme.id,
        name: theme.name,
        baseId: null,
        supportedModes: theme.supportedModes,
        schemeTab: theme.supportedModes === 'dark' ? 'dark' : 'light',
        schemes: getDefinitionSchemes(theme),
        shape: theme.defaultShape ?? 'rounded',
        density: theme.defaultDensity ?? 'comfortable',
        isEditing: true,
    };
}

export function draftToThemeDefinition(draft: ThemeDraft): ThemeDefinition {
    const base = {
        id: draft.id ?? `custom-${Date.now()}`,
        name: draft.name.trim(),
        isBuiltIn: false as const,
        defaultShape: draft.shape,
        defaultDensity: draft.density,
    };

    if (draft.supportedModes === 'light') {
        return {
            ...base,
            supportedModes: 'light',
            schemes: { light: draft.schemes.light },
        };
    }

    if (draft.supportedModes === 'dark') {
        return {
            ...base,
            supportedModes: 'dark',
            schemes: { dark: draft.schemes.dark },
        };
    }

    return {
        ...base,
        supportedModes: 'both',
        schemes: {
            light: draft.schemes.light,
            dark: draft.schemes.dark,
        },
    };
}

export function toColorInputValue(value: string, fallback: string): string {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;

    if (/^#[0-9a-f]{3}$/i.test(value)) {
        return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }

    return fallback;
}
