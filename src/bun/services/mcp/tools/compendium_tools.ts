import { db } from "@/bun/electrobun/db";
import { mcpServer } from "@/bun/services/mcp/server";
import * as characterDB from '../../../database/tables/characters.js';
import * as itemsDB from '../../../database/tables/items.js';
import * as locationDB from '../../../database/tables/locations.js';
import * as loreDB from '../../../database/tables/lore.js';
import * as organizationDB from '../../../database/tables/organizations.js';
import type { Item, Location } from "@/shared/types";
import type { Character, Organization, LoreEntry, CompendiumCategory } from "@/shared/types/project/compendium";
import z from "zod";


const compendiumCategoryEnum = z.enum([
  'character',
  'location',
  'organization',
  'item',
  'lore',
]);

mcpServer.registerTool(
  'create_compendium_entity',
  {
    title: 'Create Compendium',
    description:
      "Creates a new Compendium entity—such as a character, location, organization, item, or lore entry—within a specific project. Use this tool whenever the user wants to add, generate, or save a new world-building element to their project's Compendium. Requires a valid name,baseType,projectId.",
    inputSchema: z.object({
      name: z.string().describe('The primary name of the Compendium'),
      projectId: z.string().describe('The ID of the project'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the Compendium'
      ),
    }),
  },
  async ({ projectId, name, baseType }) => {
    const newEntityTemplate = {
      id: crypto.randomUUID(),
      projectId: projectId,
      name: name,
      filePath: null,
      templateData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    console.log(
      `[calling createCompendium] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
    );

    const result = await createCompendium(
      newEntityTemplate,
      baseType
    );
    console.log(
      `[CRUD: Create] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
    );
    console.log('Compendium created ', result);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created ${JSON.stringify(result, null, 2)}".`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'update_compendium_entity',
  {
    title: 'Update Compendium',
    description:
      "Updates an existing Compendium entity (character, location, organization, item, or lore) within a project. Requires the name,projectId or take current projectId if not provided, entity base type, and id. Use when modifying existing world-building entries. If the entity ID is unknown, use the list compendium tool first to retrieve it.",
    inputSchema: z.object({
      name: z.string().describe('The primary name of the Compendium entity'),
      projectId: z.string().describe('The ID of the project'),
      id: z
        .string()
        .describe('The unique ID of the Compendium to update entity'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the Compendium entity'
      ),
    }),
  },
  async ({ id, projectId, name, baseType }) => {
    const newEntityTemplate = {
      id: id,
      projectId: projectId,
      name: name,
      filePath: null,
      templateData: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    console.log(
      `[calling updateCompendium] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
    );

    const result = await updateCompendium(
      id,
      newEntityTemplate,
      baseType
    );

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: project with ID ${projectId} was not found`,
          },
        ],
      };
    }

    console.log('Compendium updated ', result);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated ${JSON.stringify(result, null, 2)}.`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'get_compendium_entity',
  {
    title: 'Retrive Compendium',
    description:
      "Retrieves the full details of a specific Compendium entity (character, location, organization, item, or lore) within a project. Requires projectId or take current projectId if not provided, baseType, and either the id or name. Use this when inspecting a single world-building entry.If the entity ID is unknown, use the list compendium entities tool first to retrieve it.",
    inputSchema: z.object({
      name: z
        .string()
        .optional()
        .describe('The primary name of the Compendium entity'),
      id: z
        .string()
        .describe('The unique ID of the Compendium entity'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the Compendium entity'
      ),
    }),
  },
  async ({ id, baseType }) => {

    const result = await getCompendiumById(id, baseType);

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ID ${id} was not found`,
          },
        ],
      };
    }
    console.log('Compendium Retreived ', result);

    for (const r in result.templateData) {
      const value = result.templateData[r];

      if (typeof value === "string" && value.startsWith("data:image/png;base64")) {
        // Replace the value for that specific key
        result.templateData[r] = "image";
        console.log(r)
      }
      if (Array.isArray(value) && value.some(item => typeof item === "string" && item.startsWith("data:image/png;base64"))) {
        result.templateData[r] = "image";
        console.log(r)
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Successfully listed ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'list_compendium_entities',
  {
    title: 'Retrive Compendium',
    description:
      "Retrieves full details of all Compendium entities of a specific base type (character, location, organization, item, or lore) within a project. Requires baseType and either an explicit projectId or the active/current projectId. Use this to browse existing entries or to find an entity's id before updating or retrieving its individual details.",
    inputSchema: z.object({
      projectId: z.string().describe('The ID of the project'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the Compendium entity'
      ),
    }),
  },
  async ({ projectId, baseType }) => {
    console.log(
      `[calling getCompendium] Project: ${projectId}, Type: ${baseType}`
    );

    const result = await getCompendiumByProjectId(
      projectId,
      baseType
    );
    console.log('Compendium Retreived ', result);

    if (!result) {
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
          text: `Successfully Retreived ${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'delete_compendium_entity',
  {
    title: 'Delete Compendium',
    description:
      "Permanently deletes a specific Compendium entity (character, location, organization, item, or lore) from a project. Requires projectId, baseType, and either the id or name. Use only when explicitly removing an existing world-building entry—if the ID or exact name is unknown, list the project's entities first to confirm the target before deleting.",
    inputSchema: z.object({
      name: z
        .string()
        .optional()
        .describe('The primary name of the Compendium entity'),
      projectId: z.string().describe('The ID of the project'),
      id: z
        .string()
        .describe('The unique ID of the Compendium entity to delete'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the Compendium entity'
      ),
    }),
  },
  async ({ id, projectId, name, baseType }) => {
    try {
      console.log(
        `[calling deleteCompendium] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
      );

      await deleteCompendium(id, baseType);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully Deleted ${baseType}'s "${id}, name ${name}".`,
          },
        ],
      };
    } catch (err) {
      console.log('[tools.ts]', err);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ID ${id} was not found for baseType ${baseType}`,
          },
        ],
      };
    }
  }
);

async function createCompendium(
  entityData: Character | Location | Organization | Item | LoreEntry,
  baseType?: CompendiumCategory
) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await characterDB.createCharacter(
        db,
        entityData as Character
      );
    case 'location':
      return await locationDB.createLocation(db, entityData as Location);
    case 'organization':
      return await organizationDB.createOrganization(
        db,
        entityData as Organization
      );
    case 'item':
      return await itemsDB.createItem(db, entityData as Item);
    case 'lore':
      return await loreDB.createLoreEntry(db, entityData as LoreEntry);
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}
async function updateCompendium(
  id: string,
  entityData: Character | Location | Organization | Item | LoreEntry,
  baseType?: CompendiumCategory
) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await characterDB.updateCharacter(
        db,
        id,
        entityData as Character
      );
    case 'location':
      return await locationDB.updateLocation(
        db,
        id,
        entityData as Location
      );
    case 'organization':
      return await organizationDB.updateOrganization(
        db,
        id,
        entityData as Organization
      );
    case 'item':
      return await itemsDB.updateItem(db, id, entityData as Item);
    case 'lore':
      return await loreDB.updateLoreEntry(
        db,
        id,
        entityData as LoreEntry
      );
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}

async function getCompendiumById(id: string, baseType?: CompendiumCategory) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await characterDB.getCharacterById(db, id);
    case 'location':
      return await locationDB.getLocationById(db, id);
    case 'organization':
      return await organizationDB.getOrganizationById(db, id);
    case 'item':
      return await itemsDB.getItemById(db, id);
    case 'lore':
      return await loreDB.getLoreEntryById(db, id);
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}

async function getCompendiumByProjectId(
  projecIid: string,
  baseType?: CompendiumCategory
) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await characterDB.getCharactersByProject(db, projecIid);
    case 'location':
      return await locationDB.getLocationsByProject(db, projecIid);
    case 'organization':
      return await organizationDB.getOrganizationsByProject(
        db,
        projecIid
      );
    case 'item':
      return await itemsDB.getItemsByProject(db, projecIid);
    case 'lore':
      return await loreDB.getLoreEntriesByProject(db, projecIid);
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}

async function deleteCompendium(id: string, baseType?: CompendiumCategory) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await characterDB.deleteCharacter(db, id);
    case 'location':
      return await locationDB.deleteLocation(db, id);
    case 'organization':
      return await organizationDB.deleteOrganization(db, id);
    case 'item':
      return await itemsDB.deleteItem(db, id);
    case 'lore':
      return await loreDB.deleteLoreEntry(db, id);
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}
