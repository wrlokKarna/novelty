import type { ThemeColorTokens } from './themeTokens';

export type ThemeMode = 'light' | 'dark' | 'system' | 'cycle' | 'custom';

export type ThemeBorderShape = 'rounded' | 'pill' | 'sharp';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';

export type ThemesBuiltIn =
    | 'default'
    | 'sapphire-slate'
    | 'midnight-gold'
    | 'emerald-noir'
    | 'crimson-dusk';

export type UserAddedTheme = string & {};
export type ThemeActive = ThemesBuiltIn | UserAddedTheme;

export type ThemeDefinition = {
    id: ThemeActive;
    name: string;
    isBuiltIn: boolean;
    /** Supports light-only, dark-only, or dual-mode themes */
    schemes: {
        light?: ThemeColorTokens;
        dark?: ThemeColorTokens;
        schemas: 'light' | 'dark' | 'both';
    };
    defaultShape?: ThemeBorderShape;
    defaultDensity?: UIDensity;
};

export type EditorLayoutSettings = {
    widthMode: 'full' | 'fixed';
    maxWidth: number;
    previewWidth: number;
    previewPosition: 'left' | 'right';
};

export type ThemeSettings = {
    mode: ThemeMode; // 'light' | 'dark' | 'system' | 'custom' | 'custom system'
    active: ThemeActive; // 'sapphire-slate' | 'midnight-gold' | custom ID
    shape: ThemeBorderShape; // 'rounded' | 'pill' | 'sharp'
    density: UIDensity; // 'compact' | 'comfortable' | 'spacious'
    accentColor?: string; // Optional override on top of any active theme
    customThemes?: Record<string, ThemeDefinition>;
};
