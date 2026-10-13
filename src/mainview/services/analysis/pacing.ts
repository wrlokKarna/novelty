import type { Chapter, StoryAct, StoryBeat } from '../../types/index';

export type PacingInsight = {
    type:
        | 'beat-clustering'
        | 'act-imbalance'
        | 'missing-beats'
        | 'chapter-length';
    severity: 'info' | 'warning' | 'error';
    title: string;
    description: string;
    suggestion: string;
};

export function analyzePacing(
    chapters: Chapter[],
    acts: StoryAct[],
    beats: StoryBeat[]
): PacingInsight[] {
    const insights: PacingInsight[] = [];

    // Check for missing key story beats
    const requiredBeats = [
        'opening-image',
        'catalyst',
        'break-into-two',
        'midpoint',
        'all-is-lost',
        'climax',
        'finale',
    ];
    const existingTypes = new Set(beats.map((b) => b.beatType));
    for (const required of requiredBeats) {
        if (!existingTypes.has(required as any)) {
            insights.push({
                type: 'missing-beats',
                severity: 'warning',
                title: `Missing story beat: "${required}"`,
                description: `The "${required}" beat is a key structural element that hasn't been defined yet.`,
                suggestion: `Consider adding a "${required}" beat to strengthen your story structure.`,
            });
        }
    }

    // Check act balance (chapters per act)
    if (acts.length >= 2) {
        const chaptersPerAct = acts.map((a) => ({
            act: a,
            count: chapters.filter((c) => c.actId === a.id).length,
        }));
        const avgCount =
            chaptersPerAct.reduce((s, a) => s + a.count, 0) /
            chaptersPerAct.length;
        for (const item of chaptersPerAct) {
            if (item.count === 0) {
                insights.push({
                    type: 'act-imbalance',
                    severity: 'error',
                    title: `Empty act: "${item.act.title}"`,
                    description: `Act "${item.act.title}" has no chapters assigned to it.`,
                    suggestion: `Move chapters into this act or consider removing it.`,
                });
            } else if (
                Math.abs(item.count - avgCount) > avgCount * 0.5 &&
                avgCount > 2
            ) {
                insights.push({
                    type: 'act-imbalance',
                    severity: 'warning',
                    title: `Act imbalance: "${item.act.title}"`,
                    description: `Act "${item.act.title}" has ${item.count} chapters (avg: ${avgCount.toFixed(1)}). This may indicate pacing issues.`,
                    suggestion: `Consider redistributing chapters more evenly or adjusting act boundaries.`,
                });
            }
        }
    }

    return insights;
}
