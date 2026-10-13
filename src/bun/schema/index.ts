import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const series = sqliteTable('series', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    seriesArch: text('series_arch'),
    coverImageId: text('cover_image_id'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const projects = sqliteTable('projects', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    path: text('path'),
    metadata: text('metadata'),
    description: text('description'),
    systemPrompt: text('system_prompt'),
    coverImageId: text('cover_image_id'),
    cover_images_array: text('cover_images_array'),
    projectScope: text('project_scope'),
    seriesArch: text('series_arch'),
    seriesId: text('series_id').references(() => series.id),
    pov: text('pov'),
    pacing: text('pacing'),
    workType: text('work_type'),
    projectStructure: text('project_structure'),
    targetAge: text('target_age'),
    projectStatus: text('project_status').notNull().default('planning'),
    tonalType: text('tonal_type'),
    contentRating: text('content_rating').notNull().default('Unrated'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const assets = sqliteTable('assets', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    type: text('type').notNull(),
    path: text('path'),
    metadata: text('metadata'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const chatSessions = sqliteTable('chat_sessions', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    title: text('title').notNull(),
    isArchived: integer('is_archived', { mode: 'boolean' })
        .notNull()
        .default(false),
    isManuallyNamed: integer('is_manually_named', { mode: 'boolean' })
        .notNull()
        .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const chatMessages = sqliteTable('chat_messages', {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
        .references(() => chatSessions.id, { onDelete: 'cascade' })
        .notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    timestamp: integer('timestamp', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const agents = sqliteTable('agents', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    config: text('config'),
    systemPrompt: text('system_prompt'),
    tools: text('tools'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const agentRuns = sqliteTable('agent_runs', {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
        .references(() => agents.id, { onDelete: 'cascade' })
        .notNull(),
    status: text('status').notNull().default('pending'),
    input: text('input'),
    output: text('output'),
    startedAt: integer('started_at', { mode: 'timestamp' }).$defaultFn(
        () => new Date()
    ),
    finishedAt: integer('finished_at', { mode: 'timestamp' }),
});

export const chapters = sqliteTable('chapters', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    title: text('title').notNull(),
    content: text('content'),
    filePath: text('file_path'),
    orderIndex: integer('order_index').notNull().default(0),
    status: text('status').notNull().default('outline'),
    outline: text('outline'),
    povCharacterId: text('pov_character_id').references(() => characters.id),
    wordCountTarget: integer('word_count_target'),
    actId: text('act_id').references(() => storyActs.id),
    sequenceId: text('sequence_id').references(() => storySequences.id),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const characters = sqliteTable('characters', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    filePath: text('file_path'),
    templateData: text('template_data'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const locations = sqliteTable('locations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    filePath: text('file_path'),
    templateData: text('template_data'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const organizations = sqliteTable('organizations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    filePath: text('file_path'),
    templateData: text('template_data'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const items = sqliteTable('items', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    filePath: text('file_path'),
    templateData: text('template_data'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const loreEntries = sqliteTable('lore_entries', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    filePath: text('file_path'),
    templateData: text('template_data'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const genres = sqliteTable('genres', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    isGlobal: integer('is_global', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const tags = sqliteTable('tags', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    isGlobal: integer('is_global', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const projectGenres = sqliteTable('project_genres', {
    projectId: text('project_id').references(() => projects.id, {
        onDelete: 'cascade',
    }),
    genreId: text('genre_id').references(() => genres.id, {
        onDelete: 'cascade',
    }),
    isPrimary: integer('is_primary', { mode: 'boolean' })
        .notNull()
        .default(false),
});

export const projectTags = sqliteTable('project_tags', {
    projectId: text('project_id').references(() => projects.id, {
        onDelete: 'cascade',
    }),
    tagId: text('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
});

export const themes = sqliteTable('themes', {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    isGlobal: integer('is_global', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const projectThemes = sqliteTable('project_themes', {
    projectId: text('project_id').references(() => projects.id, {
        onDelete: 'cascade',
    }),
    themeId: text('theme_id').references(() => themes.id, {
        onDelete: 'cascade',
    }),
    isPrimary: integer('is_primary', { mode: 'boolean' })
        .notNull()
        .default(false),
});

export const entryRelationships = sqliteTable('entry_relationships', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    relationshipType: text('relationship_type').notNull(),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const scratchNotes = sqliteTable('scratch_notes', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    content: text('content'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const globalTemplates = sqliteTable('global_templates', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    baseType: text('base_type').notNull(),
    customFields: text('custom_fields'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const seriesTemplates = sqliteTable('series_templates', {
    id: text('id').primaryKey(),
    seriesId: text('series_id')
        .notNull()
        .references(() => series.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    baseType: text('base_type').notNull(),
    globalTemplateId: text('global_template_id').references(
        () => globalTemplates.id
    ),
    customFields: text('custom_fields'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const entityTemplates = sqliteTable('entity_templates', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    baseType: text('base_type').notNull(),
    globalTemplateId: text('global_template_id').references(
        () => globalTemplates.id
    ),
    seriesTemplateId: text('series_template_id').references(
        () => seriesTemplates.id
    ),
    customFields: text('custom_fields'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const tokenUsage = sqliteTable('token_usage', {
    id: text('id').primaryKey(),
    sessionId: text('session_id').references(() => chatSessions.id, {
        onDelete: 'set null',
    }),
    projectId: text('project_id').references(() => projects.id),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    model: text('model'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const timelineEvents = sqliteTable('timeline_events', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    title: text('title').notNull(),
    description: text('description'),
    inStoryDate: text('in_story_date'),
    dateOrder: integer('date_order').notNull().default(0),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    eventType: text('event_type').notNull().default('milestone'),
    chapterId: text('chapter_id').references(() => chapters.id),
    metadata: text('metadata'),
    autoGenerated: integer('auto_generated', { mode: 'boolean' })
        .notNull()
        .default(false),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const projectReferences = sqliteTable('project_references', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    filePath: text('file_path'),
    category: text('category'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const inspirations = sqliteTable('inspirations', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    sourceName: text('source_name').notNull(),
    sourceType: text('source_type').notNull(),
    sourceYear: integer('source_year'),
    inspiredAspects: text('inspired_aspects'),
    inspiredNotes: text('inspired_notes'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const storyActs = sqliteTable('story_acts', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    title: text('title').notNull(),
    summary: text('summary'),
    orderIndex: integer('order_index').notNull().default(0),
    actNumber: integer('act_number').notNull().default(1),
    status: text('status').notNull().default('outline'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const storySequences = sqliteTable('story_sequences', {
    id: text('id').primaryKey(),
    actId: text('act_id').references(() => storyActs.id, {
        onDelete: 'cascade',
    }),
    chapterId: text('chapter_id').references((): any => chapters.id),
    projectId: text('project_id').references(() => projects.id),
    title: text('title').notNull(),
    summary: text('summary'),
    orderIndex: integer('order_index').notNull().default(0),
    displayOrder: integer('display_order').notNull().default(0),
    status: text('status').notNull().default('outline'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const storyScenes = sqliteTable('story_scenes', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    actId: text('act_id').references(() => storyActs.id),
    sequenceId: text('sequence_id').references(() => storySequences.id),
    chapterId: text('chapter_id').references(() => chapters.id),
    title: text('title').notNull(),
    summary: text('summary'),
    setting: text('setting'),
    charactersPresent: text('characters_present'),
    keyEvents: text('key_events'),
    duration: text('duration'),
    conflict: text('conflict'),
    status: text('status').notNull().default('outline'),
    orderIndex: integer('order_index').notNull().default(0),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const plotThreads = sqliteTable('plot_threads', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    name: text('name').notNull(),
    description: text('description'),
    threadType: text('thread_type').notNull().default('subplot'),
    color: text('color').notNull().default('#6366f1'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const chapterPlotThreads = sqliteTable('chapter_plot_threads', {
    chapterId: text('chapter_id')
        .notNull()
        .references(() => chapters.id, { onDelete: 'cascade' }),
    plotThreadId: text('plot_thread_id')
        .notNull()
        .references(() => plotThreads.id, { onDelete: 'cascade' }),
    intensity: integer('intensity').notNull().default(5),
});

export const storyBeats = sqliteTable('story_beats', {
    id: text('id').primaryKey(),
    projectId: text('project_id').references(() => projects.id),
    chapterId: text('chapter_id').references(() => chapters.id),
    beatType: text('beat_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const embeddings = sqliteTable('embeddings', {
    id: text('id').primaryKey(),
    projectId: text('project_id')
        .references(() => projects.id, { onDelete: 'cascade' })
        .notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    contentHash: text('content_hash').notNull(),
    chunkIndex: integer('chunk_index').notNull().default(0),
    chunkText: text('chunk_text').notNull(),
    tokenCount: integer('token_count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
});
