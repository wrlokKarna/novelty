import type { ThemeColorTokens } from './themeTokens';

export type ThemeMode = 'light' | 'dark' | 'system' | 'cycle';

export type ThemeVariant = 'light' | 'dark';

export type ThemesBuiltIn =
    | 'default'
    | 'sapphire-slate'
    | 'midnight-gold'
    | 'emerald-noir'
    | 'crimson-dusk';

export type ThemeBorderShape = 'rounded' | 'pill' | 'sharp';
export type UIDensity = 'compact' | 'comfortable' | 'spacious';

export type SupportedModes = 'light' | 'dark' | 'both';
export type BuiltInThemeMeta = {
    id: ThemesBuiltIn;
    name: string;
    isBuiltIn: true;
    supportedModes: SupportedModes;
    defaultShape?: ThemeBorderShape;
    defaultDensity?: UIDensity;
};

export type UserAddedTheme = string & {};
export type ThemeActive = ThemesBuiltIn | UserAddedTheme;

export type ThemeDefinition = {
    id: ThemeActive;
    name: string;
    isBuiltIn: false;
    defaultShape?: ThemeBorderShape;
    defaultDensity?: UIDensity;
} & (
    | {
          supportedModes: 'light';
          schemes: { light: ThemeColorTokens };
      }
    | {
          supportedModes: 'dark';
          schemes: { dark: ThemeColorTokens };
      }
    | {
          supportedModes: 'both';
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
