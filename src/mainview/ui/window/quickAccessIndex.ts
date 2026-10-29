import type { Item, StoryAct, StorySequence, Location } from '../../../shared/types';
import type { Chapter } from '../../../shared/types/project';
import type {
    Character,
    CompendiumCategory,
    LoreEntry,
    Organization,
} from '../../../shared/types/project/compendium';
import type {
    PlotThread,
    StoryBeat,
    StoryScene,
} from '../../../shared/types/project/manuscript';
import type { FileTab } from '../../../shared/types/project/templates';

export type QuickAccessKind =
    | 'chapter'
    | 'character'
    | 'location'
    | 'organization'
    | 'item'
    | 'lore'
    | 'act'
    | 'sequence'
    | 'scene'
    | 'beat'
    | 'thread'
    | 'tab'
    | 'scratch';

export type QuickAccessItem = {
    id: string;
    kind: QuickAccessKind;
    group: string;
    label: string;
    sublabel?: string;
    badge?: string;
    haystack?: string;
    category?: CompendiumCategory;
    chapterId?: string;
};

export type QuickAccessSource = {
    chapters: Chapter[];
    characters: Character[];
    locations: Location[];
    organizations: Organization[];
    items: Item[];
    loreEntries: LoreEntry[];
    plotThreads: PlotThread[];
    storyActs: StoryAct[];
    storySequences: StorySequence[];
    storyScenes: StoryScene[];
    storyBeats: StoryBeat[];
    openTabs: FileTab[];
    scratchContent: string;
};

const COMPENDIUM_LABELS: Record<CompendiumCategory, string> = {
    character: 'Characters',
    location: 'Locations',
    organization: 'Organizations',
    item: 'Items',
    lore: 'Lore',
};

const STORY_BADGES: Record<string, string> = {
    act: 'Act',
    sequence: 'Sequence',
    scene: 'Scene',
    beat: 'Beat',
};

const MAX_RESULTS = 60;
const MAX_PER_GROUP_WHEN_BROWSE = 8;

const IGNORED_TEMPLATE_KEYS = new Set([
    'id',
    'targetId',
    'projectId',
    'chapterId',
    'actId',
    'sequenceId',
    'createdAt',
    'updatedAt',
]);

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bodyCache = new WeakMap<Chapter, string>();

