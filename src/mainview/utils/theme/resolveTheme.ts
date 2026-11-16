import { getThemeMetadata } from '@/shared/constants/project/settings/appearance/themeRegistry';
import type {
    ThemeActive,
    ThemeSettings,
    ThemeVariant,
} from '@/shared/types/project/settings/appearance/theme';
import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';

export type ResolvedThemeResult = {
    effectiveThemeId: ThemeActive;
    resolvedScheme: ThemeVariant;
    isBuiltIn: boolean;
    customTokens?: ThemeColorTokens;
};

export type ThemePreviewTarget = {
    themeId: ThemeActive;
    scheme?: ThemeVariant;
};

function isDaytime(now: Date = new Date()): boolean {
    const hour = now.getHours();
    return hour >= 6 && hour < 18;
}

export function resolveEffectiveTheme(
    settings: ThemeSettings,
    systemPrefersDark: boolean,
    cycleIndex: number = 0,
    preview: ThemePreviewTarget | null = null
): ResolvedThemeResult {
    let effectiveThemeId: ThemeActive = settings.active;
    let desiredScheme: ThemeVariant = systemPrefersDark ? 'dark' : 'light';

    switch (settings.mode) {
        case 'light':
            desiredScheme = 'light';
            break;

        case 'dark':
            desiredScheme = 'dark';
            break;

        case 'system':
            desiredScheme = systemPrefersDark ? 'dark' : 'light';
            break;

        case 'cycle': {
            const config = settings.cycleConfig;
            if (config?.strategy === 'time-of-day') {
                const day = isDaytime();
                desiredScheme = day ? 'light' : 'dark';
                if (day && config.dayTheme) effectiveThemeId = config.dayTheme;
                if (!day && config.nightTheme)
                    effectiveThemeId = config.nightTheme;
            } else if (config?.playlist && config.playlist.length > 0) {
                effectiveThemeId =
                    config.playlist[cycleIndex % config.playlist.length];
                desiredScheme = systemPrefersDark ? 'dark' : 'light';
            } else {
                desiredScheme = cycleIndex % 2 === 0 ? 'light' : 'dark';
            }
            break;
        }
    }

    if (preview) {
        effectiveThemeId = preview.themeId;
        if (preview.scheme) desiredScheme = preview.scheme;
    }

    const meta = getThemeMetadata(effectiveThemeId, settings.customThemes);
    const supported = meta.supportedModes;

    let resolvedScheme: ThemeVariant = desiredScheme;
    if (supported === 'light') {
        resolvedScheme = 'light';
    } else if (supported === 'dark') {
        resolvedScheme = 'dark';
    }

    let customTokens: ThemeColorTokens | undefined;
    if (!meta.isBuiltIn) {
        if (meta.supportedModes === 'both') {
            customTokens = meta.schemes[resolvedScheme];
        } else if (meta.supportedModes === 'light') {
            customTokens = meta.schemes.light;
        } else {
            customTokens = meta.schemes.dark;
        }
    }

    return {
        effectiveThemeId,
        resolvedScheme,
        isBuiltIn: meta.isBuiltIn,
        customTokens,
    };
}
