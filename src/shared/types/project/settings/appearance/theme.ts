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

export type BuiltInThemeMeta = {
    id: ThemesBuiltIn;
    name: string;
    isBuiltIn: true;
    supportedModes: 'light' | 'dark' | 'both';
    defaultShape?: ThemeBorderShape;
    defaultDensity?: UIDensity;
};

export type UserAddedTheme = string & {};
export type ThemeActive = ThemesBuiltIn | UserAddedTheme;

export type ThemeDefinition = {
    id: ThemeActive;
    name: string;
    isBuiltIn: boolean;
    defaultShape?: ThemeBorderShape;
    defaultDensity?: UIDensity;
} & (
    | {
          schemas: 'light';
          schemes: { light: ThemeColorTokens };
      }
    | {
          schemas: 'dark';
          schemes: { dark: ThemeColorTokens };
      }
    | {
          schemas: 'both';
          schemes: { light: ThemeColorTokens; dark: ThemeColorTokens };
      }
);

export type EditorLayoutSettings = {
    widthMode: 'full' | 'fixed';
    maxWidth: number;
    previewWidth: number;
    previewPosition: 'left' | 'right';
};

export type ThemeCycleConfig = {
    strategy: 'time-of-day' | 'interval' | 'on-launch';
    dayTheme?: ThemeActive;
    nightTheme?: ThemeActive;
    playlist?: ThemeActive[];
    intervalMinutes?: number;
};

export type ThemeSettings = {
    mode: ThemeMode;
    active: ThemeActive;
    shape: ThemeBorderShape;
    density: UIDensity;
    accentColor?: string;
    customThemes?: Record<string, ThemeDefinition>;
    cycleConfig?: ThemeCycleConfig;
};