function stripHtml(value: string): string {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function chapterBody(chapter: Chapter): string {
    const cached = bodyCache.get(chapter);
    if (cached !== undefined) return cached;
    const body = stripHtml(chapter.content ?? '');
    bodyCache.set(chapter, body);
    return body;
}

function flattenTemplateData(data: Record<string, unknown> | null): string {
    if (!data) return '';
    const parts: string[] = [];

    const visit = (value: unknown, key?: string) => {
        if (value == null) return;
        if (key && IGNORED_TEMPLATE_KEYS.has(key)) return;

        if (typeof value === 'string') {
            if (UUID_PATTERN.test(value)) return;
            parts.push(value);
            return;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            parts.push(String(value));
            return;
        }
        if (Array.isArray(value)) {
            for (const entry of value) visit(entry);
            return;
        }
        if (typeof value === 'object') {
            for (const [childKey, childValue] of Object.entries(
                value as Record<string, unknown>
            )) {
                visit(childValue, childKey);
            }
        }
    };

    visit(data);
    return parts.join(' ');
}

function truncate(value: string, max: number): string {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function buildQuickAccessIndex(
    source: QuickAccessSource
): QuickAccessItem[] {
    const items: QuickAccessItem[] = [];

    for (const tab of source.openTabs) {
        items.push({
            id: tab.id,
            kind: 'tab',
            group: 'Open Tabs',
            label: tab.name,
            badge: tab.type === 'file' ? 'File' : undefined,
            haystack: `${tab.name} ${tab.filePath ?? ''}`.toLowerCase(),
        });
    }

    for (const chapter of source.chapters) {
        const body = chapterBody(chapter);
        const outline = chapter.outline?.trim() ?? '';
        items.push({
            id: chapter.id,
            kind: 'chapter',
            group: 'Chapters',
            label: chapter.title,
            sublabel: outline ? truncate(outline, 90) : undefined,
            badge: chapter.status,
            haystack: `${chapter.title} ${outline} ${body}`.toLowerCase(),
        });
    }

    const compendium: [
        CompendiumCategory,
        {
            id: string;
            name: string;
            templateData: Record<string, unknown> | null;
        }[],
    ][] = [
        ['character', source.characters],
        ['location', source.locations],
        ['organization', source.organizations],
        ['item', source.items],
        ['lore', source.loreEntries],
    ];

    for (const [category, entries] of compendium) {
        for (const entry of entries) {
            const details = flattenTemplateData(entry.templateData);
            items.push({
                id: entry.id,
                kind: category,
                group: COMPENDIUM_LABELS[category],
                label: entry.name,
                sublabel: details ? truncate(details, 90) : undefined,
                haystack: `${entry.name} ${details}`.toLowerCase(),
                category,
            });
        }
    }

    const story: [
        'act' | 'sequence' | 'scene' | 'beat',
        {
            id: string;
            title: string;
            summary?: string | null;
            description?: string | null;
            chapterId?: string | null;
        }[],
    ][] = [
        ['act', source.storyActs],
        ['sequence', source.storySequences],
        ['scene', source.storyScenes],
        ['beat', source.storyBeats],
    ];

    for (const [kind, entries] of story) {
        for (const entry of entries) {
            const detail = (entry.summary ?? entry.description ?? '').trim();
            items.push({
                id: entry.id,
                kind,
                group: 'Story',
                label: entry.title,
                sublabel: detail ? truncate(detail, 90) : undefined,
                badge: STORY_BADGES[kind],
                haystack: `${entry.title} ${detail}`.toLowerCase(),
                chapterId: entry.chapterId ?? undefined,
            });
        }
    }

    for (const thread of source.plotThreads) {
        const description = thread.description?.trim() ?? '';
        items.push({
            id: thread.id,
            kind: 'thread',
            group: 'Plot Threads',
            label: thread.name,
            sublabel: description ? truncate(description, 90) : undefined,
            badge: thread.threadType,
            haystack: `${thread.name} ${description}`.toLowerCase(),
        });
    }

    const scratch = source.scratchContent?.trim() ?? '';
    if (scratch) {
        items.push({
            id: 'scratch-note',
            kind: 'scratch',
            group: 'Scratch Note',
            label: 'Scratch Note',
            sublabel: truncate(stripHtml(scratch), 90),
            haystack: stripHtml(scratch).toLowerCase(),
        });
    }

    return items;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreItem(item: QuickAccessItem, query: string): number {
    const label = item.label.toLowerCase();
    if (label.startsWith(query)) return 100;
    if (new RegExp(`\\b${escapeRegExp(query)}`).test(label)) return 60;
    if (label.includes(query)) return 30;
    if (item.sublabel?.toLowerCase().includes(query)) return 20;
    if (item.haystack?.includes(query)) return 10;
    return 0;
}

export function filterQuickAccess(
    items: QuickAccessItem[],
    query: string
): QuickAccessItem[] {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
        const counts = new Map<string, number>();
        const results: QuickAccessItem[] = [];
        for (const item of items) {
            const count = counts.get(item.group) ?? 0;
            if (count >= MAX_PER_GROUP_WHEN_BROWSE) continue;
            counts.set(item.group, count + 1);
            results.push(item);
            if (results.length >= MAX_RESULTS) break;
        }
        return results;
    }

    const scored: { item: QuickAccessItem; score: number }[] = [];
    for (const item of items) {
        const score = scoreItem(item, trimmed);
        if (score > 0) scored.push({ item, score });
    }

    scored.sort(
        (a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label)
    );

    return scored.slice(0, MAX_RESULTS).map((entry) => entry.item);
}
