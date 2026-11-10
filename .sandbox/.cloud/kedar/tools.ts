import { z } from 'zod';
//import * as schema from '../../schema/index.js';
//import { Database } from 'bun:sqlite';
//import { db } from '../../database/index.js';
import { mcpServer } from './../../../src/bun/services/mcp/server.js';
//import { drizzle } from 'drizzle-orm/bun-sqlite';
//import { eq } from 'drizzle-orm';
import * as charactersDB from '../../../src/bun/database/tables/characters.js';
import * as storybeatDB from '../../../src/bun/database/tables/storyBeats.js'
import type { PlotThreadType, StoryBeatType } from '@/shared/types/project/manuscript/index.js';
import { db } from './McpIndex.js';
import * as plotthreadDB from '../../../src/bun/database/tables/plotThreads.js'

const compendiumCategoryEnum = z.enum([
    'character',
    'location',
    'organization',
    'item',
    'lore',
]);

mcpServer.registerTool(
    'create_entry',
    {
        title: 'Create Entry',
        description: 'Add a new entry to the story compendium database.',
        inputSchema: z.object({
            projectId: z.string().describe('The ID of the project'),

            category: compendiumCategoryEnum.describe(
                'The compendium category'
            ),
            data: z.string().describe('The entry data/content (JSON or text)'),
        }),
    },
    async ({ projectId, category, data }) => {
        console.log(
            `[calling create_entry] Project: ${projectId}, Category: ${category}, Data ${data}`
        );

        // TODO: Insert into your database based on category
        // e.g., db.insert(compendiumEntries).values({ projectId, category, data })

        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully created ${category} entry for project ${projectId}`,
                },
            ],
        };
    }
);

// Tool 1: create_character
// Matches response JSON structure: { category, name, id?, fields: { role, bio, status, ... } }
// Uses upsert so if `id` is provided and already exists it updates instead of creating a duplicate.

mcpServer.registerTool(
    'create_character',
    {
        title: 'Create Character',
        description: 'Add a new character to the novelty manuscript database.',
        inputSchema: z.object({
            id: z.string().describe('Character Id'),
            projectId: z.string().optional().describe('Project Id'),
            name: z.string().describe('Character name'),
            filePath: z.string().optional().describe('File Path'),
            templateData: z
                .record(z.string(), z.unknown())
                .optional()
                .describe('Character template Data'),
        }),
    },
    async ({ id, projectId, name, filePath, templateData }) => {
        /*
        const result = await db
            .insert(schema.characters)
            .values({ id, projectId, name, filePath, templateData })
            .returning();
        */
        const newChar = {
            name: name,
            id: id,
            projectId: projectId ?? null,
            filePath: filePath ?? null,
            templateData: templateData ?? null,
        };

        const result = await charactersDB.createCharacter({ ...newChar });
        console.log('character fetched');
        console.log('character created');
        return {
            content: [
                {
                    type: 'text',
                    text: `Character created with ID: ${result}`,
                },
            ],
        };
    }
);
console.log('1');

// Tool 2: update_character
// Reads existing templateData, merges new status in, and writes back

mcpServer.registerTool(
    'update_character',
    {
        title: 'update character',
        description:
            'update character name using id in novelty manuscript database',
        inputSchema: z.object({
            id: z.string().describe('Character Id'),
            projectId: z.string().optional().describe('Project Id'),
            name: z.string().describe('Character name'),
            filePath: z.string().optional().describe('File Path'),
            templateData: z
                .record(z.string(), z.unknown())
                .optional()
                .describe('Character template Data'),
        }),
    },

    async ({ id, projectId, name, filePath, templateData }) => {
        /*
        const result = await db
            .update(schema.characters)
            .set({ name })
            .where(eq(schema.characters.id, id))
            .returning()
*/
        const newChar = {
            name: name,
            id: id,
            projectId: projectId ?? null,
            filePath: filePath ?? null,
            templateData: templateData ?? null,
        };
        const result = await charactersDB.updateCharacter(id, { ...newChar });
        console.log('character updated');

        return {
            content: [
                {
                    type: 'text',
                    text: `Character updated with id ${result}`,
                },
            ],
        };
    }
);

// Tool 3: get_character
// Extracts the character data

mcpServer.registerTool(
    'get_character',
    {
        title: 'character data',
        description: 'get character full details',
        inputSchema: z.object({
            id: z.string().describe('character id'),
        }),
    },
    async ({ id }) => {
        /*
        const result = await db
            .select()
            .from(schema.characters)
            .where(eq(schema.characters.id, id))
*/
        const result = await charactersDB.getCharacterById(id);
        console.log('character fetched');

        return {
            content: [
                {
                    type: 'text',
                    text: `character data fetched with ${result?.name}`,
                },
            ],
        };
    }
);

mcpServer.registerTool(
    'list_characters',
    {
        title: 'character data',
        description: 'get a list of characters',
        inputSchema: z.object({
            projectId: z.string().describe('character id'),
        }),
    },
    async ({ projectId }) => {
        /*
        const result = await db
            .select()
            .from(schema.characters)
            .where(eq(schema.characters.id, id))
*/
        const result = await charactersDB.getCharactersByProject(projectId);
        console.log('character fetched');

        return {
            content: [
                {
                    type: 'text',
                    text: `character data fetched with ${result?.length}`,
                },
            ],
        };
    }
);

// Tool 4: delete_character
// Delete the character data using character ID

mcpServer.registerTool(
    'delete_character',
    {
        title: 'delete character',
        description: 'delete the character data with the given id',
        inputSchema: z.object({
            id: z.string().describe('character id'),
        }),
    },
    async ({ id }) => {
        /*
        const result = await db
            .delete(schema.characters)
            .where(eq(schema.characters.id, id))
*/
        const result = await charactersDB.deleteCharacter(id);
        console.log('character deleted');

        return {
            content: [
                {
                    type: 'text',
                    text: `character deleted from character table with character id ${result}`,
                },
            ],
        };
    }
);

mcpServer.registerTool(
    'create_story_beat',
    {
        title: 'Create Story Beat',
        description: 'Create new story beat based on project ID,beat type, title and description',
        inputSchema: z.object({
            title: z.string().describe('The title of the story beat'),
            beatType: z.string().optional().describe('The beat type of the story beat'),
            description: z.string().optional().describe('The description of the story beat'),
        }),
    },
    async ({ title, beatType, description }) => {
        console.log(`[calling create_story_beat] Name: ${title}`);

        const newStoryBeat = {
            id: '1',
            projectId: '12',
            chapterId: '123',
            orderIndex: 1,
            title: title,
            beatType: beatType ?? 'custom' as StoryBeatType,
            description: description ?? null,
        };

        const result = await storybeatDB.createBeat(db, newStoryBeat)

        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully created with ${result} storybeat`,
                },
            ],
        }
    }
);

