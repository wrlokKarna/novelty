import type {
    Chapter,
    TimelineEvent,
    Character,
    Location,
    LoreEntry,
    StoryAct,
    StorySequence,
    PlotThread,
    StoryBeat,
} from '../../types/index';

export type AnalysisIssueSeverity = 'error' | 'warning' | 'info';

export type AnalysisIssue = {
    id: string;
    severity: AnalysisIssueSeverity;
    category:
        | 'plot-hole'
        | 'consistency'
        | 'timeline'
        | 'character'
        | 'thread'
        | 'pacing';
    title: string;
    description: string;
    locations: { chapterId?: string; entityId?: string; entityType?: string }[];
    suggestion: string;
};

export type AnalysisResult = {
    issues: AnalysisIssue[];
    summary: { errors: number; warnings: number; infos: number };
    analyzedAt: Date;
};

export interface AnalysisContext {
    chapters: Chapter[];
    timelineEvents: TimelineEvent[];
    characters: Character[];
    locations: Location[];
    loreEntries: LoreEntry[];
    acts: StoryAct[];
    sequences: StorySequence[];
    plotThreads: PlotThread[];
    storyBeats: StoryBeat[];
}

function generateId(): string {
    return crypto.randomUUID();
}

export function analyzePlotHoles(ctx: AnalysisContext): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // 1. Check for unresolved plot threads (threads with no chapters in last act)
    const lastAct = [...ctx.acts].sort((a, b) => b.actNumber - a.actNumber)[0];
    if (lastAct && ctx.plotThreads.length > 0) {
        const lastActChapters = ctx.chapters.filter(
            (c) => c.actId === lastAct.id
        );
        for (const thread of ctx.plotThreads) {
            const hasChapterInFinalAct = lastActChapters.some((ch) =>
                ctx.timelineEvents.some(
                    (ev) =>
                        ev.chapterId === ch.id &&
                        ev.metadata?.plotThreadId === thread.id
                )
            );
            if (!hasChapterInFinalAct && thread.threadType !== 'thematic') {
                issues.push({
                    id: generateId(),
                    severity: 'warning',
                    category: 'thread',
                    title: `Unresolved plot thread: "${thread.name}"`,
                    description: `The plot thread "${thread.name}" (${thread.threadType}) does not appear in any chapter of the final act. It may need resolution.`,
                    locations: [],
                    suggestion: `Ensure "${thread.name}" reaches a conclusion before or in the final act, or mark it as intentionally open-ended.`,
                });
            }
        }
    }

    // 2. Check for timeline order conflicts
    const datedEvents = ctx.timelineEvents
        .filter((e) => e.inStoryDate)
        .sort((a, b) => a.dateOrder - b.dateOrder);
    for (let i = 1; i < datedEvents.length; i++) {
        const prev = datedEvents[i - 1];
        const curr = datedEvents[i];
        if (
            prev.inStoryDate &&
            curr.inStoryDate &&
            curr.inStoryDate < prev.inStoryDate
        ) {
            issues.push({
                id: generateId(),
                severity: 'error',
                category: 'timeline',
                title: 'Timeline order conflict',
                description: `Event "${curr.title}" (${curr.inStoryDate}) occurs before "${prev.title}" (${prev.inStoryDate}) in chronological order but is placed after it in the story.`,
                locations: [
                    {
                        chapterId: curr.chapterId ?? undefined,
                        entityId: curr.id,
                        entityType: 'timeline',
                    },
                ],
                suggestion:
                    'Check if this is intentional (flashback/flashforward) or if dates need correction.',
            });
        }
    }

    // 3. Check for chapters with no timeline events
    for (const ch of ctx.chapters) {
        const hasEvents = ctx.timelineEvents.some(
            (ev) => ev.chapterId === ch.id
        );
        if (!hasEvents && ch.status !== 'outline') {
            issues.push({
                id: generateId(),
                severity: 'info',
                category: 'plot-hole',
                title: `Chapter "${ch.title}" has no timeline events`,
                description: `This chapter exists but has no events linked to it on the timeline. It may be a placeholder or miss critical story events.`,
                locations: [{ chapterId: ch.id }],
                suggestion:
                    'Add timeline events for this chapter or connect it to existing ones.',
            });
        }
    }

    // 4. Check for orphaned story beats (beats without chapters)
    for (const beat of ctx.storyBeats) {
        if (!beat.chapterId) {
            issues.push({
                id: generateId(),
                severity: 'warning',
                category: 'plot-hole',
                title: `Unassigned story beat: "${beat.title}"`,
                description: `The story beat "${beat.title}" (${beat.beatType}) is not assigned to any chapter.`,
                locations: [],
                suggestion: `Assign this beat to a chapter or remove it if no longer needed.`,
            });
        }
    }

    return issues;
}

export function analyzeConsistency(ctx: AnalysisContext): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Check for character names mentioned in chapters that don't exist in compendium
    const compendiumNames = new Set(
        ctx.characters.map((c) => c.name.toLowerCase())
    );
    for (const ch of ctx.chapters) {
        if (!ch.content) continue;
        const text = ch.content;
        const nameMatches =
            text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || [];
        const uniqueNames = [
            ...new Set(nameMatches.map((n) => n.toLowerCase())),
        ];
        for (const name of uniqueNames) {
            if (name.length < 3) continue;
            if (
                !compendiumNames.has(name) &&
                ![
                    'the',
                    'this',
                    'that',
                    'with',
                    'from',
                    'have',
                    'been',
                    'were',
                    'said',
                    'then',
                    'when',
                    'what',
                    'which',
                    'their',
                    'there',
                    'would',
                    'could',
                    'should',
                    'about',
                    'chapter',
                    'after',
                    'before',
                    'between',
                    'through',
                    'during',
                    'without',
                    'within',
                    'across',
                    'around',
                    'behind',
                    'beyond',
                    'inside',
                    'outside',
                    'underneath',
                ].includes(name)
            ) {
                issues.push({
                    id: generateId(),
                    severity: 'info',
                    category: 'character',
                    title: `Undeclared character "${name}" in chapter "${ch.title}"`,
                    description: `The name "${name}" appears in the chapter text but doesn't match any character in the compendium. It may be a minor character or a typo.`,
                    locations: [{ chapterId: ch.id }],
                    suggestion: `Add "${name}" as a character entry or check for spelling errors.`,
                });
            }
        }
    }

    return issues;
}

export async function runFullAnalysis(
    ctx: AnalysisContext
): Promise<AnalysisResult> {
    const plotHoleIssues = analyzePlotHoles(ctx);
    const consistencyIssues = analyzeConsistency(ctx);

    const allIssues = [...plotHoleIssues, ...consistencyIssues];

    const summary = {
        errors: allIssues.filter((i) => i.severity === 'error').length,
        warnings: allIssues.filter((i) => i.severity === 'warning').length,
        infos: allIssues.filter((i) => i.severity === 'info').length,
    };

    return { issues: allIssues, summary, analyzedAt: new Date() };
}
