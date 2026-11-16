import type { ThemeColorTokens } from '@/shared/types/project/settings/appearance/themeTokens';

const TOKEN_ALIASES: Record<string, string[]> = {
    '--bg-primary': ['--bg-primary', '--color-background'],
    '--bg-secondary': ['--bg-secondary', '--color-surface'],
    '--bg-elevated': ['--bg-elevated', '--color-surface-elevated'],
    '--text-primary': ['--text-primary', '--color-text', '--text'],
    '--text-secondary': [
        '--text-secondary',
        '--color-text-secondary',
        '--color-text-muted',
        '--text-muted',
    ],
    '--accent-primary': [
        '--accent-primary',
        '--accent',
        '--text-accent',
        '--highlight',
        '--color-primary',
    ],
    '--accent-hover': ['--accent-hover', '--color-primary-hover'],
    '--border-subtle': [
        '--border-subtle',
        '--border',
        '--color-border',
        '--color-border-subtle',
    ],
};

export type TokenAssignment = [key: string, value: string];

export function getTokenAliases(token: string): string[] {
    return TOKEN_ALIASES[token] ?? [token];
}

export function getThemeTokenAssignments(
    tokens: ThemeColorTokens
): TokenAssignment[] {
    const assignments: TokenAssignment[] = [];

    for (const [token, value] of Object.entries(tokens)) {
        if (!value) continue;

        for (const alias of getTokenAliases(token)) {
            assignments.push([alias, value]);
        }
    }

    return assignments;
}

export function getAccentTokenAssignments(
    accentColor: string
): TokenAssignment[] {
    return getTokenAliases('--accent-primary').map((alias) => [
        alias,
        accentColor,
    ]);
}
