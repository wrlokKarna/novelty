export type PreferredTheme =
    'light' | 'dark' | 'system' | 'custom' | 'custom system';

export interface ThemeContextType {
    preferredTheme: PreferredTheme;
    colorTheme: string;
    setColorTheme: (theme: string) => void;
    shapeTheme: string;
    setShapeTheme: (shape: string) => void;
}
