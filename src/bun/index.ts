import {
    BrowserWindow,
    Updater,
    defineElectrobunRPC,
    Utils,
} from 'electrobun/main';
import type {
    SelectorSchema,
    NewProject,
    NewAsset,
    NewChatSession,
    NewChatMessage,
    NewAgent,
    NewAgentRun,
    NewChapter,
    CompendiumCategory,
} from '../mainview/types/index';
import { readFileSync, existsSync } from 'fs';
import { initDatabase } from './database';
import * as projectsDB from './database/projects';
import * as assetsDB from './database/assets';
import * as chatDB from './database/chat';
import * as agentsDB from './database/agents';
import * as chaptersDB from './database/chapters';
import * as scratchDB from './database/scratch';
import * as settingsDB from './settings';
import * as charactersDB from './database/characters';
import * as locationsDB from './database/locations';
import * as organizationsDB from './database/organizations';
import * as itemsDB from './database/items';
import * as loreDB from './database/lore';
import * as genresDB from './database/genres';
import * as tagsDB from './database/tags';
import * as themesDB from './database/themes';
import * as templatesDB from './database/templates';
import * as seriesDB from './database/series';
import * as globalTemplatesDB from './database/globalTemplates';
import * as seriesTemplatesDB from './database/seriesTemplates';
import * as timelineDB from './database/timeline';
import * as usageDB from './database/usage';
import * as actsDB from './database/acts';
import * as plotThreadsDB from './database/plotThreads';
import * as storyBeatsDB from './database/storyBeats';
import * as scenesDB from './database/scenes';
import * as inspirationsDB from './database/inspirations';
import {
    indexProject,
    getIndexStatus,
    rebuildProjectEmbeddings,
} from './services/embeddings/pipeline';
import { buildContext } from './services/contextEngine';
import { sqliteVecAvailable } from './database/index';

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
                return await projectsDB.getAllProjects();
            },
            'db:get-project': async (id: string) => {
                return await projectsDB.getProjectById(id);
            },
            'db:create-project': async (project: NewProject) => {
                return await projectsDB.createProject(project);
            },
            'db:update-project': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewProject>;
            }) => {
                return await projectsDB.updateProject(id, data);
            },
            'db:delete-project': async (id: string) => {
                return await projectsDB.deleteProject(id);
            },
            'project:get-current': async () => {
                if (!currentProjectId) return null;
                return await projectsDB.getProjectById(currentProjectId);
            },
            'project:set-current': async (projectId: string) => {
                const project = await projectsDB.getProjectById(projectId);
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
                return await assetsDB.getAssetsByProject(projectId);
            },
            'db:get-asset': async (id: string) => {
                return await assetsDB.getAssetById(id);
            },
            'db:create-asset': async (asset: NewAsset) => {
                return await assetsDB.createAsset(asset);
            },
            'db:update-asset': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewAsset>;
            }) => {
                return await assetsDB.updateAsset(id, data);
            },
            'db:delete-asset': async (id: string) => {
                return await assetsDB.deleteAsset(id);
            },
            'db:get-chapters': async (projectId: string) => {
                return (await chaptersDB.getChaptersByProject(
                    projectId
                )) as any;
            },
            'db:get-chapter': async (id: string) => {
                return (await chaptersDB.getChapterById(id)) as any;
            },
            'db:create-chapter': async (chapter: NewChapter) => {
                return (await chaptersDB.createChapter(chapter)) as any;
            },
            'db:update-chapter': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewChapter>;
            }) => {
                return (await chaptersDB.updateChapter(id, data)) as any;
            },
            'db:delete-chapter': async (id: string) => {
                return await chaptersDB.deleteChapter(id);
            },
            'db:get-chapter-by-id': async (id: string) => {
                return (await chaptersDB.getChapterById(id)) as any;
            },
            'db:get-scratch': async (projectId: string) => {
                const result = await scratchDB.getScratchNote(projectId);
                return result?.content || null;
            },
            'db:save-scratch': async ({
                projectId,
                content,
            }: {
                projectId: string;
                content: string;
            }) => {
                await scratchDB.saveScratchNote(projectId, content);
            },
            'db:get-sessions': async () => {
                return await chatDB.getAllSessions();
            },
            'db:get-session': async (id: string) => {
                return await chatDB.getSessionById(id);
            },
            'db:create-session': async (session: NewChatSession) => {
                return await chatDB.createSession(session);
            },
            'db:update-session': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewChatSession>;
            }) => {
                return await chatDB.updateSession(id, data);
            },
            'db:delete-session': async (id: string) => {
                return await chatDB.deleteSession(id);
            },
            'db:get-sessions-by-project': async (projectId: string) => {
                return await chatDB.getSessionsByProject(projectId);
            },
            'db:get-messages': async (sessionId: string) => {
                return await chatDB.getMessagesBySession(sessionId);
            },
            'db:create-message': async (message: NewChatMessage) => {
                return await chatDB.createMessage(message);
            },
            'db:get-agents': async () => {
                return await agentsDB.getAllAgents();
            },
            'db:get-agent': async (id: string) => {
                return await agentsDB.getAgentById(id);
            },
            'db:create-agent': async (agent: NewAgent) => {
                return await agentsDB.createAgent(agent);
            },
            'db:update-agent': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewAgent>;
            }) => {
                return await agentsDB.updateAgent(id, data);
            },
            'db:delete-agent': async (id: string) => {
                return await agentsDB.deleteAgent(id);
            },
            'db:get-runs': async (agentId: string) => {
                return await agentsDB.getRunsByAgent(agentId);
            },
            'db:create-run': async (run: NewAgentRun) => {
                return await agentsDB.createRun(run);
            },
            'db:update-run': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<NewAgentRun>;
            }) => {
                return await agentsDB.updateRun(id, data);
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
                const project = await projectsDB.getProjectById(projectId);
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
                await projectsDB.updateProject(projectId, {
                    systemPrompt: prompt,
                } as Partial<NewProject>);
            },
            'db:get-project-system-prompt': async (projectId: string) => {
                const project = await projectsDB.getProjectById(projectId);
                return project?.systemPrompt || null;
            },
            'db:get-characters': async (projectId: string) => {
                return await charactersDB.getCharactersByProject(projectId);
            },
            'db:get-character': async (id: string) => {
                return await charactersDB.getCharacterById(id);
            },
            'db:create-character': async (
                character: Parameters<typeof charactersDB.createCharacter>[0]
            ) => {
                return await charactersDB.createCharacter(character);
            },
            'db:update-character': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<
                    Parameters<typeof charactersDB.updateCharacter>[1]
                >;
            }) => {
                return await charactersDB.updateCharacter(id, data);
            },
            'db:delete-character': async (id: string) => {
                return await charactersDB.deleteCharacter(id);
            },
            'db:get-locations': async (projectId: string) => {
                return await locationsDB.getLocationsByProject(projectId);
            },
            'db:get-location': async (id: string) => {
                return await locationsDB.getLocationById(id);
            },
            'db:create-location': async (
                location: Parameters<typeof locationsDB.createLocation>[0]
            ) => {
                return await locationsDB.createLocation(location);
            },
            'db:update-location': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<Parameters<typeof locationsDB.updateLocation>[1]>;
            }) => {
                return await locationsDB.updateLocation(id, data);
            },
            'db:delete-location': async (id: string) => {
                return await locationsDB.deleteLocation(id);
            },
            'db:get-organizations': async (projectId: string) => {
                return await organizationsDB.getOrganizationsByProject(
                    projectId
                );
            },
            'db:get-organization': async (id: string) => {
                return await organizationsDB.getOrganizationById(id);
            },
            'db:create-organization': async (
                organization: Parameters<
                    typeof organizationsDB.createOrganization
                >[0]
            ) => {
                return await organizationsDB.createOrganization(organization);
            },
            'db:update-organization': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<
                    Parameters<typeof organizationsDB.updateOrganization>[1]
                >;
            }) => {
                return await organizationsDB.updateOrganization(id, data);
            },
            'db:delete-organization': async (id: string) => {
                return await organizationsDB.deleteOrganization(id);
            },
            'db:get-items': async (projectId: string) => {
                return await itemsDB.getItemsByProject(projectId);
            },
            'db:get-item': async (id: string) => {
                return await itemsDB.getItemById(id);
            },
            'db:create-item': async (
                item: Parameters<typeof itemsDB.createItem>[0]
            ) => {
                return await itemsDB.createItem(item);
            },
            'db:update-item': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<Parameters<typeof itemsDB.updateItem>[1]>;
            }) => {
                return await itemsDB.updateItem(id, data);
            },
            'db:delete-item': async (id: string) => {
                return await itemsDB.deleteItem(id);
            },
            'db:get-lore-entries': async (projectId: string) => {
                return await loreDB.getLoreEntriesByProject(projectId);
            },
            'db:get-lore-entry': async (id: string) => {
                return await loreDB.getLoreEntryById(id);
            },
            'db:create-lore-entry': async (
                entry: Parameters<typeof loreDB.createLoreEntry>[0]
            ) => {
                return await loreDB.createLoreEntry(entry);
            },
            'db:update-lore-entry': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<Parameters<typeof loreDB.updateLoreEntry>[1]>;
            }) => {
                return await loreDB.updateLoreEntry(id, data);
            },
            'db:delete-lore-entry': async (id: string) => {
                return await loreDB.deleteLoreEntry(id);
            },
            'db:get-genres': async () => {
                return await genresDB.getAllGenres();
            },
            'db:create-genre': async ({
                name,
                isGlobal,
            }: {
                name: string;
                isGlobal?: boolean;
            }) => {
                return await genresDB.createGenre(name, isGlobal);
            },
            'db:delete-genre': async (id: string) => {
                return await genresDB.deleteGenre(id);
            },
            'db:get-tags': async () => {
                return await tagsDB.getAllTags();
            },
            'db:create-tag': async ({
                name,
                isGlobal,
            }: {
                name: string;
                isGlobal?: boolean;
            }) => {
                return await tagsDB.createTag(name, isGlobal);
            },
            'db:delete-tag': async (id: string) => {
                return await tagsDB.deleteTag(id);
            },
            'db:get-themes': async () => {
                return await themesDB.getAllThemes();
            },
            'db:create-theme': async ({
                name,
                isGlobal,
            }: {
                name: string;
                isGlobal?: boolean;
            }) => {
                return await themesDB.createTheme(name, isGlobal);
            },
            'db:delete-theme': async (id: string) => {
                return await themesDB.deleteTheme(id);
            },
            'db:list-series': async () => {
                return await seriesDB.listSeries();
            },
            'db:get-series': async (id: string) => {
                return await seriesDB.getSeriesById(id);
            },
            'db:create-series': async (data: seriesDB.NewSeries) => {
                return await seriesDB.createSeries(data);
            },
            'db:update-series': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<seriesDB.NewSeries>;
            }) => {
                return await seriesDB.updateSeries(id, data);
            },
            'db:delete-series': async (id: string) => {
                return await seriesDB.deleteSeries(id);
            },
            'db:get-series-projects': async (seriesId: string) => {
                return await seriesDB.getSeriesProjects(seriesId);
            },
            'db:list-global-templates': async (
                params: void | { baseType?: CompendiumCategory }
            ) => {
                const opts = params || undefined;
                return await globalTemplatesDB.listGlobalTemplates(
                    (opts as any)?.baseType
                );
            },
            'db:get-global-template': async (id: string) => {
                return await globalTemplatesDB.getGlobalTemplateById(id);
            },
            'db:create-global-template': async (
                data: globalTemplatesDB.NewGlobalTemplate
            ) => {
                return await globalTemplatesDB.createGlobalTemplate(data);
            },
            'db:update-global-template': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<globalTemplatesDB.NewGlobalTemplate>;
            }) => {
                return await globalTemplatesDB.updateGlobalTemplate(id, data);
            },
            'db:delete-global-template': async (id: string) => {
                return await globalTemplatesDB.deleteGlobalTemplate(id);
            },
            'db:list-series-templates': async ({
                seriesId,
                baseType,
            }: {
                seriesId: string;
                baseType?: CompendiumCategory;
            }) => {
                return await seriesTemplatesDB.listSeriesTemplates(
                    seriesId,
                    baseType as any
                );
            },
            'db:get-series-template': async (id: string) => {
                return await seriesTemplatesDB.getSeriesTemplateById(id);
            },
            'db:create-series-template': async (
                data: seriesTemplatesDB.NewSeriesTemplate
            ) => {
                return await seriesTemplatesDB.createSeriesTemplate(data);
            },
            'db:update-series-template': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<seriesTemplatesDB.NewSeriesTemplate>;
            }) => {
                console.log('[bun data]', data);
                return await seriesTemplatesDB.updateSeriesTemplate(id, data);
            },
            'db:delete-series-template': async (id: string) => {
                return await seriesTemplatesDB.deleteSeriesTemplate(id);
            },
            'db:get-template': async ({
                projectId,
                baseType,
            }: {
                projectId: string;
                baseType: string;
            }) => {
                const result = await templatesDB.getTemplateByProjectAndType(
                    projectId,
                    baseType as
                        | 'character'
                        | 'location'
                        | 'organization'
                        | 'item'
                        | 'lore'
                );
                return result as any;
            },
            'db:get-resolved-template': async ({
                projectId,
                baseType,
            }: {
                projectId: string;
                baseType: string;
            }) => {
                const result = await templatesDB.resolveTemplate(
                    projectId,
                    baseType as
                        | 'character'
                        | 'location'
                        | 'organization'
                        | 'item'
                        | 'lore'
                );
                return result as any;
            },
            'db:save-template': async ({
                projectId,
                baseType,
                customFields,
                globalTemplateId,
                seriesTemplateId,
            }: {
                projectId: string;
                baseType: string;
                customFields: templatesDB.FieldDefinition[];
                globalTemplateId?: string | null;
                seriesTemplateId?: string | null;
            }) => {
                return await templatesDB.upsertTemplate(
                    projectId,
                    baseType as
                        | 'character'
                        | 'location'
                        | 'organization'
                        | 'item'
                        | 'lore',
                    customFields,
                    globalTemplateId,
                    seriesTemplateId
                );
            },
            'db:get-timeline-events': async (projectId: string) => {
                return await timelineDB.getEventsByProject(projectId);
            },
            'db:get-timeline-event': async (id: string) => {
                return await timelineDB.getEventById(id);
            },
            'db:create-timeline-event': async (
                event: timelineDB.NewTimelineEvent
            ) => {
                return await timelineDB.createEvent(event);
            },
            'db:update-timeline-event': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<timelineDB.NewTimelineEvent>;
            }) => {
                return await timelineDB.updateEvent(id, data);
            },
            'db:delete-timeline-event': async (id: string) => {
                return await timelineDB.deleteEvent(id);
            },
            'db:auto-generate-timeline-events': async (projectId: string) => {
                return await timelineDB.autoGenerateEvents(projectId);
            },
            'db:get-story-acts': async (projectId: string) => {
                return (await actsDB.getActsByProject(projectId)) as any;
            },
            'db:get-story-act': async (id: string) => {
                return (await actsDB.getActById(id)) as any;
            },
            'db:create-story-act': async (act: actsDB.NewStoryAct) => {
                return (await actsDB.createAct(act)) as any;
            },
            'db:update-story-act': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<actsDB.NewStoryAct>;
            }) => {
                return (await actsDB.updateAct(id, data)) as any;
            },
            'db:delete-story-act': async (id: string) => {
                await actsDB.deleteAct(id);
            },
            'db:get-story-sequences': async (projectId: string) => {
                return (await actsDB.getSequencesByProject(projectId)) as any;
            },
            'db:get-story-sequence': async (id: string) => {
                return (await actsDB.getSequenceById(id)) as any;
            },
            'db:create-story-sequence': async (
                seq: actsDB.NewStorySequence
            ) => {
                return (await actsDB.createSequence(seq)) as any;
            },
            'db:update-story-sequence': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<actsDB.NewStorySequence>;
            }) => {
                return (await actsDB.updateSequence(id, data)) as any;
            },
            'db:delete-story-sequence': async (id: string) => {
                await actsDB.deleteSequence(id);
            },
            'db:get-sequences-by-act': async (actId: string) => {
                return (await actsDB.getSequencesByAct(actId)) as any;
            },
            'db:get-sequences-by-chapter': async (chapterId: string) => {
                return (await actsDB.getSequencesByChapter(chapterId)) as any;
            },
            'db:reorder-acts': async (
                updates: { id: string; orderIndex: number }[]
            ) => {
                await actsDB.reorderActs(updates);
            },
            'db:reorder-sequences': async (
                updates: {
                    id: string;
                    orderIndex: number;
                    displayOrder?: number;
                }[]
            ) => {
                await actsDB.reorderSequences(updates);
            },
            'db:get-story-scenes': async (projectId: string) => {
                return (await scenesDB.getScenesByProject(projectId)) as any;
            },
            'db:get-story-scene': async (id: string) => {
                return (await scenesDB.getSceneById(id)) as any;
            },
            'db:get-scenes-by-sequence': async (sequenceId: string) => {
                return (await scenesDB.getScenesBySequence(sequenceId)) as any;
            },
            'db:get-scenes-by-chapter': async (chapterId: string) => {
                return (await scenesDB.getScenesByChapter(chapterId)) as any;
            },
            'db:create-story-scene': async (scene: scenesDB.NewStoryScene) => {
                return (await scenesDB.createScene(scene)) as any;
            },
            'db:update-story-scene': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<scenesDB.NewStoryScene>;
            }) => {
                return (await scenesDB.updateScene(id, data)) as any;
            },
            'db:delete-story-scene': async (id: string) => {
                await scenesDB.deleteScene(id);
            },
            'db:reorder-scenes': async (
                updates: {
                    id: string;
                    orderIndex: number;
                    displayOrder?: number;
                }[]
            ) => {
                await scenesDB.reorderScenes(updates);
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
                return (await scenesDB.moveScene(id, data)) as any;
            },
            'db:get-plot-threads': async (projectId: string) => {
                return (await plotThreadsDB.getThreadsByProject(
                    projectId
                )) as any;
            },
            'db:get-plot-thread': async (id: string) => {
                return (await plotThreadsDB.getThreadById(id)) as any;
            },
            'db:create-plot-thread': async (
                thread: plotThreadsDB.NewPlotThread
            ) => {
                return (await plotThreadsDB.createThread(thread)) as any;
            },
            'db:update-plot-thread': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<plotThreadsDB.NewPlotThread>;
            }) => {
                return (await plotThreadsDB.updateThread(id, data)) as any;
            },
            'db:delete-plot-thread': async (id: string) => {
                await plotThreadsDB.deleteThread(id);
            },
            'db:get-chapter-plot-threads': async (chapterId: string) => {
                return await plotThreadsDB.getChapterThreads(chapterId);
            },
            'db:set-chapter-plot-threads': async ({
                chapterId,
                threads,
            }: {
                chapterId: string;
                threads: { plotThreadId: string; intensity: number }[];
            }) => {
                await plotThreadsDB.setChapterThreads(chapterId, threads);
            },
            'db:get-story-beats': async (projectId: string) => {
                return (await storyBeatsDB.getBeatsByProject(projectId)) as any;
            },
            'db:get-story-beat': async (id: string) => {
                return (await storyBeatsDB.getBeatById(id)) as any;
            },
            'db:create-story-beat': async (beat: storyBeatsDB.NewStoryBeat) => {
                return (await storyBeatsDB.createBeat(beat)) as any;
            },
            'db:update-story-beat': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<storyBeatsDB.NewStoryBeat>;
            }) => {
                return (await storyBeatsDB.updateBeat(id, data)) as any;
            },
            'db:delete-story-beat': async (id: string) => {
                await storyBeatsDB.deleteBeat(id);
            },
            'usage:log': async (params: {
                sessionId: string | null;
                projectId: string | null;
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
                model: string | null;
            }) => {
                await usageDB.logUsage({
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
                return await usageDB.getUsageStats(period, projectId);
            },
            'db:get-inspirations': async (projectId: string) => {
                return await inspirationsDB.getInspirations(projectId);
            },
            'db:create-inspiration': async (
                data: Parameters<typeof inspirationsDB.createInspiration>[0]
            ) => {
                return await inspirationsDB.createInspiration(data);
            },
            'db:update-inspiration': async ({
                id,
                data,
            }: {
                id: string;
                data: Partial<
                    Parameters<typeof inspirationsDB.updateInspiration>[1]
                >;
            }) => {
                return await inspirationsDB.updateInspiration(id, data);
            },
            'db:delete-inspiration': async (id: string) => {
                await inspirationsDB.deleteInspiration(id);
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
        },
    },
});

async function createMainWindow(projectId: string | null) {
    const url = await getUrl('mainview');

    let projectTitle = 'Novelty';
    if (projectId) {
        const project = await projectsDB.getProjectById(projectId);
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
    await initDatabase();
    const settings = settingsDB.getAllSettings();
    const shouldOpenRecent = settings.projects.openRecentProjectOnStartup;
    const recentProjects = settings.projects.recentProjects;

    let projectId: string | null = null;
    if (shouldOpenRecent && recentProjects.length > 0) {
        projectId = recentProjects[0];

        const project = await projectsDB.getProjectById(projectId || '');
        if (project) {
            currentProjectId = projectId;
        }
    }

    await createMainWindow(projectId);
}

start();

console.log('Vanilla Vite app started!');
