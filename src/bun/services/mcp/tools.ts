import { z } from 'zod';
//import { characters } from '../../schema/index.js';
//import { eq } from 'drizzle-orm';
//import { db } from '../../database/index.js';
import { mcpServer } from './server.js';
import { db } from '../../electrobun/db';
import * as projectDB from '../../database/tables/projects.js';
import * as templatesDB from '../../database/tables/templates.js';
import * as characterDB from '../../database/tables/characters.js';
import * as locationDB from '../../database/tables/locations.js';
import * as organizationDB from '../../database/tables/organizations.js';
import * as itemDB from '../../database/tables/items.js';
import * as loreDB from '../../database/tables/lore.js';
import type { CompendiumCategory } from '../../../shared/types/project/compendium/index.js';

const compendiumCategoryEnum = z.enum([
    'character',
    'location',
    'organization',
    'item',
    'lore',
]);
// export type CompendiumCategory = z.infer<typeof compendiumCategoryEnum>;
export default function registerAllTools() {
    mcpServer.registerTool(
        'get_project_details',
        {
            title: 'Get Project Details',
            description:
                'Retrieve comprehensive details, configuration, and metadata for a specific project.',
            inputSchema: z.object({
                projectId: z.string().describe('The ID of the project'),
            }),
        },
        async ({ projectId }) => {
            console.log(
                `[CRUD: Read] Fetching details for Project: ${projectId}`
            );
            const project = await projectDB.getProjectById(db, projectId);
            console.log('[CRUD: Project]', project);

            // Example DB query logic:
            /*
            const [project] = await db.select().from(projects).where(
                eq(projects.id, projectId)
            );
            */

            /* Mock return for demonstration
            return {
                content: [
                    {
                        type: 'text',
                        text: `Retrieved details for project ${projectId}.`,
                    },
                ],
            };
            */
            if (!project) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Project with ID ${projectId} was not found.`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(project, null, 2),
                    },
                ],
            };
        }
    );

    mcpServer.registerTool(
        'get_template',
        {
            title: 'Retrieve a Template',
            description:
                'Retrieves a template for a specific compendium category within a project.',
            inputSchema: z.object({
                projectId: z.string().describe('The ID of the project'),
                baseType: compendiumCategoryEnum.describe(
                    'The category/base type of the entity'
                ),
            }),
        },
        async ({ projectId, baseType }) => {
            console.log(
                `[Calling get_template] for Project: ${projectId}, Type: ${baseType}`
            );
            const template = await getTemplateByType(projectId, baseType);
            console.log(`[CRUD: Read] Template:`, template);

            /*
            return {
                content: [
                    {
                        type: 'text',
                        text: `Retrieved template for compendium category ${baseType} for project ${projectId}.`,
                    },
                ],
            };
            */
            if (!template) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Template for compendium category ${baseType} for project ${projectId} was not found.`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(template, null, 2),
                    },
                ],
            };
        }
    );

    mcpServer.registerTool(
        'create_entity',
        {
            title: 'Create Entity',
            description:
                'Create a new dynamic entity (character, location, organization, item, lore) inside a project using its custom template fields.',
            inputSchema: z.object({
                projectId: z.string().describe('The ID of the project'),
                baseType: compendiumCategoryEnum.describe(
                    'The category/base type of the entity'
                ),
                name: z.string().describe('The primary name of the entity'),
                // A flexible record where the LLM can populate whatever custom fields
                // are defined in your entity_templates table for this baseType
                attributes: z
                    .record(z.any())
                    .describe(
                        'Key-value pairs matching the template fields (e.g. { age: 25, role: "Hero" })'
                    ),
            }),
        },
        async ({ projectId, baseType, name, attributes }) => {
            console.log(
                `[calling create_entity] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
            );
            console.log(
                `[CRUD: Create] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
            );

            // Optional: Fetch the entity template from database to validate or inspect custom_fields
            /*
            const template = await db.query.entityTemplates.findFirst({
                where: (t, { and, eq }) => and(eq(t.projectId, projectId), eq(t.baseType, baseType))
            });

            // template?.custom_fields contains your FieldDefinition[] array[cite: 1, 2]!
            */

            // TODO: Insert into your database entity table, saving `attributes` into your JSON data column
            // Example DB insertion logic:
            /*
            const newEntity = await db.insert(entities).values({
                projectId,
                baseType,
                name,
                attributes: JSON.stringify(attributes),
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }).returning();
            */

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully created ${baseType} "${name}" with ${Object.keys(attributes).length} custom attributes.`,
                    },
                ],
            };
        }
    );

    mcpServer.registerTool(
        'get_entity',
        {
            title: 'Get Entity',
            description:
                'Retrieve details for a specific entity by its ID and baseType within a project.',
            inputSchema: z.object({
                projectId: z.string().describe('The ID of the project'),
                baseType: compendiumCategoryEnum
                    .optional()
                    .describe('Optional category filter'),
                entityId: z
                    .string()
                    .describe('The ID of the entity to retrieve'),
            }),
        },
        async ({ projectId, baseType, entityId }) => {
            console.log(
                `[CRUD: Read] Fetching entity: ${entityId} for Project: ${projectId}, type: ${baseType}`
            );

            const entity = await getEntityByType(entityId, baseType);
            //console.log(`[CRUD: Read] Entity: ${JSON.stringify(entity)}`);
            console.log(`[CRUD: Read] Entity:`, entity);

            // Example DB query logic:
            /*
        const [entity] = await db.select().from(entities).where(
            and(eq(entities.projectId, projectId), eq(entities.id, entityId))
        );
        */

            if (!entity) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Entity with ID ${entityId} was not found.`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(entity),
                    },
                ],
            };

            /* Mock return for demonstration
            return {
                content: [
                    {
                        type: 'text',
                        text: `Retrieved details for entity ${entityId} in project ${projectId}.`,
                    },
                ],
            };
            */
        }
    );

    mcpServer.registerTool(
        'list_entities',
        {
            title: 'List Entities',
            description:
                'List or search entities in a project, optionally filtered by category type.',
            inputSchema: z.object({
                projectId: z.string().describe('The ID of the project'),
                baseType: compendiumCategoryEnum
                    .optional()
                    .describe('Optional category filter'),
            }),
        },
        async ({ projectId, baseType }) => {
            console.log(
                `[CRUD: Read] Fetching entities for Project: ${projectId}, Type: ${baseType || 'all'}`
            );
            const entities = await getAllEntities(projectId, baseType);
            console.log(`[CRUD: Read] Entities:`, entities);

            // Example DB query logic:
            /*
            const results = await db.select().from(entities).where(
                baseType
                    ? and(eq(entities.projectId, projectId), eq(entities.baseType, baseType))
                    : eq(entities.projectId, projectId)
            );


            Mock return for demonstration
            return {
                content: [
                    {
                        type: 'text',
                        text: `Fetched entities for project ${projectId}.`,
                    },
                ],
            };
            */

            if (!entities) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: No ${baseType} entities found in project ${projectId}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(entities),
                    },
                ],
            };
        }
    );

    mcpServer.registerTool(
        'update_entity',
        {
            title: 'Update Entity',
            description:
                "Update an existing entity's name or custom field attributes.",
            inputSchema: z.object({
                entityId: z
                    .string()
                    .describe('The unique ID of the entity to update'),
                name: z.string().optional().describe('New name if changing'),
                attributes: z
                    .record(z.any())
                    .optional()
                    .describe(
                        'Updated or partial custom field key-value pairs'
                    ),
            }),
        },
        async ({ entityId, name, attributes }) => {
            console.log(`[CRUD: Update] Entity ID: ${entityId}`);

            // Example DB update logic:
            /*
            await db.update(entities)
                .set({
                    ...(name && { name }),
                    ...(attributes && { attributes: JSON.stringify(attributes) }),
                    updatedAt: Date.now()
                })
                .where(eq(entities.id, entityId));
            */

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully updated entity ${entityId}.`,
                    },
                ],
            };
        }
    );

    mcpServer.registerTool(
        'delete_entity',
        {
            title: 'Delete Entity',
            description:
                'Delete an entity from the compendium database by its ID.',
            inputSchema: z.object({
                entityId: z
                    .string()
                    .describe('The unique ID of the entity to delete'),
            }),
        },
        async ({ entityId }) => {
            console.log(`[CRUD: Delete] Entity ID: ${entityId}`);

            // Example DB delete logic:
            /*
            await db.delete(entities).where(eq(entities.id, entityId));
            */

            return {
                content: [
                    {
                        type: 'text',
                        text: `Successfully deleted entity ${entityId}.`,
                    },
                ],
            };
        }
    );

    console.log('🛠️ All MCP tools registered successfully.');
}

async function getEntityByType(
    entityId: string,
    baseType?: CompendiumCategory
) {
    // If baseType is provided, route query to specific category tables/handlers
    switch (baseType) {
        case 'character':
            return await characterDB.getCharacterById(db, entityId);
        case 'location':
            return await locationDB.getLocationById(db, entityId);
        case 'organization':
            return await organizationDB.getOrganizationById(db, entityId);
        case 'item':
            return await itemDB.getItemById(db, entityId);
        case 'lore':
            return await loreDB.getLoreEntryById(db, entityId);
        default:
            // Fallback if baseType is omitted: query unified entities table or search across categories
            //return await entityDB.getById(projectId, entityId);
            return null;
    }
}

async function getAllEntities(
    projectId: string,
    baseType?: CompendiumCategory
) {
    // If baseType is provided, route query to specific category tables/handlers
    switch (baseType) {
        case 'character':
            return await characterDB.getCharactersByProject(db, projectId);
        case 'location':
            return await locationDB.getLocationsByProject(db, projectId);
        case 'organization':
            return await organizationDB.getOrganizationsByProject(
                db,
                projectId
            );
        case 'item':
            return await itemDB.getItemsByProject(db, projectId);
        case 'lore':
            return await loreDB.getLoreEntriesByProject(db, projectId);
        default:
            // Fallback if baseType is omitted: query unified entities table or search across categories
            //return await entityDB.getById(projectId, entityId);
            return null;
    }
}

async function getTemplateByType(
    projectId: string,
    baseType?: CompendiumCategory
) {
    // If baseType is provided, route query to specific category tables/handlers
    switch (baseType) {
        case 'character':
            return await templatesDB.getTemplateByProjectAndType(
                db,
                projectId,
                'character'
            );
        case 'location':
            return await templatesDB.getTemplateByProjectAndType(
                db,
                projectId,
                'location'
            );
        case 'organization':
            return await templatesDB.getTemplateByProjectAndType(
                db,
                projectId,
                'organization'
            );
        case 'item':
            return await templatesDB.getTemplateByProjectAndType(
                db,
                projectId,
                'item'
            );
        case 'lore':
            return await templatesDB.getTemplateByProjectAndType(
                db,
                projectId,
                'lore'
            );
        default:
            // Fallback if baseType is omitted: query unified entities table or search across categories
            //return await entityDB.getById(projectId, entityId);
            return null;
    }
}
