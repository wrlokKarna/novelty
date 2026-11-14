import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import type {
    PreferredTheme,
    ThemeContextType,
} from '@/shared/types/utils/contexts/theme';

const ThemeContext = createContext<ThemeContextType>({
    preferredTheme: 'light',
    colorTheme: 'light',
    setColorTheme: () => {},
    shapeTheme: 'rounded',
    setShapeTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [preferredTheme, setPreferredTheme] =
        useState<PreferredTheme>('light');

    useEffect(() => {
        try {
            const saved = localStorage.getItem(
                'novelty_preferred_theme'
            ) as PreferredTheme | null;
            if (
                saved &&
                ['light', 'dark', 'system', 'custom', 'custom system'].includes(
                    saved
                )
            ) {
                setPreferredTheme(saved);
            }
        } catch (err) {
            console.error('Failed to load saved theme preference:', err);
        }
    }, []);

    const [colorTheme, setColorTheme] = useState('light');
    const [shapeTheme, setShapeTheme] = useState('rounded');

    const getEffectiveTheme = (): string => {
        switch (preferredTheme) {
            case 'light':
                return 'light';
            case 'dark':
                return 'dark';
            case 'system':
            case 'custom':
            case 'custom system':
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
            default:
                return 'light';
        }
    };

    useEffect(() => {
        const effectiveTheme = getEffectiveTheme();
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    }, [preferredTheme, colorTheme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-shape', shapeTheme);
    }, [shapeTheme]);

    return (
        <ThemeContext.Provider
            value={{
                preferredTheme,
                colorTheme,
                setColorTheme,
                shapeTheme,
                setShapeTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);

export const usePreferredTheme = () => {
    return useContext(ThemeContext);
};
