const STORAGE_KEY = 'novelty-theme';
const THEMES = ['light', 'dark', 'system'];

export type AppTheme = 'light' | 'dark' | 'system';

export function getStoredTheme(): AppTheme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.includes(stored as AppTheme)) {
        return stored as AppTheme;
    }
    return 'system';
}

export function setTheme(theme: AppTheme): void {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
}

export function toggleTheme(): AppTheme {
    const current = getStoredTheme();
    const themeOrder: AppTheme[] = ['system', 'light', 'dark'];
    const currentIndex = themeOrder.indexOf(current);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
    return nextTheme;
}

export function getResolvedTheme(): 'light' | 'dark' {
    const theme = getStoredTheme();
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }
    return theme;
}

function applyTheme(theme: AppTheme): void {
    const resolved =
        theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
            : theme;
    document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme(): void {
    const theme = getStoredTheme();
    applyTheme(theme);

    window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (e) => {
            if (getStoredTheme() === 'system') {
                document.documentElement.setAttribute(
                    'data-theme',
                    e.matches ? 'dark' : 'light'
                );
            }
        });
}

export function getThemeIcon(theme: AppTheme): string {
    switch (theme) {
        case 'light':
            return '☀️';
        case 'dark':
            return '🌙';
        case 'system':
            return '💻';
    }
}
