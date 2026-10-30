import type { ProcessAiPromptParams } from '../../bun/temp/mainMCP';

import type {
    Project,
    NewProject,
    StoryAct,
    NewStoryAct,
    StorySequence,
    NewStorySequence,
    Asset,
    NewAsset,
    Item,
    NewItem,
    Location,
    NewLocation,
} from '.';
import type {
    Agent,
    AgentRun,
    ChatMessage,
    ChatSession,
    NewAgent,
    NewAgentRun,
    NewChatMessage,
    NewChatSession,
} from './ai';
import type { MentionTarget } from './ai/chat';
import type {
    Chapter,
    Genre,
    Inspiration,
    NewChapter,
    NewInspiration,
    Tag,
    Theme,
} from './project';
import type {
    Character,
    CompendiumCategory,
    LoreEntry,
    NewCharacter,
    NewLoreEntry,
    NewOrganization,
    Organization,
} from './project/compendium';
import type {
    PlotThread,
    NewPlotThread,
    ChapterPlotThread,
    NewStoryScene,
    StoryScene,
    NewStoryBeat,
    StoryBeat,
} from './project/manuscript';
import type { ContextSource, Settings } from './project/settings';
import type {
    EntityTemplate,
    FieldDefinition,
    ResolvedTemplateInfo,
    TemplateLayout,
} from './project/templates';
import type { NewTimelineEvent, TimelineEvent } from './project/timeline';
import type {
    Series,
    NewSeries,
    SeriesTemplate,
    SeriesTemplateInput,
} from './series';

