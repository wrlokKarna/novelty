import type { ProjectScope, WordCountTarget } from '../../shared/types';

export type WindowRequests = {
    'close-window': () => void;
};

export const PROJECT_SCOPE_TARGETS: Record<ProjectScope, WordCountTarget> = {
    fast_paced: { min: 50000, max: 70000, label: '50k – 70k words' },
    standard: { min: 70000, max: 100000, label: '70k – 100k words' },
    epic: { min: 110000, max: 180000, label: '110k – 180k+ words' },
};

export type UsageStats = {
    tokensConsumed: number;
    requestCount: number;
    dailyTokenLimit: number;
    monthlyTokenLimit: number;
    dailyRequestLimit: number;
    monthlyRequestLimit: number;
};

// Number of grid columns a template's fields are laid out in by default.
export const DEFAULT_TEMPLATE_COLUMNS = 4;

// Upper bound a template's column count (and any width span) can reach.
export const MAX_COLUMNS = 12;

// Bumped whenever the meaning of the layout's position keys changes, so the
// editor knows to re-pack a layout saved under an older model instead of
// rendering stale positions.
export const LAYOUT_VERSION = 4;
