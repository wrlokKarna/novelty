import { Provider } from '../utils/ai/providerHelpers';

export type WindowRequests = {
    'close-window': () => void;
};

export type ProjectScope = 'fast_paced' | 'standard' | 'epic';

export type SeriesArchitecture =
    'standalone' | 'duology' | 'trilogy' | 'ongoing';

export type PointOfView = 'single' | 'multiple' | 'omniscient';

export type PacingType = 'fast_paced' | 'balanced' | 'deep_dive';

export type WorkType =
    | 'original'
    | 'fanfiction'
    | 'adaptation'
    | 'derivative'
    | 'parody'
    | 'translation'
    | 'transformative';

export type ProjectStructure =
    | 'oneshot'
    | 'standalone'
    | 'serials'
    | 'episodic'
    | 'anthology'
    | 'series'
    | 'seasonal';

export type TargetAgeGroup =
    'children' | 'middle_grade' | 'young_adult' | 'new_adult' | 'adult';

export type ProjectStatus =
    'planning' | 'drafting' | 'revising' | 'completed' | 'hiatus' | 'published';

export type WordCountTarget = {
    min: number | null;
    max: number | null;
    label: string;
};

export const PROJECT_SCOPE_TARGETS: Record<ProjectScope, WordCountTarget> = {
    fast_paced: { min: 50000, max: 70000, label: '50k – 70k words' },
    standard: { min: 70000, max: 100000, label: '70k – 100k words' },
    epic: { min: 110000, max: 180000, label: '110k – 180k+ words' },
};

export type Project = {
    id: string;
    name: string;
    path: string | null;
    metadata: string | null;
    description: string | null;
    systemPrompt: string | null;
    coverImageId: string | null;
    coverImagesArray: string[];
    projectScope: ProjectScope | null;
    seriesArch: SeriesArchitecture | null;
    seriesId: string | null;
    pov: PointOfView | null;
    pacing: PacingType | null;
    workType: WorkType | null;
    projectStructure: ProjectStructure | null;
    targetAge: TargetAgeGroup | null;
    projectStatus: ProjectStatus;
    tonalType: string | null;
    contentRating: string;
    primaryGenre: string | null;
    primaryTheme: string | null;
    genres: string[];
    tags: string[];
    themes: string[];
    createdAt: Date;
    updatedAt: Date;
};

export type NewProject = Omit<Project, 'createdAt' | 'updatedAt'>;

export type SourceType =
    | 'book'
    | 'movie'
    | 'tv_show'
    | 'game'
    | 'anime'
    | 'manga'
    | 'web_novel'
    | 'web_series'
    | 'comic'
    | 'mythology'
    | 'history'
    | 'other';

export const PREDEFINED_ASPECTS = [
    'atmosphere',
    'characters',
    'story_arc',
    'worldbuilding',
    'themes',
    'prose_style',
    'magic_system',
    'dialogue',
    'pacing',
    'aesthetic',
] as const;

export type InspiredAspect = (typeof PREDEFINED_ASPECTS)[number] | string;