export type SelectorSchema = {
    bun: {
        messages: {
            'close-window': void;
            'minimize-window': void;
            'maximize-window': void;
            'window-state-changed': boolean;
        };
        requests: {
            'window:is-maximized': { params: void; response: boolean };
            'select-project': { params: string; response: void };
            'open-projects': { params: void; response: void };
            'open-project-folder': { params: string; response: void };
            'reveal-in-explorer': { params: string; response: void };
            'settings:get-all': { params: void; response: Settings };
            'settings:get': { params: string; response: unknown };
            'settings:set': {
                params: { key: string; value: unknown };
                response: void;
            };
            'settings:set-encryption': {
                params: { mode: 'machine' | 'password'; password?: string };
                response: void;
            };
            'settings:unlock': {
                params: { password: string };
                response: boolean;
            };
            'settings:lock': { params: void; response: void };
            'settings:reset': { params: void; response: void };
            'settings:is-locked': { params: void; response: boolean };
            'settings:get-encryption-mode': {
                params: void;
                response: 'machine' | 'password' | 'none';
            };
            'storage:clear-cache': { params: void; response: number };
            'storage:get-cache-size': { params: void; response: number };
            'dialog:open-directory': {
                params: { title: string };
                response: string | null;
            };
            'dialog:save-file': {
                params: {
                    title: string;
                    defaultPath: string;
                    filters: { name: string; extensions: string[] }[];
                };
                response: string | null;
            };
            'dialog:open-file': {
                params: {
                    title: string;
                    filters: { name: string; extensions: string[] }[];
                };
                response: string | null;
            };

            'db:get-projects': { params: void; response: Project[] };
            'db:get-project': { params: string; response: Project | undefined };
            'db:create-project': { params: NewProject; response: Project };
            'db:update-project': {
                params: { id: string; data: Partial<NewProject> };
                response: Project | undefined;
            };
            'db:delete-project': { params: string; response: void };
            'project:get-current': {
                params: void;
                response: Project | null | undefined;
            };
            'project:set-current': {
                params: string;
                response: Project | null | undefined;
            };
            'db:get-assets': { params: string; response: Asset[] };
            'db:get-asset': { params: string; response: Asset | undefined };
            'db:create-asset': { params: NewAsset; response: Asset };
            'db:update-asset': {
                params: { id: string; data: Partial<NewAsset> };
                response: Asset | undefined;
            };
            'db:delete-asset': { params: string; response: void };
            'db:get-sessions': { params: void; response: ChatSession[] };
            'db:get-session': {
                params: string;
                response: ChatSession | undefined;
            };
            'db:create-session': {
                params: NewChatSession;
                response: ChatSession;
            };
            'db:update-session': {
                params: { id: string; data: Partial<NewChatSession> };
                response: ChatSession | undefined;
            };
            'db:delete-session': { params: string; response: void };
            'db:get-sessions-by-project': {
                params: string;
                response: ChatSession[];
            };
            'db:get-messages': { params: string; response: ChatMessage[] };
            'db:create-message': {
                params: NewChatMessage;
                response: ChatMessage;
            };
            'db:get-agents': { params: void; response: Agent[] };
            'db:get-agent': { params: string; response: Agent | undefined };
            'db:create-agent': { params: NewAgent; response: Agent };
            'db:update-agent': {
                params: { id: string; data: Partial<NewAgent> };
                response: Agent | undefined;
            };
            'db:delete-agent': { params: string; response: void };
            'db:get-runs': { params: string; response: AgentRun[] };
            'db:create-run': { params: NewAgentRun; response: AgentRun };
            'db:update-run': {
                params: { id: string; data: Partial<NewAgentRun> };
                response: AgentRun | undefined;
            };
            'db:get-chapters': { params: string; response: Chapter[] };
            'db:get-chapter': { params: string; response: Chapter | undefined };
            'db:create-chapter': { params: NewChapter; response: Chapter };
            'db:update-chapter': {
                params: { id: string; data: Partial<NewChapter> };
                response: Chapter | undefined;
            };
            'db:delete-chapter': { params: string; response: void };
            'db:get-scratch': { params: string; response: string | null };
            'db:save-scratch': {
                params: { projectId: string; content: string };
                response: void;
            };
            'db:get-characters': { params: string; response: Character[] };
            'db:get-character': {
                params: string;
                response: Character | undefined;
            };
            'db:create-character': {
                params: NewCharacter;
                response: Character;
            };
            'db:update-character': {
                params: { id: string; data: Partial<NewCharacter> };
                response: Character | undefined;
            };
            'db:delete-character': { params: string; response: void };
            'db:get-locations': { params: string; response: Location[] };
            'db:get-location': {
                params: string;
                response: Location | undefined;
            };
            'db:create-location': { params: NewLocation; response: Location };
            'db:update-location': {
                params: { id: string; data: Partial<NewLocation> };
                response: Location | undefined;
            };
            'db:delete-location': { params: string; response: void };
            'db:get-organizations': {
                params: string;
                response: Organization[];
            };
            'db:get-organization': {
                params: string;
                response: Organization | undefined;
            };
            'db:create-organization': {
                params: NewOrganization;
                response: Organization;
            };
            'db:update-organization': {
                params: { id: string; data: Partial<NewOrganization> };
                response: Organization | undefined;
            };
            'db:delete-organization': { params: string; response: void };
            'db:get-items': { params: string; response: Item[] };
            'db:get-item': { params: string; response: Item | undefined };
            'db:create-item': { params: NewItem; response: Item };
            'db:update-item': {
                params: { id: string; data: Partial<NewItem> };
                response: Item | undefined;
            };
            'db:delete-item': { params: string; response: void };
            'db:get-lore-entries': { params: string; response: LoreEntry[] };
            'db:get-lore-entry': {
                params: string;
                response: LoreEntry | undefined;
            };
            'db:create-lore-entry': {
                params: NewLoreEntry;
                response: LoreEntry;
            };
            'db:update-lore-entry': {
                params: { id: string; data: Partial<NewLoreEntry> };
                response: LoreEntry | undefined;
            };
            'db:delete-lore-entry': { params: string; response: void };
            'db:get-genres': { params: void; response: Genre[] };
            'db:create-genre': {
                params: { name: string; isGlobal?: boolean };
                response: Genre;
            };
            'db:delete-genre': { params: string; response: void };
            'db:get-tags': { params: void; response: Tag[] };
            'db:create-tag': {
                params: { name: string; isGlobal?: boolean };
                response: Tag;
            };
            'db:delete-tag': { params: string; response: void };
            'db:get-themes': { params: void; response: Theme[] };
            'db:create-theme': {
                params: { name: string; isGlobal?: boolean };
                response: Theme;
            };
            'db:delete-theme': { params: string; response: void };
            'db:save-project-system-prompt': {
                params: { projectId: string; prompt: string };
                response: void;
            };
            'db:get-project-system-prompt': {
                params: string;
                response: string | null;
            };
            'db:get-chapter-by-id': {
                params: string;
                response: Chapter | undefined;
            };
            'file:read-content': {
                params: string;
                response: string | null;
            };
            'usage:log': {
                params: {
                    sessionId: string | null;
                    projectId: string | null;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    model: string | null;
                };
                response: void;
            };
            'usage:get-stats': {
                params: { period: 'today' | 'month'; projectId: string | null };
                response: { tokensConsumed: number; requestCount: number };
            };
            'db:list-series': { params: void; response: Series[] };
            'db:get-series': { params: string; response: Series | undefined };
            'db:create-series': { params: NewSeries; response: Series };
            'db:update-series': {
                params: { id: string; data: Partial<NewSeries> };
                response: Series | undefined;
            };
            'db:delete-series': { params: string; response: void };
            'db:get-series-projects': {
                params: string;
                response: Omit<
                    Project,
                    | 'coverImagesArray'
                    | 'primaryGenre'
                    | 'primaryTheme'
                    | 'genres'
                    | 'tags'
                    | 'themes'
                >[];
            };
            'db:list-series-templates': {
                params: { seriesId: string };
                response: SeriesTemplate[];
            };
            'db:upsert-series-template': {
                params: SeriesTemplateInput;
                response: SeriesTemplate;
            };
            'db:delete-series-template': {
                params: { seriesId: string; baseType: CompendiumCategory };
                response: void;
            };
            'db:get-template': {
                params: { projectId: string; baseType: CompendiumCategory };
                response: EntityTemplate | undefined;
            };
            'db:get-resolved-template': {
                params: { projectId: string; baseType: CompendiumCategory };
                response: ResolvedTemplateInfo;
            };
            'db:get-timeline-events': {
                params: string;
                response: TimelineEvent[];
            };
            'db:get-timeline-event': {
                params: string;
                response: TimelineEvent | undefined;
            };
            'db:create-timeline-event': {
                params: NewTimelineEvent;
                response: TimelineEvent;
            };
            'db:update-timeline-event': {
                params: { id: string; data: Partial<NewTimelineEvent> };
                response: TimelineEvent | undefined;
            };
            'db:delete-timeline-event': { params: string; response: void };
            'db:auto-generate-timeline-events': {
                params: string;
                response: number;
            };
            'db:get-story-acts': { params: string; response: StoryAct[] };
            'db:get-story-act': {
                params: string;
                response: StoryAct | undefined;
            };
            'db:create-story-act': { params: NewStoryAct; response: StoryAct };
            'db:update-story-act': {
                params: { id: string; data: Partial<NewStoryAct> };
                response: StoryAct | undefined;
            };
            'db:delete-story-act': { params: string; response: void };
            'db:get-story-sequences': {
                params: string;
                response: StorySequence[];
            };
            'db:get-story-sequence': {
                params: string;
                response: StorySequence | undefined;
            };
            'db:create-story-sequence': {
                params: NewStorySequence;
                response: StorySequence;
            };
            'db:update-story-sequence': {
                params: { id: string; data: Partial<NewStorySequence> };
                response: StorySequence | undefined;
            };
            'db:delete-story-sequence': { params: string; response: void };
            'db:get-sequences-by-act': {
                params: string;
                response: StorySequence[];
            };
            'db:get-sequences-by-chapter': {
                params: string;
                response: StorySequence[];
            };
            'db:reorder-acts': {
                params: { id: string; orderIndex: number }[];
                response: void;
            };
            'db:reorder-sequences': {
                params: { id: string; orderIndex: number }[];
                response: void;
            };
            'db:get-story-scenes': { params: string; response: StoryScene[] };
            'db:get-story-scene': {
                params: string;
                response: StoryScene | undefined;
            };
            'db:get-scenes-by-sequence': {
                params: string;
                response: StoryScene[];
            };
            'db:get-scenes-by-chapter': {
                params: string;
                response: StoryScene[];
            };
            'db:create-story-scene': {
                params: NewStoryScene;
                response: StoryScene;
            };
            'db:update-story-scene': {
                params: { id: string; data: Partial<NewStoryScene> };
                response: StoryScene | undefined;
            };
            'db:delete-story-scene': { params: string; response: void };
            'db:reorder-scenes': {
                params: { id: string; orderIndex: number }[];
                response: void;
            };
            'db:move-scene': {
                params: {
                    id: string;
                    data: {
                        sequenceId?: string | null;
                        chapterId?: string | null;
                        actId?: string | null;
                        orderIndex?: number;
                    };
                };
                response: StoryScene | undefined;
            };
            'db:get-plot-threads': { params: string; response: PlotThread[] };
            'db:get-plot-thread': {
                params: string;
                response: PlotThread | undefined;
            };
            'db:create-plot-thread': {
                params: NewPlotThread;
                response: PlotThread;
            };
            'db:update-plot-thread': {
                params: { id: string; data: Partial<NewPlotThread> };
                response: PlotThread | undefined;
            };
            'db:delete-plot-thread': { params: string; response: void };
            'db:get-chapter-plot-threads': {
                params: string;
                response: ChapterPlotThread[];
            };
            'db:set-chapter-plot-threads': {
                params: {
                    chapterId: string;
                    threads: { plotThreadId: string; intensity: number }[];
                };
                response: void;
            };
            'db:get-story-beats': { params: string; response: StoryBeat[] };
            'db:get-story-beat': {
                params: string;
                response: StoryBeat | undefined;
            };
            'db:create-story-beat': {
                params: NewStoryBeat;
                response: StoryBeat;
            };
            'db:update-story-beat': {
                params: { id: string; data: Partial<NewStoryBeat> };
                response: StoryBeat | undefined;
            };
            'db:delete-story-beat': { params: string; response: void };
            'db:save-template': {
                params: {
                    projectId: string;
                    baseType: CompendiumCategory;
                    customFields?: FieldDefinition[];
                    layout?: TemplateLayout | null;
                };
                response: EntityTemplate;
            };
            'db:get-inspirations': { params: string; response: Inspiration[] };
            'db:create-inspiration': {
                params: NewInspiration;
                response: Inspiration;
            };
            'db:update-inspiration': {
                params: { id: string; data: Partial<NewInspiration> };
                response: Inspiration | undefined;
            };
            'db:delete-inspiration': { params: string; response: void };
            'embeddings:index-project': {
                params: { projectId: string };
                response: {
                    indexed: number;
                    skipped: number;
                    failed: number;
                    totalChunks: number;
                };
            };
            'embeddings:index-entity': {
                params: { entityType: string; entityId: string };
                response: void;
            };
            'embeddings:status': {
                params: string;
                response: { total: number; byType: Record<string, number> };
            };
            'embeddings:rebuild': {
                params: string;
                response: void;
            };
            'embeddings:check-availability': {
                params: void;
                response: boolean;
            };
            'embeddings:test-server': {
                params: void;
                response: { ok: boolean; error?: string };
            };
            'embeddings:context': {
                params: {
                    projectId: string;
                    userMessage: string;
                    currentChapterId?: string;
                    mentionTargets?: MentionTarget[];
                    fileContents?: string[];
                    customPrompt?: string | null;
                    chapterContextMode?: 'brief' | 'full';
                    tokenBudget: number;
                };
                response: {
                    systemPrompt: string;
                    tokenEstimate: number;
                    sources: ContextSource[];
                };
            };
            'ai:get-tools': {
                params: void;
                response: {
                    type: string;
                    function: {
                        name: string;
                        description: string | undefined;
                        parameters: {
                            [x: string]: unknown;
                            type: 'object';
                            properties?: Record<string, object> | undefined;
                            required?: string[] | undefined;
                        };
                    };
                }[];
            };
            'ai:execute-tool': {
                params: {
                    name: string;
                    arguments?: Record<string, unknown>;
                };
                response: {
                    content: {
                        type: string;
                        text?: string;
                        [key: string]: unknown;
                    }[];
                    isError?: boolean;
                };
            };
            'ai:process-prompt': {
                params: ProcessAiPromptParams;
                response: { text: string };
            };
        };
    };
    webview: {
        messages: {
            'close-window': void;
            'minimize-window': void;
            'maximize-window': void;
            'window-state-changed': boolean;
        };
        requests: Record<string, never>;
    };
};
