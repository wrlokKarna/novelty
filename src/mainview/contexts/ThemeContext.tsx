import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { getThemeMetadata } from '@/shared/constants/project/settings/appearance/themeRegistry';
import type {
    ThemeActive,
    ThemeBorderShape,
    ThemeMode,
    ThemeSettings,
    ThemeVariant,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import { useSettings } from '../contexts/SettingsContext';
import {
    resolveEffectiveTheme,
    type ThemePreviewTarget,
} from '../utils/theme/resolveTheme';
import {
    getAccentTokenAssignments,
    getThemeTokenAssignments,
} from '../utils/theme/themeTokens';

interface ThemeContextValue {
    settings: ThemeSettings;
    resolvedScheme: ThemeVariant;
    preferredScheme: ThemeVariant;
    effectiveThemeId: ThemeActive;
    preview: ThemePreviewTarget | null;
    previewTheme: (themeId: ThemeActive, scheme?: ThemeVariant) => void;
    clearPreview: () => void;
    setMode: (mode: ThemeMode) => void;
    setActiveTheme: (theme: ThemeActive) => void;
    setShape: (shape: ThemeBorderShape) => void;
    setDensity: (density: UIDensity) => void;
    stepCycle: () => void;
}

const FALLBACK_THEME_SETTINGS: ThemeSettings = {
    mode: 'system',
    active: 'midnight-gold',
    shape: 'rounded',
    density: 'comfortable',
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function normalizeMode(mode: string | undefined): ThemeMode {
    // `custom` was a duplicate of `system` in older settings files.
    if (!mode || mode === 'custom') return 'system';
    if (mode === 'light' || mode === 'dark' || mode === 'cycle') return mode;
    return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { settings, updateAppearance } = useSettings();
    const rawThemeSettings = settings?.appearance?.theme;

    const themeSettings = useMemo<ThemeSettings>(() => {
        if (!rawThemeSettings) return FALLBACK_THEME_SETTINGS;

        return {
            ...FALLBACK_THEME_SETTINGS,
            ...rawThemeSettings,
            mode: normalizeMode((rawThemeSettings as { mode?: string }).mode),
        };
    }, [rawThemeSettings]);

    const handleUpdateTheme = useCallback(
        (patch: Partial<ThemeSettings>) => {
            if (!settings?.appearance) return;
            updateAppearance('theme', {
                ...themeSettings,
                ...patch,
            });
        },
        [settings?.appearance, themeSettings, updateAppearance]
    );

    const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : false
    );

    const [cycleIndex, setCycleIndex] = useState<number>(0);
    const [preview, setPreview] = useState<ThemePreviewTarget | null>(null);
    const appliedCustomKeysRef = useRef<string[]>([]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) =>
            setSystemPrefersDark(e.matches);

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        if (themeSettings.mode !== 'cycle') return;

        const strategy = themeSettings.cycleConfig?.strategy ?? 'time-of-day';
        if (strategy === 'on-launch') return;

        const intervalMs =
            strategy === 'interval'
                ? (themeSettings.cycleConfig?.intervalMinutes ?? 30) * 60_000
                : 60_000;

        const timer = window.setInterval(() => {
            setCycleIndex((prev) => prev + 1);
        }, intervalMs);

        return () => window.clearInterval(timer);
    }, [themeSettings.mode, themeSettings.cycleConfig]);

    const preferred = useMemo(
        () =>
            resolveEffectiveTheme(
                themeSettings,
                systemPrefersDark,
                cycleIndex,
                null
            ),
        [themeSettings, systemPrefersDark, cycleIndex]
    );

    const resolved = useMemo(
        () =>
            resolveEffectiveTheme(
                themeSettings,
                systemPrefersDark,
                cycleIndex,
                preview
            ),
        [themeSettings, systemPrefersDark, cycleIndex, preview]
    );

    useEffect(() => {
        const root = document.documentElement;

        root.setAttribute('data-theme', resolved.resolvedScheme);
        root.setAttribute('data-palette', resolved.effectiveThemeId);
        root.setAttribute('data-shape', themeSettings.shape);
        root.setAttribute('data-density', themeSettings.density);

        for (const key of appliedCustomKeysRef.current) {
            root.style.removeProperty(key);
        }
        appliedCustomKeysRef.current = [];

        const assignments = resolved.customTokens
            ? getThemeTokenAssignments(resolved.customTokens)
            : [];

        if (!preview && themeSettings.accentColor) {
            assignments.push(
                ...getAccentTokenAssignments(themeSettings.accentColor)
            );
        }

        for (const [token, value] of assignments) {
            root.style.setProperty(token, value);
            appliedCustomKeysRef.current.push(token);
        }
    }, [
        resolved,
        themeSettings.shape,
        themeSettings.density,
        themeSettings.accentColor,
        preview,
    ]);

    useEffect(
        () => () => {
            setPreview(null);
        },
        []
    );

    const previewTheme = useCallback(
        (themeId: ThemeActive, scheme?: ThemeVariant) => {
            setPreview({ themeId, scheme });
        },
        []
    );

    const clearPreview = useCallback(() => {
        setPreview(null);
    }, []);

    const setActiveTheme = useCallback(
        (active: ThemeActive) => {
            const meta = getThemeMetadata(active, themeSettings.customThemes);
            const patch: Partial<ThemeSettings> = {
                active,
                shape: meta.defaultShape ?? themeSettings.shape,
                density: meta.defaultDensity ?? themeSettings.density,
            };

            if (themeSettings.mode === 'cycle') {
                patch.mode =
                    meta.supportedModes === 'both'
                        ? 'system'
                        : meta.supportedModes;
            } else if (
                themeSettings.mode === 'light' &&
                meta.supportedModes === 'dark'
            ) {
                patch.mode = 'dark';
            } else if (
                themeSettings.mode === 'dark' &&
                meta.supportedModes === 'light'
            ) {
                patch.mode = 'light';
            }

            setPreview(null);
            handleUpdateTheme(patch);
        },
        [handleUpdateTheme, themeSettings]
    );

    const value: ThemeContextValue = {
        settings: themeSettings,
        resolvedScheme: resolved.resolvedScheme,
        preferredScheme: preferred.resolvedScheme,
        effectiveThemeId: preferred.effectiveThemeId,
        preview,
        previewTheme,
        clearPreview,
        setMode: (mode) => {
            setPreview(null);
            handleUpdateTheme({ mode });
        },
        setActiveTheme,
        setShape: (shape) => handleUpdateTheme({ shape }),
        setDensity: (density) => handleUpdateTheme({ density }),
        stepCycle: () => setCycleIndex((prev) => prev + 1),
    };

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used inside a ThemeProvider');
    }
    return ctx;
}
