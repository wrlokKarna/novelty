import type { NewStoryBeat, StoryBeat } from '../manuscript';

// Timeline events are unified into story_beats. These aliases keep existing
// callers compiling while the codebase moves to the unified model.
export type TimelineEvent = StoryBeat;
export type NewTimelineEvent = NewStoryBeat;
