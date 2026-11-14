export type ThemeColorTokens = {
    '--bg-primary': string;
    '--bg-secondary': string;
    '--bg-elevated': string;
    '--text-primary': string;
    '--text-secondary': string;
    '--accent-primary': string;
    '--accent-hover': string;
    '--border-subtle': string;
    [key: `--${string}`]: string;
};
