import { z } from 'zod';
//import { characters } from '../../schema/index.js';
//import { eq } from 'drizzle-orm';
//import { db } from '../../database/index.js';
import { mcpServer } from './server.js';

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

/*
// Tool 1: create_character
// Matches response JSON structure: { category, name, id?, fields: { role, bio, status, ... } }
// Uses upsert so if `id` is provided and already exists it updates instead of creating a duplicate.
mcpServer.registerTool(
    'create_character',
    {
        title: 'Create or Update Character',
        description:
            'Add a new character or update an existing one in the manuscript database. If `id` is provided and the character already exists it will be updated instead of creating a duplicate.',
        inputSchema: z.object({
            id: z
                .string()
                .optional()
                .describe(
                    'Existing character ID to update (omit to auto-generate)'
                ),
            name: z.string().describe('Character name'),
            projectId: z
                .string()
                .optional()
                .describe('Project ID this character belongs to'),
            fields: z
                .record(z.unknown())
                .optional()
                .describe(
                    'Character fields (role, bio, status, etc.) stored as template data'
                ),
        }),
    },
    async ({ id, name, projectId, fields }) => {
        const now = new Date();
        const characterId = id ?? crypto.randomUUID();
        const templateDataJson = fields ? JSON.stringify(fields) : null;

        // Upsert: insert if new, update name/templateData if id already exists
        await db
            .insert(characters)
            .values({
                id: characterId,
                name,
                projectId: projectId ?? null,
                templateData: templateDataJson,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: characters.id,
                set: {
                    name,
                    projectId: projectId ?? null,
                    templateData: templateDataJson,
                    updatedAt: now,
                },
            });

        console.log('Server create_character', characterId);
        return {
            content: [
                {
                    type: 'text',
                    text: `Character "${name}" saved with ID: ${characterId}`,
                },
            ],
        };
    }
);

// Tool 2: update_character_status
// Reads existing templateData, merges new status in, and writes back
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
