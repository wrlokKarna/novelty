import {
    BrowserWindow,
    Updater,
    defineElectrobunRPC,
    Utils,
} from 'electrobun/main';

import { readFileSync, existsSync } from 'fs';

import {
    indexProject,
    getIndexStatus,
    rebuildProjectEmbeddings,
} from './services/embeddings/pipeline';
import { buildContext } from './services/contextEngine';
import * as settingsDB from './services/settings/settings';

import type { ProcessAiPromptParams } from './temp/mainMCP.js';

import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { mcpClient } from './services/mcp/client.js';
import { mcpServer } from './services/mcp/server.js';
import registerAllTools from './services/mcp/tools.js';
import type {
    NewAsset,
    NewItem,
    NewLocation,
    NewProject,
    NewStoryAct,
    NewStorySequence,
} from '../shared/types/index.js';
import type {
    NewAgent,
    NewAgentRun,
    NewChatMessage,
    NewChatSession,
} from '../shared/types/ai/index.js';
import type {
    NewPlotThread,
    NewStoryBeat,
    NewStoryScene,
} from '../shared/types/project/manuscript/index.js';
import type {
    NewChapter,
    NewInspiration,
} from '../shared/types/project/index.js';
import type {
    NewSeries,
    SeriesTemplateInput,
} from '../shared/types/series/index.js';
import type { NewTimelineEvent } from '../shared/types/project/timeline/index.js';
import type { SelectorSchema } from '../shared/types/mainRPC.js';
import type {
    CompendiumCategory,
    NewCharacter,
    NewLoreEntry,
    NewOrganization,
} from '../shared/types/project/compendium/index.js';
import type {
    FieldDefinition,
    TemplateLayout,
} from '../shared/types/project/templates/index.js';
import { initDatabase } from '@/bun/database/init.js';
import {
    projectsDB,
    assetsDB,
    chaptersDB,
    scratchDB,
    chatDB,
    agentsDB,
    charactersDB,
    locationsDB,
    organizationsDB,
    itemsDB,
    loreDB,
    genresDB,
    tagsDB,
    themesDB,
    seriesDB,
    seriesTemplatesDB,
    templatesDB,
    timelineDB,
    actsDB,
    scenesDB,
    plotThreadsDB,
    storyBeatsDB,
    usageDB,
    inspirationsDB,
} from '@/bun/database';
import { db, sqliteVecAvailable, rawSqlite, dbPath } from '@/bun/electrobun/db';

registerAllTools();
try {
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
    await mcpServer.connect(serverTransport);
    await mcpClient.connect(clientTransport);
} catch (err) {
    console.error('Failed to initialize MCP transport:', err);
}
const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getUrl(viewName: string): Promise<string> {
    const channel = await Updater.localInfo.channel();
    if (channel === 'dev') {
        try {
            await fetch(DEV_SERVER_URL, { method: 'HEAD' });
            // Point to the specific view path in Vite's dev server
            return `${DEV_SERVER_URL}/${viewName}/index.html`;
        } catch {
            // ... fallback
        }
    }
    return `views://${viewName}/index.html`;
}
let win: BrowserWindow | null = null;
let currentProjectId: string | null = null;