mcpServer.registerTool(
    'get_story_beat',
    {
        title: 'Retrieve story_beat',
        description: 'Retrieves story_beat for a specific manuscript chapter and compendium category within a project',
        inputSchema: z.object({
            projectId: z.string().describe('The ID of the project'),
        }),
    },
    async ({ projectId }) => {
        console.log(`[Calling get_story_beat] for Project: ${projectId}`);
        const storyBeat = await storybeatDB.getBeatsByProject(db, projectId);
        console.log('[Get Story Beat:', storyBeat);

        if (!storyBeat) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: project with ID ${projectId} was not found`,
                    },
                ],
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(storyBeat),
                }
            ]
        }
    }
)

mcpServer.registerTool(
    'update_story_beat',
    {
        title: 'Update Story beat',
        description: "Update an existing story beat's title",
        inputSchema: z.object({
            id: z.string().describe('The unique ID of the story beat to update'),
            name: z.string().describe('New title if updating'),
        }),
    },

    async ({ id, name }) => {

        const newStoryBeat = {
            id: '1',
            projectId: '12',
            chapterId: '123',
            orderIndex: 1,
            title: name,
            beatType: 'custom' as StoryBeatType,
            description: null,
        };
        console.log(`[story beat update with] ${id} and ${name}`);
        const UpdateBeat = await storybeatDB.updateBeat(db, id, newStoryBeat)

        if (!UpdateBeat) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ID ${id} was not found`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully updated entity ${id}`,
                },
            ],
        };
    }
);

mcpServer.registerTool(
    'delete_story_beat',
    {
        title: 'Delete Story beat',
        description: 'Delete story beat from the story_beats table in novelty db',
        inputSchema: z.object({
            id: z.string().describe('The unique ID of the story beat to delete'),
        }),
    },

    async ({ id }) => {

        const deleteBeat = await storybeatDB.deleteBeat(db, id)

        if (!deleteBeat) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ID ${id} was not found`,
                    },
                ],
            };
        }

        console.log(`storybeat id delete with: ${id}`);

        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully deleted story beat ${id}`,
                },
            ],
        };
    }
);

mcpServer.registerTool(
    'create_plot_thread',
    {
        title: 'Create Plot Thread',
        description: 'Create new plot thread based on project ID,thread type, title and description',
        inputSchema: z.object({
            name: z.string().describe('The title of the plot thread'),
            threadType: z.string().optional().describe('The thread type of the plot thread'),
            description: z.string().optional().describe('The description of the plot thread'),
        }),
    },
    async ({ name, threadType, description }) => {
        console.log(`[calling create_plot_thread] Name: ${name}`);

        const newPlotThread = {
            id: '1',
            projectId: '12',
            color: 'blue',
            name: name,
            threadType: threadType ?? 'subplot' as PlotThreadType,
            description: description ?? null,
        };

        const result = await plotthreadDB.createThread(db, newPlotThread)

        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully created with ${result} plot thread`,
                },
            ],
        }
    }
);