export type Inspiration = {
    id: string;
    projectId: string;
    sourceName: string;
    sourceType: SourceType;
    sourceYear: number | null;
    inspiredAspects: string[];
    inspiredNotes: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NewInspiration = Omit<Inspiration, 'createdAt' | 'updatedAt'>;

export type MentionTarget = {
    type:
        | 'chapter'
        | 'character'
        | 'location'
        | 'organization'
        | 'item'
        | 'lore'
        | 'scene'
        | 'sequence';
    id: string;
    label: string;
    mode?: 'brief' | 'full';
};

export type UsageStats = {
    tokensConsumed: number;
    requestCount: number;
    dailyTokenLimit: number;
    monthlyTokenLimit: number;
    dailyRequestLimit: number;
    monthlyRequestLimit: number;
};

export type Asset = {
    id: string;
    projectId: string | null;
    name: string;
    type: string;
    path: string | null;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewAsset = Omit<Asset, 'createdAt' | 'updatedAt'>;

export type ChatSession = {
    id: string;
    projectId: string | null;
    title: string;
    isArchived: boolean;
    isManuallyNamed: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type NewChatSession = Omit<ChatSession, 'createdAt' | 'updatedAt'>;

export type ChatMessage = {
    id: string;
    sessionId: string;
    role: string;
    content: string;
    timestamp: Date;
};

export type NewChatMessage = Omit<ChatMessage, 'timestamp'>;

export type Agent = {
    id: string;
    projectId: string | null;
    name: string;
    config: string | null;
    systemPrompt: string | null;
    tools: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewAgent = Omit<Agent, 'createdAt' | 'updatedAt'>;

export type AgentRun = {
    id: string;
    agentId: string;
    status: string;
    input: string | null;
    output: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
};

export type NewAgentRun = Omit<AgentRun, 'startedAt' | 'finishedAt'>;

export type ChapterStatus = 'outline' | 'draft' | 'revision' | 'done';

export type Chapter = {
    id: string;
    projectId: string | null;
    title: string;
    content: string | null;
    filePath: string | null;
    orderIndex: number;
    status: ChapterStatus;
    outline: string | null;
    povCharacterId: string | null;
    wordCountTarget: number | null;
    actId: string | null;
    sequenceId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewChapter = Omit<Chapter, 'createdAt' | 'updatedAt'>;

export type SceneOutline = {
    id: string;
    title: string;
    summary: string;
    setting: string;
    charactersPresent: string[];
    keyEvents: string[];
    duration: string | null;
    conflict: string | null;
};

export type ChapterOutlineData = {
    summary: string;
    scenes: SceneOutline[];
    keyEvents: string[];
    notes: string;
};

export type StoryAct = {
    id: string;
    projectId: string | null;
    title: string;
    summary: string | null;
    orderIndex: number;
    actNumber: number;
    status: ChapterStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryAct = Omit<StoryAct, 'createdAt' | 'updatedAt'>;

export type StorySequence = {
    id: string;
    actId: string | null;
    chapterId: string | null;
    projectId: string | null;
    title: string;
    summary: string | null;
    orderIndex: number;
    displayOrder: number;
    status: ChapterStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStorySequence = Omit<StorySequence, 'createdAt' | 'updatedAt'>;

export type StoryScene = {
    id: string;
    projectId: string | null;
    actId: string | null;
    sequenceId: string | null;
    chapterId: string | null;
    title: string;
    summary: string | null;
    setting: string | null;
    charactersPresent: string | null;
    keyEvents: string | null;
    duration: string | null;
    conflict: string | null;
    status: ChapterStatus;
    orderIndex: number;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryScene = Omit<StoryScene, 'createdAt' | 'updatedAt'>;

export type PlotThreadType =
    'main' | 'subplot' | 'character-arc' | 'mystery' | 'romance' | 'thematic';

export type PlotThread = {
    id: string;
    projectId: string | null;
    name: string;
    description: string | null;
    threadType: PlotThreadType;
    color: string;
    createdAt: Date;
    updatedAt: Date;
};

export type NewPlotThread = Omit<PlotThread, 'createdAt' | 'updatedAt'>;

export type ChapterPlotThread = {
    chapterId: string;
    plotThreadId: string;
    intensity: number;
};

export type StoryBeatType =
    | 'opening-image'
    | 'theme-stated'
    | 'setup'
    | 'catalyst'
    | 'debate'
    | 'break-into-two'
    | 'b-story'
    | 'fun-and-games'
    | 'midpoint'
    | 'bad-guys-close-in'
    | 'all-is-lost'
    | 'dark-night-of-soul'
    | 'break-into-three'
    | 'climax'
    | 'falling-action'
    | 'finale'
    | 'final-image'
    | 'custom';

export type StoryBeat = {
    id: string;
    projectId: string | null;
    chapterId: string | null;
    beatType: StoryBeatType;
    title: string;
    description: string | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt: Date;
};

export type NewStoryBeat = Omit<StoryBeat, 'createdAt' | 'updatedAt'>;

export type Character = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewCharacter = Omit<Character, 'createdAt' | 'updatedAt'>;

export type Location = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewLocation = Omit<Location, 'createdAt' | 'updatedAt'>;

export type Organization = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewOrganization = Omit<Organization, 'createdAt' | 'updatedAt'>;

export type Item = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewItem = Omit<Item, 'createdAt' | 'updatedAt'>;

export type LoreEntry = {
    id: string;
    projectId: string | null;
    name: string;
    filePath: string | null;
    templateData: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewLoreEntry = Omit<LoreEntry, 'createdAt' | 'updatedAt'>;

export type Genre = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export type Tag = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export type Theme = {
    id: string;
    name: string;
    isGlobal: boolean;
    createdAt: Date;
};

export type Series = {
    id: string;
    name: string;
    description: string | null;
    seriesArch: SeriesArchitecture | null;
    coverImageId: string | null;
    projectCount?: number;
    createdAt: Date;
    updatedAt: Date;
};

export type TimelineEvent = {
    id: string;
    projectId: string | null;
    title: string;
    description: string | null;
    inStoryDate: string | null;
    dateOrder: number;
    entityType: string | null;
    entityId: string | null;
    eventType: string;
    chapterId: string | null;
    metadata: Record<string, unknown> | null;
    autoGenerated: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type NewTimelineEvent = Omit<
    TimelineEvent,
    'createdAt' | 'updatedAt' | 'autoGenerated'
>;

export type NewSeries = Omit<
    Series,
    'createdAt' | 'updatedAt' | 'projectCount'
>;

export type GlobalTemplate = {
    id: string;
    name: string;
    description: string | null;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
    createdAt: Date;
    updatedAt: Date;
};

export type NewGlobalTemplate = Omit<GlobalTemplate, 'createdAt' | 'updatedAt'>;

export type SeriesTemplate = {
    id: string;
    seriesId: string;
    name: string;
    description: string | null;
    globalTemplateId: string | null;
    baseType: CompendiumCategory;
    customFields: FieldDefinition[];
    createdAt: Date;
    updatedAt: Date;
};

export type NewSeriesTemplate = Omit<SeriesTemplate, 'createdAt' | 'updatedAt'>;

export type CompendiumCategory =
    'character' | 'location' | 'organization' | 'item' | 'lore';

export type ResolvedTemplateInfo = {
    fields: FieldDefinition[];
    globalTemplate: GlobalTemplate | null;
    seriesTemplate: SeriesTemplate | null;
    projectTemplate: EntityTemplate | null;
};

export type VisibilityOperator =
    | 'isTrue'
    | 'isFalse'
    | 'isEmpty'
    | 'notEmpty'
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'in'
    | 'notIn'
    | 'greaterThan'
    | 'lessThan';

export type VisibilityCondition = {
    field: string;
    operator: VisibilityOperator;
    value?: string | number | boolean | string[];
};

export type FieldVisibility = {
    mode: 'all' | 'any';
    conditions: VisibilityCondition[];
};

export type FieldDefinition = {
    name: string;
    type:
        | 'text'
        | 'number'
        | 'textarea'
        | 'select'
        | 'checkbox'
        | 'date'
        | 'file'
        | 'multiselect'
        | 'entitylink'
        | 'richtext'
        | 'color'
        | 'toggle'
        | 'range'
        | 'portrait'
        | 'images'
        | 'tree';
    label: string;
    required: boolean;
    disabled?: boolean;
    span?: 1 | 2 | 3 | 4;
    options?: string[];
    rangeMin?: number;
    rangeMax?: number;
    rangeStep?: number;
    entitylinkCategories?: CompendiumCategory[];
    treeRelations?: { relation: string; inverse: string }[];
    visibleWhen?: FieldVisibility;
};

export type EntityTemplate = {
    id: string;
    projectId: string | null;
    baseType: CompendiumCategory;
    globalTemplateId: string | null;
    seriesTemplateId: string | null;
    customFields: FieldDefinition[];
    createdAt: Date;
    updatedAt: Date;
};

export type FileTab = {
    id: string;
    name: string;
    type:
        | 'file'
        | 'chapter'
        | CompendiumCategory
        | 'compendium-new'
        | 'plot-architecture';
    filePath: string;
    isModified: boolean;
    category?: CompendiumCategory;
};

export type GeneralSettings = {
    enableAutoSave: boolean;
    autoSaveInterval: number;
    enableAutoBackup: boolean;
    autoBackupInterval: number;
    enableAutoSync: boolean;
    autoSyncInterval: number;
    enableAutoUpdate: boolean;
    autoUpdateInterval: number;
    theme: 'light' | 'dark' | 'system';
    chatViewMode: 'full' | 'truncate' | 'accordion';
    confirmBeforeDelete: boolean;
    autoNamingMethod: 'ai-summarizer' | 'smart-truncation';
    maxContextTokens: number;
    chapterContextMode: 'brief' | 'full';
    dailyTokenLimit: number;
    monthlyTokenLimit: number;
    dailyRequestLimit: number;
    monthlyRequestLimit: number;
};

export type ProjectSettings = {
    defaultProjectsDir: string | null;
    projectDirs: string[];
    openRecentProjectOnStartup: boolean;
    recentProjects: string[];
};

export type AssetLibrarySettings = {
    storagePath: string | null;
    autoCleanupEnabled: boolean;
    cleanupIntervalDays: number;
};

export type { Provider };
export type ModelDisplayMode = 'label' | 'alias' | 'both';
export type ProviderSettings = {
    configs: Provider[];
    modelDisplayMode: ModelDisplayMode;
};

export type EmbeddingSettings = {
    enabled: boolean;
    endpoint: string;
    model: string;
    dimension: number;
    chunkSize: number;
    chunkOverlap: number;
    autoIndexOnSave: boolean;
};

export type ContextSource = {
    entityType: string;
    entityId: string;
    label: string;
    score?: number;
};

export type StorageSettings = {
    encryptionMode: 'machine' | 'password';
    dataLocation: string;
    cacheSize: number;
};

export type SidebarConstraints = {
    enableCustomWidthCap: boolean;
    maxLeftWidth: number;
    maxRightWidth: number;
    leftWidth: number;
    rightWidth: number;
    enableAutoExpandLeft: boolean;
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
    enableAutoSwitchPanel: boolean;
};

export type AppearanceSettings = {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    sidebarConstraints: SidebarConstraints;
    editorWidthMode: 'full' | 'fixed';
    editorMaxWidth: number;
    previewWidth: number;
    previewPosition: 'left' | 'right';
};

export type Settings = {
    general: GeneralSettings;
    projects: ProjectSettings;
    assetLibrary: AssetLibrarySettings;
    providers: ProviderSettings;
    storage: StorageSettings;
    appearance: AppearanceSettings;
    embeddings: EmbeddingSettings;
};

// needs refactor
export type SelectorSchema = {
    bun: {
        messages: {
            'close-window': void;
            'minimize-window': void;
            'maximize-window': void;
            'window-state-changed': boolean;
        };
        requests: {
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
            'window:is-maximized': { params: void; response: boolean };
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
            'db:get-series-projects': { params: string; response: Project[] };
            'db:list-global-templates': {
                params: { baseType?: CompendiumCategory } | void;
                response: GlobalTemplate[];
            };
            'db:get-global-template': {
                params: string;
                response: GlobalTemplate | undefined;
            };
            'db:create-global-template': {
                params: NewGlobalTemplate;
                response: GlobalTemplate;
            };
            'db:update-global-template': {
                params: { id: string; data: Partial<NewGlobalTemplate> };
                response: GlobalTemplate | undefined;
            };
            'db:delete-global-template': { params: string; response: void };
            'db:list-series-templates': {
                params: { seriesId: string; baseType?: CompendiumCategory };
                response: SeriesTemplate[];
            };
            'db:get-series-template': {
                params: string;
                response: SeriesTemplate | undefined;
            };
            'db:create-series-template': {
                params: NewSeriesTemplate;
                response: SeriesTemplate;
            };
            'db:update-series-template': {
                params: { id: string; data: Partial<NewSeriesTemplate> };
                response: SeriesTemplate | undefined;
            };
            'db:delete-series-template': { params: string; response: void };
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
                    customFields: FieldDefinition[];
                    globalTemplateId?: string | null;
                    seriesTemplateId?: string | null;
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
        };
    };
    webview: {
        messages: {
            'close-window': void;
            'minimize-window': void;
            'maximize-window': void;
            'window-state-changed': boolean;
        };
        requests: {};
    };
};
