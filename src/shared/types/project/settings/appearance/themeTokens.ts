export type ThemeColorTokens = {
    // Backgrounds
    '--bg-primary': string;
    '--bg-secondary': string;
    '--bg-elevated': string;
    '--bg-surface': string;
    '--bg-surface-elevated': string;

    // Text Hierarchy
    '--text-primary': string;
    '--text-secondary': string;
    '--text-muted': string;
    '--text-tertiary': string;
    '--text-inverse': string;
    '--text-accent': string;

    // Accents
    '--accent-primary': string;
    '--accent-hover': string;
    '--accent-dim': string;
    '--accent-subtle': string;

    // Borders & Shadows
    '--border-primary': string;
    '--border-subtle': string;
    '--border-accent': string;

    // Index signature allowing safe extensibility
    [key: `--${string}`]: string;
};
