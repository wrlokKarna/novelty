import type { Project, Character } from '../../types/index';

export type GeneratedSkeleton = {
    acts: GeneratedAct[];
    plotThreads: GeneratedPlotThread[];
    storyBeats: GeneratedStoryBeat[];
};

export type GeneratedAct = {
    title: string;
    summary: string;
    actNumber: number;
    sequences: GeneratedSequence[];
};

export type GeneratedSequence = {
    title: string;
    summary: string;
    chapters: GeneratedChapterOutline[];
};

export type GeneratedChapterOutline = {
    title: string;
    summary: string;
    povCharacterHint: string;
    suggestedBeats: string[];
};

export type GeneratedPlotThread = {
    name: string;
    description: string;
    threadType: string;
    color: string;
};

export type GeneratedStoryBeat = {
    beatType: string;
    title: string;
    chapterHint: string;
};

const ACT_TEMPLATES: Record<
    string,
    { title: string; summary: string; beats: string[] }[]
> = {
    standard: [
        {
            title: 'Act I: Setup',
            summary:
                'Introduce the protagonist, their ordinary world, and the inciting incident that sets the story in motion.',
            beats: [
                'opening-image',
                'theme-stated',
                'setup',
                'catalyst',
                'debate',
            ],
        },
        {
            title: 'Act II: Confrontation',
            summary:
                'The protagonist enters a new world, faces escalating challenges, and reaches a midpoint turning point.',
            beats: [
                'break-into-two',
                'b-story',
                'fun-and-games',
                'midpoint',
                'bad-guys-close-in',
                'all-is-lost',
                'dark-night-of-soul',
            ],
        },
        {
            title: 'Act III: Resolution',
            summary:
                'The protagonist makes their final stand, faces the climax, and the story reaches its resolution.',
            beats: [
                'break-into-three',
                'climax',
                'falling-action',
                'finale',
                'final-image',
            ],
        },
    ],
    epic: [
        {
            title: 'Act I: Genesis',
            summary:
                "Establish the world, the protagonist's place in it, and the first hints of the larger conflict.",
            beats: [
                'opening-image',
                'theme-stated',
                'setup',
                'catalyst',
                'debate',
            ],
        },
        {
            title: 'Act II: Rising Action',
            summary:
                'The protagonist commits to the journey, gathers allies, and faces the first major trials.',
            beats: ['break-into-two', 'b-story', 'fun-and-games'],
        },
        {
            title: 'Act III: The Turning Point',
            summary:
                'The midpoint changes everything. Old certainties crumble and the true scope of the conflict emerges.',
            beats: [
                'midpoint',
                'bad-guys-close-in',
                'all-is-lost',
                'dark-night-of-soul',
            ],
        },
        {
            title: 'Act IV: The Darkest Hour',
            summary:
                'The protagonist gathers strength, forges final alliances, and prepares for the endgame.',
            beats: ['break-into-three'],
        },
        {
            title: 'Act V: Climax & Resolution',
            summary:
                'The final confrontation and its aftermath. Threads are resolved and the story finds its conclusion.',
            beats: ['climax', 'falling-action', 'finale', 'final-image'],
        },
    ],
};

export function generateSkeleton(
    project: Project,
    characters: Character[]
): GeneratedSkeleton {
    const scope = project.projectScope || 'standard';
    const actTemplate = ACT_TEMPLATES[scope] || ACT_TEMPLATES.standard;

    const prefix = project.workType === 'fanfiction' ? 'Chapter' : 'Chapter';

    const acts: GeneratedAct[] = actTemplate.map((actDef, actIdx) => {
        const chaptersPerAct = scope === 'epic' ? 6 : 4;
        const sequences: GeneratedSequence[] = [];

        const seqCount = scope === 'epic' ? 3 : 2;
        const chPerSeq = Math.ceil(chaptersPerAct / seqCount);

        for (let s = 0; s < seqCount; s++) {
            const seqStart = s * chPerSeq + 1;
            const seqEnd = Math.min((s + 1) * chPerSeq, chaptersPerAct);
            const chapters: GeneratedChapterOutline[] = [];

            for (let c = seqStart; c <= seqEnd; c++) {
                const globalChapterNum = actIdx * chaptersPerAct + c;
                const relatedBeats = actDef.beats
                    .filter((_, bi) => bi === c - 1 || bi === c - seqStart)
                    .slice(0, 2);

                chapters.push({
                    title: `${prefix} ${globalChapterNum}`,
                    summary: '',
                    povCharacterHint:
                        characters.length > 0
                            ? characters[globalChapterNum % characters.length]
                                  .name
                            : 'TBD',
                    suggestedBeats: relatedBeats,
                });
            }

            sequences.push({
                title: `Sequence ${s + 1}`,
                summary: '',
                chapters,
            });
        }

        return {
            title: actDef.title,
            summary: actDef.summary,
            actNumber: actIdx + 1,
            sequences,
        };
    });

    const plotThreads: GeneratedPlotThread[] = [
        {
            name: 'Main Plot',
            description: 'The central story arc',
            threadType: 'main',
            color: '#ef4444',
        },
        {
            name: 'Character Arc',
            description: `The internal journey of the protagonist`,
            threadType: 'character-arc',
            color: '#3b82f6',
        },
    ];

    const allBeats: GeneratedStoryBeat[] = [];
    actTemplate.forEach((_, actIdx) => {
        actTemplate[actIdx].beats.forEach((beatType, bi) => {
            allBeats.push({
                beatType,
                title: beatType
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' '),
                chapterHint: `${prefix} ${actIdx * 4 + bi + 1}`,
            });
        });
    });

    const storyBeats: GeneratedStoryBeat[] = acts.length >= 3 ? allBeats : [];

    return { acts, plotThreads, storyBeats };
}