const mainRPC = defineElectrobunRPC<SelectorSchema>('bun', {
    handlers: {
        messages: {
            'close-window': () => win?.close(),
            'minimize-window': () => win?.minimize(),
            'maximize-window': () => {
                if (win?.isMaximized()) {
                    win?.unmaximize();
                } else {
                    win?.maximize();
                }
                setTimeout(() => {
                    mainRPC.send['window-state-changed'](
                        win?.isMaximized() ?? false
                    );
                }, 100);
            },
        },
        requests: {
            'window:is-maximized': () => win?.isMaximized() ?? false,
            'db:get-projects': async () => {
                return await projectsDB.getAllProjects(db);
            },
            'db:get-project': async (id: string) => {
                return await projectsDB.getProjectById(db, id);
            },
            'db:create-project': async (project: NewProject) => {
                return await projectsDB.createProject(db, project);
            },
            'db:update-project': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewProject>;
            }) => {
                return await projectsDB.updateProject(db, id, data);
            },
            'db:delete-project': async (id: string) => {
                return await projectsDB.deleteProject(db, id);
            },
            'project:get-current': async () => {
                if (!currentProjectId) return null;
                return await projectsDB.getProjectById(db, currentProjectId);
            },
            'project:set-current': async (projectId: string) => {
                const project = await projectsDB.getProjectById(db, projectId);
                if (project) {
                    currentProjectId = projectId;
                    const settings = settingsDB.getAllSettings();
                    const recentProjects =
                        settings.projects.recentProjects.filter(
                            (id: string) => id !== projectId
                        );
                    recentProjects.unshift(projectId);
                    settings.projects.recentProjects = recentProjects.slice(
                        0,
                        10
                    );
                    settingsDB.saveSettings(settings);
                    if (win) {
                        win.setTitle(project.name);
                    }
                    return project;
                }
                return null;
            },
            'db:get-assets': async (projectId: string) => {
                return await assetsDB.getAssetsByProject(db, projectId);
            },
            'db:get-asset': async (id: string) => {
                return await assetsDB.getAssetById(db, id);
            },
            'db:create-asset': async (asset: NewAsset) => {
                return await assetsDB.createAsset(db, asset);
            },
            'db:update-asset': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewAsset>;
            }) => {
                return await assetsDB.updateAsset(db, id, data);
            },
            'db:delete-asset': async (id: string) => {
                return await assetsDB.deleteAsset(db, id);
            },
            'db:get-chapters': async (projectId: string) => {
                return await chaptersDB.getChaptersByProject(db, projectId);
            },
            'db:get-chapter': async (id: string) => {
                return await chaptersDB.getChapterById(db, id);
            },
            'db:create-chapter': async (chapter: NewChapter) => {
                return await chaptersDB.createChapter(db, chapter);
            },
            'db:update-chapter': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewChapter>;
            }) => {
                return await chaptersDB.updateChapter(db, id, data);
            },
            'db:delete-chapter': async (id: string) => {
                return await chaptersDB.deleteChapter(db, id);
            },
            'db:get-chapter-by-id': async (id: string) => {
                return await chaptersDB.getChapterById(db, id);
            },
            'db:get-scratch': async (projectId: string) => {
                const result = await scratchDB.getScratchNote(db, projectId);
                return result?.content || null;
            },
            'db:save-scratch': async ({
                projectId,
                content,
            }: {
                projectId: string;
                content: string;
            }) => {
                await scratchDB.saveScratchNote(db, projectId, content);
            },
            'db:get-sessions': async () => {
                return await chatDB.getAllSessions(db);
            },
            'db:get-session': async (id: string) => {
                return await chatDB.getSessionById(db, id);
            },
            'db:create-session': async (session: NewChatSession) => {
                return await chatDB.createSession(db, session);
            },
            'db:update-session': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewChatSession>;
            }) => {
                return await chatDB.updateSession(db, id, data);
            },
            'db:delete-session': async (id: string) => {
                return await chatDB.deleteSession(db, id);
            },
            'db:get-sessions-by-project': async (projectId: string) => {
                return await chatDB.getSessionsByProject(db, projectId);
            },
            'db:get-messages': async (sessionId: string) => {
                return await chatDB.getMessagesBySession(db, sessionId);
            },
            'db:create-message': async (message: NewChatMessage) => {
                return await chatDB.createMessage(db, message);
            },
            'db:get-agents': async () => {
                return await agentsDB.getAllAgents(db);
            },
            'db:get-agent': async (id: string) => {
                return await agentsDB.getAgentById(db, id);
            },
            'db:create-agent': async (agent: NewAgent) => {
                return await agentsDB.createAgent(db, agent);
            },
            'db:update-agent': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewAgent>;
            }) => {
                return await agentsDB.updateAgent(db, id, data);
            },
            'db:delete-agent': async (id: string) => {
                return await agentsDB.deleteAgent(db, id);
            },
            'db:get-runs': async (agentId: string) => {
                return await agentsDB.getRunsByAgent(db, agentId);
            },
            'db:create-run': async (run: NewAgentRun) => {
                return await agentsDB.createRun(db, run);
            },
            'db:update-run': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewAgentRun>;
            }) => {
                return await agentsDB.updateRun(db, id, data);
            },
            'settings:get-all': async () => {
                return settingsDB.getAllSettings();
            },
            'settings:get': async (key: string) => {
                const s = settingsDB.getAllSettings();
                return (s as Record<string, unknown>)[key];
            },
            'settings:set': async ({
                key,
                value,
            }: {
                key: string;
                value: unknown;
            }) => {
                const s = settingsDB.getAllSettings();
                (s as Record<string, unknown>)[key] = value;
                settingsDB.saveSettings(s);
            },
            'settings:set-encryption': async ({
                mode,
                password,
            }: {
                mode: 'machine' | 'password';
                password?: string;
            }) => {
                settingsDB.setEncryptionMode(mode, password);
            },
            'settings:unlock': async ({ password }: { password: string }) => {
                return settingsDB.unlockWithPassword(password);
            },
            'settings:lock': async () => {
                settingsDB.lockSettings();
            },
            'settings:reset': async () => {
                settingsDB.resetSettings();
            },
            'settings:is-locked': async () => {
                return settingsDB.isLocked();
            },
            'settings:get-encryption-mode': async () => {
                return settingsDB.getEncryptionMode();
            },
            'storage:clear-cache': async () => {
                return settingsDB.clearCache();
            },
            'storage:get-cache-size': async () => {
                return settingsDB.getCacheSize();
            },
            'dialog:open-directory': async () => {
                const result = await Utils.openFileDialog({
                    canChooseFiles: false,
                    canChooseDirectory: true,
                    allowsMultipleSelection: false,
                });
                return result?.[0] || null;
            },
            'dialog:save-file': async ({
                defaultPath,
            }: {
                defaultPath: string;
            }) => {
                return defaultPath || null;
            },
            'dialog:open-file': async () => {
                const result = await Utils.openFileDialog({
                    canChooseFiles: true,
                    canChooseDirectory: false,
                    allowsMultipleSelection: false,
                });
                return result?.[0] || null;
            },
            'open-projects': async () => {
                const settings = settingsDB.getAllSettings();
                const projectsPath = settings.projects.defaultProjectsDir;
                if (projectsPath) {
                    Utils.openPath(projectsPath);
                }
            },
            'open-project-folder': async (projectId: string) => {
                const project = await projectsDB.getProjectById(db, projectId);
                if (project?.path) {
                    Utils.openPath(project.path);
                }
            },
            'reveal-in-explorer': async (path: string) => {
                Utils.showItemInFolder(path);
            },
            'file:read-content': async (filePath: string) => {
                try {
                    if (existsSync(filePath)) {
                        return readFileSync(filePath, 'utf-8');
                    }
                    return null;
                } catch {
                    return null;
                }
            },
            'db:save-project-system-prompt': async ({
                projectId,
                prompt,
            }: {
                projectId: string;
                prompt: string;
            }) => {
                await projectsDB.updateProject(db, projectId, {
                    systemPrompt: prompt,
                } as Partial<NewProject>);
            },
            'db:get-project-system-prompt': async (projectId: string) => {
                const project = await projectsDB.getProjectById(db, projectId);
                return project?.systemPrompt || null;
            },
            'db:get-characters': async (projectId: string) => {
                return await charactersDB.getCharactersByProject(db, projectId);
            },
            'db:get-character': async (id: string) => {
                return await charactersDB.getCharacterById(db, id);
            },
            'db:create-character': async (character: NewCharacter) => {
                return await charactersDB.createCharacter(db, character);
            },
            'db:update-character': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewCharacter>;
            }) => {
                return await charactersDB.updateCharacter(db, id, data);
            },
            'db:delete-character': async (id: string) => {
                return await charactersDB.deleteCharacter(db, id);
            },
            'db:get-locations': async (projectId: string) => {
                return await locationsDB.getLocationsByProject(db, projectId);
            },
            'db:get-location': async (id: string) => {
                return await locationsDB.getLocationById(db, id);
            },
            'db:create-location': async (location: NewLocation) => {
                return await locationsDB.createLocation(db, location);
            },
            'db:update-location': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewLocation>;
            }) => {
                return await locationsDB.updateLocation(db, id, data);
            },
            'db:delete-location': async (id: string) => {
                return await locationsDB.deleteLocation(db, id);
            },
            'db:get-organizations': async (projectId: string) => {
                return await organizationsDB.getOrganizationsByProject(
                    db,
                    projectId
                );
            },
            'db:get-organization': async (id: string) => {
                return await organizationsDB.getOrganizationById(db, id);
            },
            'db:create-organization': async (organization: NewOrganization) => {
                return await organizationsDB.createOrganization(
                    db,
                    organization
                );
            },
            'db:update-organization': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewOrganization>;
            }) => {
                return await organizationsDB.updateOrganization(db, id, data);
            },
            'db:delete-organization': async (id: string) => {
                return await organizationsDB.deleteOrganization(db, id);
            },
            'db:get-items': async (projectId: string) => {
                return await itemsDB.getItemsByProject(db, projectId);
            },
            'db:get-item': async (id: string) => {
                return await itemsDB.getItemById(db, id);
            },
            'db:create-item': async (item: NewItem) => {
                return await itemsDB.createItem(db, item);
            },
            'db:update-item': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewItem>;
            }) => {
                return await itemsDB.updateItem(db, id, data);
            },
            'db:delete-item': async (id: string) => {
                return await itemsDB.deleteItem(db, id);
            },
            'db:get-lore-entries': async (projectId: string) => {
                return await loreDB.getLoreEntriesByProject(db, projectId);
            },
            'db:get-lore-entry': async (id: string) => {
                return await loreDB.getLoreEntryById(db, id);
            },
            'db:create-lore-entry': async (entry: NewLoreEntry) => {
                return await loreDB.createLoreEntry(db, entry);
            },
            'db:update-lore-entry': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewLoreEntry>;
            }) => {
                return await loreDB.updateLoreEntry(db, id, data);
            },
            'db:delete-lore-entry': async (id: string) => {
                return await loreDB.deleteLoreEntry(db, id);
            },
            'db:get-genres': async () => {
                return await genresDB.getAllGenres(db);
            },
            'db:create-genre': async ({
                name,
                isGlobal,
            }: {
                name: string;
                isGlobal?: boolean;
            }) => {
                return await genresDB.createGenre(db, name, isGlobal);
            },
            'db:delete-genre': async (id: string) => {
                return await genresDB.deleteGenre(db, id);
            },
            'db:get-tags': async () => {
                return await tagsDB.getAllTags(db);
            },
            'db:create-tag': async ({
                name,
                isGlobal,
            }: {
                name: string;
                isGlobal?: boolean;
            }) => {
                return await tagsDB.createTag(db, name, isGlobal);
            },
            'db:delete-tag': async (id: string) => {
                return await tagsDB.deleteTag(db, id);
            },
            'db:get-themes': async () => {
                return await themesDB.getAllThemes(db);
            },
            'db:create-theme': async ({
                name,
                isGlobal,
            }: {
                name: string;
                isGlobal?: boolean;
            }) => {
                return await themesDB.createTheme(db, name, isGlobal);
            },
            'db:delete-theme': async (id: string) => {
                return await themesDB.deleteTheme(db, id);
            },
            'db:list-series': async () => {
                return await seriesDB.listSeries(db);
            },
            'db:get-series': async (id: string) => {
                return await seriesDB.getSeriesById(db, id);
            },
            'db:create-series': async (data: NewSeries) => {
                return await seriesDB.createSeries(db, data);
            },
            'db:update-series': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewSeries>;
            }) => {
                return await seriesDB.updateSeries(db, id, data);
            },
            'db:delete-series': async (id: string) => {
                return await seriesDB.deleteSeries(db, id);
            },
            'db:get-series-projects': async (seriesId: string) => {
                return await seriesDB.getSeriesProjects(db, seriesId);
            },
            'db:list-series-templates': async ({
                seriesId,
            }: {
                seriesId: string;
            }) => {
                return await seriesTemplatesDB.listSeriesTemplates(
                    db,
                    seriesId
                );
            },
            'db:upsert-series-template': async (data: SeriesTemplateInput) => {
                return await seriesTemplatesDB.upsertSeriesTemplate(db, data);
            },
            'db:delete-series-template': async ({
                seriesId,
                baseType,
            }: {
                seriesId: string;
                baseType: CompendiumCategory;
            }) => {
                return await seriesTemplatesDB.deleteSeriesTemplate(
                    db,
                    seriesId,
                    baseType
                );
            },
            'db:get-template': async ({
                projectId,
                baseType,
            }: {
                projectId: string;
                baseType: string;
            }) => {
                const result = await templatesDB.getTemplateByProjectAndType(
                    db,
                    projectId,
                    baseType as
                        | 'character'
                        | 'location'
                        | 'organization'
                        | 'item'
                        | 'lore'
                );
                return result;
            },
            'db:get-resolved-template': async ({
                projectId,
                baseType,
            }: {
                projectId: string;
                baseType: string;
            }) => {
                const result = await templatesDB.resolveTemplate(
                    db,
                    projectId,
                    baseType as
                        | 'character'
                        | 'location'
                        | 'organization'
                        | 'item'
                        | 'lore'
                );
                return result;
            },
            'db:save-template': async ({
                projectId,
                baseType,
                customFields,
                layout,
            }: {
                projectId: string;
                baseType: string;
                customFields?: FieldDefinition[];
                layout?: TemplateLayout | null;
            }) => {
                return await templatesDB.upsertTemplate(
                    db,
                    projectId,
                    baseType as
                        | 'character'
                        | 'location'
                        | 'organization'
                        | 'item'
                        | 'lore',
                    customFields,
                    layout
                );
            },
            'db:get-timeline-events': async (projectId: string) => {
                return await timelineDB.getEventsByProject(db, projectId);
            },
            'db:get-timeline-event': async (id: string) => {
                return await timelineDB.getEventById(db, id);
            },
            'db:create-timeline-event': async (event: NewTimelineEvent) => {
                return await timelineDB.createEvent(db, event);
            },
            'db:update-timeline-event': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewTimelineEvent>;
            }) => {
                return await timelineDB.updateEvent(db, id, data);
            },
            'db:delete-timeline-event': async (id: string) => {
                return await timelineDB.deleteEvent(db, id);
            },
            'db:auto-generate-timeline-events': async (projectId: string) => {
                return await timelineDB.autoGenerateEvents(db, projectId);
            },
            'db:get-story-acts': async (projectId: string) => {
                return await actsDB.getActsByProject(db, projectId);
            },
            'db:get-story-act': async (id: string) => {
                return await actsDB.getActById(db, id);
            },
            'db:create-story-act': async (act: NewStoryAct) => {
                return await actsDB.createAct(db, act);
            },
            'db:update-story-act': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewStoryAct>;
            }) => {
                return await actsDB.updateAct(db, id, data);
            },
            'db:delete-story-act': async (id: string) => {
                await actsDB.deleteAct(db, id);
            },
            'db:get-story-sequences': async (projectId: string) => {
                return await actsDB.getSequencesByProject(db, projectId);
            },
            'db:get-story-sequence': async (id: string) => {
                return await actsDB.getSequenceById(db, id);
            },
            'db:create-story-sequence': async (seq: NewStorySequence) => {
                return await actsDB.createSequence(db, seq);
            },
            'db:update-story-sequence': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewStorySequence>;
            }) => {
                return await actsDB.updateSequence(db, id, data);
            },
            'db:delete-story-sequence': async (id: string) => {
                await actsDB.deleteSequence(db, id);
            },
            'db:get-sequences-by-act': async (actId: string) => {
                return await actsDB.getSequencesByAct(db, actId);
            },
            'db:get-sequences-by-chapter': async (chapterId: string) => {
                return await actsDB.getSequencesByChapter(db, chapterId);
            },
            'db:reorder-acts': async (
                updates: { id: string; orderIndex: number }[]
            ) => {
                await actsDB.reorderActs(db, updates);
            },
            'db:reorder-sequences': async (
                updates: {
                    id: string;
                    orderIndex: number;
                    displayOrder?: number;
                }[]
            ) => {
                await actsDB.reorderSequences(db, updates);
            },
            'db:get-story-scenes': async (projectId: string) => {
                return await scenesDB.getScenesByProject(db, projectId);
            },
            'db:get-story-scene': async (id: string) => {
                return await scenesDB.getSceneById(db, id);
            },
            'db:get-scenes-by-sequence': async (sequenceId: string) => {
                return await scenesDB.getScenesBySequence(db, sequenceId);
            },
            'db:get-scenes-by-chapter': async (chapterId: string) => {
                return await scenesDB.getScenesByChapter(db, chapterId);
            },
            'db:create-story-scene': async (scene: NewStoryScene) => {
                return await scenesDB.createScene(db, scene);
            },
            'db:update-story-scene': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewStoryScene>;
            }) => {
                return await scenesDB.updateScene(db, id, data);
            },
            'db:delete-story-scene': async (id: string) => {
                await scenesDB.deleteScene(db, id);
            },
            'db:reorder-scenes': async (
                updates: {
                    id: string;
                    orderIndex: number;
                    displayOrder?: number;
                }[]
            ) => {
                await scenesDB.reorderScenes(db, updates);
            },
            'db:move-scene': async ({
                id,
                data,
            }: {
                id: string;
                data: {
                    sequenceId?: string | null;
                    chapterId?: string | null;
                    actId?: string | null;
                    orderIndex?: number;
                    displayOrder?: number;
                };
            }) => {
                return await scenesDB.moveScene(db, id, data);
            },
            'db:get-plot-threads': async (projectId: string) => {
                return await plotThreadsDB.getThreadsByProject(db, projectId);
            },
            'db:get-plot-thread': async (id: string) => {
                return await plotThreadsDB.getThreadById(db, id);
            },
            'db:create-plot-thread': async (thread: NewPlotThread) => {
                return await plotThreadsDB.createThread(db, thread);
            },
            'db:update-plot-thread': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewPlotThread>;
            }) => {
                return await plotThreadsDB.updateThread(db, id, data);
            },
            'db:delete-plot-thread': async (id: string) => {
                await plotThreadsDB.deleteThread(db, id);
            },
            'db:get-chapter-plot-threads': async (chapterId: string) => {
                return await plotThreadsDB.getChapterThreads(db, chapterId);
            },
            'db:set-chapter-plot-threads': async ({
                chapterId,
                threads,
            }: {
                chapterId: string;
                threads: { plotThreadId: string; intensity: number }[];
            }) => {
                await plotThreadsDB.setChapterThreads(db, chapterId, threads);
            },
            'db:get-story-beats': async (projectId: string) => {
                return await storyBeatsDB.getBeatsByProject(db, projectId);
            },
            'db:get-story-beat': async (id: string) => {
                return await storyBeatsDB.getBeatById(db, id);
            },
            'db:create-story-beat': async (beat: NewStoryBeat) => {
                return await storyBeatsDB.createBeat(db, beat);
            },
            'db:update-story-beat': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewStoryBeat>;
            }) => {
                return await storyBeatsDB.updateBeat(db, id, data);
            },
            'db:delete-story-beat': async (id: string) => {
                await storyBeatsDB.deleteBeat(db, id);
            },
            'usage:log': async (params: {
                sessionId: string | null;
                projectId: string | null;
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
                model: string | null;
            }) => {
                await usageDB.logUsage(db, {
                    id: crypto.randomUUID(),
                    sessionId: params.sessionId,
                    projectId: params.projectId,
                    promptTokens: params.promptTokens,
                    completionTokens: params.completionTokens,
                    totalTokens: params.totalTokens,
                    model: params.model,
                });
            },
            'usage:get-stats': async ({
                period,
                projectId,
            }: {
                period: 'today' | 'month';
                projectId: string | null;
            }) => {
                return await usageDB.getUsageStats(db, period, projectId);
            },
            'db:get-inspirations': async (projectId: string) => {
                return await inspirationsDB.getInspirations(db, projectId);
            },
            'db:create-inspiration': async (data: NewInspiration) => {
                return await inspirationsDB.createInspiration(db, data);
            },
            'db:update-inspiration': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewInspiration>;
            }) => {
                return await inspirationsDB.updateInspiration(db, id, data);
            },
            'db:delete-inspiration': async (id: string) => {
                await inspirationsDB.deleteInspiration(db, id);
            },
            'embeddings:index-project': async (params: {
                projectId: string;
            }) => {
                const settings = settingsDB.getAllSettings();
                return await indexProject(
                    params.projectId,
                    settings.embeddings
                );
            },
            'embeddings:index-entity': async (_params: {
                entityType: string;
                entityId: string;
            }) => {
                // Index single entity - placeholder for future use
            },
            'embeddings:status': async (projectId: string) => {
                return getIndexStatus(projectId);
            },
            'embeddings:rebuild': async (projectId: string) => {
                const settings = settingsDB.getAllSettings();
                rebuildProjectEmbeddings(projectId, settings.embeddings);
            },
            'embeddings:check-availability': async () => {
                return sqliteVecAvailable;
            },
            'embeddings:test-server': async () => {
                const settings = settingsDB.getAllSettings();
                const emb = settings.embeddings;
                if (!emb || !emb.enabled)
                    return { ok: false, error: 'Embeddings not enabled' };
                try {
                    const isOllama = emb.endpoint.includes(':11434');
                    const url = isOllama
                        ? `${emb.endpoint.replace(/\/$/, '')}/api/embeddings`
                        : `${emb.endpoint.replace(/\/$/, '')}/embeddings`;
                    const body = isOllama
                        ? { model: emb.model, prompt: 'test' }
                        : { model: emb.model, input: ['test'] };
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    if (response.ok) return { ok: true };
                    const text = await response.text();
                    return { ok: false, error: `${response.status}: ${text}` };
                } catch (e: any) {
                    return { ok: false, error: e.message || String(e) };
                }
            },
            'embeddings:context': async (params: {
                projectId: string;
                userMessage: string;
                currentChapterId?: string;
                mentionTargets?: any[];
                fileContents?: string[];
                customPrompt?: string | null;
                chapterContextMode?: 'brief' | 'full';
                tokenBudget: number;
            }) => {
                const settings = settingsDB.getAllSettings();
                const project = await projectsDB.getProjectById(
                    db,
                    params.projectId
                );
                if (!project) {
                    return { systemPrompt: '', tokenEstimate: 0, sources: [] };
                }
                return await buildContext({
                    ...params,
                    project: project as any,
                    embeddingSettings: settings.embeddings,
                });
            },
            'ai:get-tools': async () => {
                try {
                    const mcpToolsResult = await mcpClient.listTools();
                    console.log('mcp tools', mcpToolsResult);

                    const llmTools = mcpToolsResult.tools.map((tool) => ({
                        type: 'function',
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.inputSchema,
                        },
                    }));

                    return llmTools;
                } catch (error) {
                    console.error(
                        'Error fetching MCP tools in ai:get-tools:',
                        error
                    );
                    return [];
                }
            },
            'ai:execute-tool': async (params: {
                name: string;
                arguments?: Record<string, unknown>;
            }) => {
                try {
                    console.log(
                        'Executing MCP tool:',
                        params.name,
                        params.arguments
                    );
                    const result = await mcpClient.callTool({
                        name: params.name,
                        arguments: params.arguments || {},
                    });
                    return result as any;
                } catch (error) {
                    console.error(
                        `Error executing tool ${params?.name}:`,
                        error
                    );
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
                            },
                        ],
                        isError: true,
                    };
                }
            },
            'ai:process-prompt': async (params: ProcessAiPromptParams) => {
                console.log('entry');
                const payload = params;
                if (!payload || typeof payload.prompt !== 'string') {
                    throw new Error(
                        "Invalid RPC payload: 'prompt' string is required"
                    );
                }
                const { prompt, model = 'llama3.2:3b' } = payload;

                console.log('[p, m]', prompt, model);

                try {
                    const mcpToolsResult = await mcpClient.listTools();
                    console.log('mcp tools', mcpToolsResult);

                    const llmTools = mcpToolsResult.tools.map((tool) => ({
                        type: 'function',
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.inputSchema,
                        },
                    }));

                    const response = await fetch(
                        'http://192.168.29.201:11434/api/chat',
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model,
                                messages: [{ role: 'user', content: prompt }],
                                tools: llmTools,
                                stream: false, // Stream false for simple JSON parsing
                            }),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `LLM API Error (${response.status}): ${await response.text()}`
                        );
                    }

                    const data = await response.json();
                    const message = data.message;

                    if (message?.tool_calls && message.tool_calls.length > 0) {
                        const executionResults: string[] = [];

                        for (const call of message.tool_calls) {
                            const toolName = call.function.name;
                            const toolArgs = call.function.arguments;

                            // Execute the requested MCP tool on SQLite via mcpServer
                            const result = await mcpServer.server.request(
                                {
                                    method: 'tools/call',
                                    params: {
                                        name: toolName,
                                        arguments: toolArgs,
                                    },
                                },
                                CallToolResultSchema
                            );

                            executionResults.push(
                                `Executed '${toolName}': ${JSON.stringify(result.content)}`
                            );
                        }

                        return {
                            text: message.content
                                ? `${message.content}\n\n${executionResults.join('\n')}`
                                : executionResults.join('\n'),
                        };
                    }
                    return {
                        text:
                            message?.content ||
                            'Prompt processed without tool calls',
                    };
                } catch (error) {
                    console.error('Error processing prompt:', error);
                    throw error;
                }
                /*
                finally {
                    await mcpClient.close();
                }
                */
            },
        },
    },
});

