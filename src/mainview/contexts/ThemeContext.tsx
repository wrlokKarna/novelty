import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import type {
    ThemeActive,
    ThemeBorderShape,
    ThemeMode,
    ThemeSettings,
    UIDensity,
} from '@/shared/types/project/settings/appearance/theme';
import { useSettings } from '../contexts/SettingsContext';
import { resolveEffectiveTheme } from '../utils/theme/resolveTheme';

interface ThemeContextValue {
    settings: ThemeSettings;
    resolvedScheme: 'light' | 'dark';
    effectiveThemeId: ThemeActive;
    setMode: (mode: ThemeMode) => void;
    setActiveTheme: (theme: ThemeActive) => void;
    setShape: (shape: ThemeBorderShape) => void;
    setDensity: (density: UIDensity) => void;
    stepCycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { settings, updateAppearance } = useSettings();

    const themeSettings: ThemeSettings = settings?.appearance?.theme ?? {
        mode: 'system',
        active: 'midnight-gold',
        shape: 'rounded',
        density: 'comfortable',
    };

    const handleUpdateTheme = (patch: Partial<ThemeSettings>) => {
        if (!settings?.appearance) return;
        updateAppearance('theme', {
            ...themeSettings,
            ...patch,
        });
    };

    const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : false
    );

    const [cycleIndex, setCycleIndex] = useState<number>(0);
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

    const resolved = useMemo(
        () =>
            resolveEffectiveTheme(themeSettings, systemPrefersDark, cycleIndex),
        [themeSettings, systemPrefersDark, cycleIndex]
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

        if (resolved.customTokens) {
            for (const [token, value] of Object.entries(
                resolved.customTokens
            )) {
                root.style.setProperty(token, value);
                appliedCustomKeysRef.current.push(token);
            }
        }

        if (themeSettings.accentColor) {
            root.style.setProperty(
                '--accent-primary',
                themeSettings.accentColor
            );
            appliedCustomKeysRef.current.push('--accent-primary');
        }
    }, [
        resolved,
        themeSettings.shape,
        themeSettings.density,
        themeSettings.accentColor,
    ]);

    const value: ThemeContextValue = {
        settings: themeSettings,
        resolvedScheme: resolved.resolvedScheme,
        effectiveThemeId: resolved.effectiveThemeId,
        setMode: (mode) => handleUpdateTheme({ mode }),
        setActiveTheme: (active) => handleUpdateTheme({ active }),
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
