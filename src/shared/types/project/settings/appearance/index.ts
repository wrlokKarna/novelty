import type { SidebarConstraints } from '..';
import type { EditorLayoutSettings, ThemeSettings } from './theme';
import type { TypographySettings } from './typography';

export type AppearanceSettings = {
    theme: ThemeSettings;
    typography: TypographySettings;
    editorLayout: EditorLayoutSettings;
    sidebarConstraints: SidebarConstraints;
    legacyBluePanel: boolean;
};