mcpServer.registerTool(
    'get_plot_thread_by_id',
    {
        title: 'Retreive Plot Thread',
        description: 'Retreive plot thread based on ID',
        inputSchema: z.object({
            id: z.string().describe('The id of the plot thread'),
        }),
    },
    async ({ id }) => {

        const result = await plotthreadDB.getThreadById(db, id);

        if (!result) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `ERROR: ID ${id} was not found`
                    }
                ]
            }
        }

        console.log(`[calling get_story_beat] ID: ${id}`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result),
                },
            ],
        }
    }
);

mcpServer.registerTool(
    'get_plot_thread_by_proj_id',
    {
        title: 'Retreive Plot Thread',
        description: 'Retreive plot thread based on Project ID',
        inputSchema: z.object({
            projectId: z.string().describe('The id of the project'),
        }),
    },
    async ({ projectId }) => {

        const result = await plotthreadDB.getThreadsByProject(db, projectId);

        if (!result) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `ERROR: Project ID ${projectId} was not found`
                    }
                ]
            }
        }

        console.log(`[calling get_story_beat] ID: ${projectId}`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result),
                },
            ],
        }
    }
);

mcpServer.registerTool(
    'update_plot_thread',
    {
        title: 'Update Plot Thread',
        description: 'Update existing plot thread based on ID',
        inputSchema: z.object({
            name: z.string().describe('The title of the plot thread'),
            description: z.string().optional().describe('The description of the plot thread'),
            id: z.string().describe('The id of the plot thread')
        }),
    },
    async ({ name, description, id }) => {

        const newPlotThread = {
            id: id,
            projectId: '12',
            color: 'blue',
            name: name,
            threadType: 'subplot' as PlotThreadType,
            description: description ?? null,
        };

        const result = await plotthreadDB.updateThread(db, id, newPlotThread)

        if (!result) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `ERROR: ID ${id} was not found`
                    }
                ]
            }
        }
        console.log(`[calling update_plot_thread] id: ${id}`);
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully updated ${result} plot thread`,
                },
            ],
        }
    }
);

mcpServer.registerTool(
    'delete_plot_thread',
    {
        title: 'Delete Plot Thread',
        description: 'Delete plot thread based on ID',
        inputSchema: z.object({
            id: z.string().describe('The id of the plot thread')
        }),
    },
    async ({ id }) => {

        const result = await plotthreadDB.deleteThread(db, id)

        if (!result) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `ERROR: ID ${id} was not found`
                    }
                ]
            }
        }
        console.log(`[calling delete_plot_thread] id: ${id}`);
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully deleted ${result} plot thread`,
                },
            ],
        }
    }
);

/*

mcpServer.registerTool(
    'update_character_status',
    {
        title: 'Update Character Status',
        description:
            "Update a character's current status (e.g. Alive, Injured, Deceased) by merging it into their template data.",
        inputSchema: z.object({
            id: z.string().describe('Character ID (string)'),
            newStatus: z.string().describe('New status value'),
        }),
    },
    async ({ id, newStatus }) => {
        const existing = await db
            .select()
            .from(characters)
            .where(eq(characters.id, id));

        if (!existing[0]) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Character with ID "${id}" not found.`,
                    },
                ],
            };
        }

        const existingFields: Record<string, unknown> = existing[0].templateData
            ? JSON.parse(existing[0].templateData as string)
            : {};

        await db
            .update(characters)
            .set({
                templateData: JSON.stringify({
                    ...existingFields,
                    status: newStatus,
                }),
                updatedAt: new Date(),
            })
            .where(eq(characters.id, id));

        return {
            content: [
                {
                    type: 'text',
                    text: `Character "${id}" status updated to: ${newStatus}`,
                },
            ],
        };
    }
);

// Tool 3: update_character
// Updates name and/or merges provided fields into existing templateData
mcpServer.registerTool(
    'update_character',
    {
        title: 'Update Character',
        description:
            'Update an existing character name and/or template fields (role, bio, status, etc.) in the manuscript database.',
        inputSchema: z.object({
            id: z.string().describe('Character ID (string)'),
            name: z.string().optional().describe('New character name'),
            fields: z
                .record(z.unknown())
                .optional()
                .describe(
                    'Fields to merge into template data (role, bio, status, etc.)'
                ),
        }),
    },
    async ({ id, name, fields }) => {
        const existing = await db
            .select()
            .from(characters)
            .where(eq(characters.id, id));

        if (!existing[0]) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Character with ID "${id}" not found.`,
                    },
                ],
            };
        }

        const updateData: Record<string, unknown> = { updatedAt: new Date() };

        if (name !== undefined) updateData.name = name;

        if (fields !== undefined) {
            const existingFields: Record<string, unknown> = existing[0]
                .templateData
                ? JSON.parse(existing[0].templateData as string)
                : {};
            updateData.templateData = JSON.stringify({
                ...existingFields,
                ...fields,
            });
        }

        await db
            .update(characters)
            .set(updateData)
            .where(eq(characters.id, id));

        return {
            content: [
                {
                    type: 'text',
                    text: `Character "${id}" updated successfully.`,
                },
            ],
        };
    }
);

mcpServer.server.request(
    { method: 'tools/list', params: {} },
    ListToolsResultSchema
);
*/