async function createMainWindow(projectId: string | null) {
    const url = await getUrl('mainview');

    let projectTitle = 'Novelty';
    if (projectId) {
        const project = await projectsDB.getProjectById(db, projectId);
        if (project) {
            projectTitle = project.name;
        }
    }

    win = new BrowserWindow({
        title: projectTitle,
        url,
        frame: {
            width: 2000,
            height: 1200,
            x: 200,
            y: 200,
        },
        rpc: mainRPC,
        //rpc: { ...mainRPC, ...MCPrpc },
        //titleBarStyle: "hidden",
        styleMask: {
            FullScreen: false,
            Resizable: true,
        },
    });

    currentProjectId = projectId;
    console.log(`Main window loaded with project: ${projectTitle}`);
}
async function start() {
    await initDatabase(rawSqlite, dbPath);
    const settings = settingsDB.getAllSettings();
    const shouldOpenRecent = settings.projects.openRecentProjectOnStartup;
    const recentProjects = settings.projects.recentProjects;

    let projectId: string | null = null;
    if (shouldOpenRecent && recentProjects.length > 0) {
        projectId = recentProjects[0];

        const project = await projectsDB.getProjectById(db, projectId || '');
        if (project) {
            currentProjectId = projectId;
        }
    }

    await createMainWindow(projectId);
}

start();

console.log('Vanilla Vite app started!');
