import * as templatesDB from '../../../database/tables/templates.js'
import { db } from "@/bun/electrobun/db";
import { mcpServer } from "@/bun/services/mcp/server";
import type { CompendiumCategory } from "@/shared/types/project/compendium";
import z from "zod";
//import type { NewEntityTemplate } from '../../../database/tables/templates.js';

const compendiumCategoryEnum = z.enum([
  'character',
  'location',
  'organization',
  'item',
  'lore',
]);

/*
mcpServer.registerTool(
  'create_template',
  {
    title: 'Create a Template',
    description:
      'Create template entity(character, location, organization, item, lore) details using project id or current project id and base type.',
    inputSchema: z.object({
      projectId: z.string().describe('The ID of the project'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the entity'
      ),
    }),
  },

  async ({ projectId, baseType }) => {
    const newEntityTemplate = {
      id: crypto.randomUUID(),
      projectId: projectId,
      baseType: baseType,
      customFields: [],
      layout: null,
    };
    console.log(
      `[calling create_entity] Project: ${projectId}, Type: ${baseType}`
    );

    const template = await createEntity(newEntityTemplate, baseType);
    console.log(
      `[CRUD: Create] Project: ${projectId}, Type: ${baseType}, Name: ${name}`
    );
    console.log('Entity created ', template);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created ${baseType} "${name}" custom attributes.`,
        },
      ],
    };
  }
);
*/

mcpServer.registerTool(
  'get_template',
  {
    title: 'Retrieve a Template',
    description:
      'Retrive template entity(character, location, organization, item, lore) details using project id or current project id and base type.',
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

async function getTemplateByType(
  projectId: string,
  baseType: CompendiumCategory
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
      return null;
  }
}

/*
async function createEntity(
  entityTemplate: NewEntityTemplate,
  baseType: CompendiumCategory | "chapter"
) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await templatesDB.createTemplate(db, entityTemplate);
    case 'location':
      return await templatesDB.createTemplate(db, entityTemplate);
    case 'organization':
      return await templatesDB.createTemplate(db, entityTemplate);
    case 'item':
      return await templatesDB.createTemplate(db, entityTemplate);
    case 'lore':
      return await templatesDB.createTemplate(db, entityTemplate);
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}
*/