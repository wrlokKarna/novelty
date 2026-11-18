import * as templatesDB from '../../../database/tables/templates.js'
import { db } from "@/bun/electrobun/db";
import { mcpServer } from "@/bun/services/mcp/server";
import type { CompendiumCategory } from "@/shared/types/project/compendium";
import z from "zod";
import type { NewEntityTemplate } from '../../../database/tables/templates.js';

const compendiumCategoryEnum = z.enum([
  'character',
  'location',
  'organization',
  'item',
  'lore',
]);

const FieldDefintionSchema = z.object({
  name: z.string().describe("The name of the field definition"),
  type: z.enum([
    "number", "date", "text", "file", "color", "textarea", "select", "checkbox", "multiselect", "entitylink", "richtext", "toggle", "range", "portrait", "images", "tree",
  ]).describe("The type of the field defition"),
  label: z.string().describe("The label of the field definition"),
  required: z.boolean().describe("The required field(true/false) in template field definition"),
});

mcpServer.registerTool(
  'add_template_field',
  {
    title: 'add Template fields',
    description:
      "Adds custom template field definitions for a specific Compendium entity base type (character, location, organization, item, or lore) within a project. Requires baseType, the fieldDefinition , and either an explicit projectId or the active/current projectId. Use this tool when extending the schema or adding new reusable attributes/properties to an entity template—not when creating or updating an individual Compendium entry.",
    inputSchema: z.object({
      projectId: z.string().describe('The ID of the project'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the entity'
      ),
      fieldDefinition: z.array(FieldDefintionSchema).describe("The fields to create the template field definition")
    }),
  },

  async ({ projectId, baseType, fieldDefinition }) => {
    const newEntityTemplate = {
      id: crypto.randomUUID(),
      projectId: projectId,
      baseType: baseType,
      customFields: fieldDefinition ?? [],
      layout: null,
      createdAt: new Date()
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

mcpServer.registerTool(
  'update_template_field',
  {
    title: 'Update Template fields',
    description:
      "Updates existing custom template fieldDefinition for a specific Compendium entity base type (character, location, organization, item, or lore) within a project. Requires baseType, the updated fieldDefinition, and either an explicit projectId or the active/current projectId. Use this tool when modifying the schema, field names, data types, or validation rules of reusable entity attributes—not when editing an individual Compendium entry.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the template"),
      projectId: z.string().describe('The ID of the project'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the entity'
      ),
      fieldDefinition: z.array(FieldDefintionSchema).describe("The fields to update in the template field definition")
    }),
  },

  async ({ id, projectId, baseType, fieldDefinition }) => {
    const newEntityTemplate = {
      id: id,
      projectId: projectId,
      baseType: baseType,
      customFields: fieldDefinition ?? [],
      layout: null,
      updatedAt: new Date()
    };
    console.log(
      `[calling update_entity] Project: ${projectId}, Type: ${baseType}`
    );

    const template = await updateEntity(id, newEntityTemplate, baseType);

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
  'get_template_fields',
  {
    title: 'Retrieve Template fields',
    description:
      "Retrieves full details of the custom template fieldDefinition for a specific Compendium entity base type (character, location, organization, item, or lore) within a project. Requires baseType and either an explicit projectId or the active/current projectId. Use this tool when inspecting the schema or available custom attributes for an entity template—not when retrieving an individual Compendium entry.",
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


mcpServer.registerTool(
  'list_all_template_fields',
  {
    title: 'Retrieve all Template fields',
    description:
      "Retrieves full details of all the custom template fieldDefinition for all Compendium entity base types (character, location, organization, item, and lore) within a project in a single call. Requires either an explicit projectId or the active/current projectId. Use this tool when inspecting the entire schema structure or reviewing all custom attribute configurations across every entity category—not when listing individual Compendium entries.",
    inputSchema: z.object({
      projectId: z.string().describe('The ID of the project'),
    }),
  },
  async ({ projectId }) => {
    console.log(
      `[Calling get_all_templates] for Project: ${projectId}`
    );
    const template = await getAllTemplates(projectId);
    console.log(`[CRUD: Read] Template:`, template);

    if (!template) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Template for all compendium categories for project ${projectId} was not found.`,
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
  'delete_template_fields',
  {
    title: 'Delete Template fields',
    description:
      "Permanently deletes or removes custom template fieldDefinition for a specific Compendium entity base type (character, location, organization, item, or lore) within a project. Requires baseType, the specific field identifier to remove, and either an explicit projectId or the active/current projectId. Use only when explicitly modifying the schema structure of an entity template—not when deleting an individual Compendium entry.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the template"),
      projectId: z.string().optional().describe('The ID of the project'),
      baseType: compendiumCategoryEnum.describe(
        'The category/base type of the entity'
      ),
    }),
  },
  async ({ id, projectId, baseType }) => {
    console.log(
      `[Calling delete_template] for Project: ${projectId}, Type: ${baseType}`
    );
    const template = await deleteTemplateByid(id, baseType);
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


async function getAllTemplates(
  projectId: string,
) {
  // If baseType is provided, route query to specific category tables/handlers

  return await templatesDB.getTemplatesByProject(
    db,
    projectId,
  );
}

async function createEntity(
  entityTemplate: NewEntityTemplate,
  baseType: CompendiumCategory
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

async function updateEntity(
  id: string,
  entityTemplate: NewEntityTemplate,
  baseType: CompendiumCategory
) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await templatesDB.updateTemplate(db, id, entityTemplate);
    case 'location':
      return await templatesDB.updateTemplate(db, id, entityTemplate);
    case 'organization':
      return await templatesDB.updateTemplate(db, id, entityTemplate);
    case 'item':
      return await templatesDB.updateTemplate(db, id, entityTemplate);
    case 'lore':
      return await templatesDB.updateTemplate(db, id, entityTemplate);
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}

async function deleteTemplateByid(
  id: string,
  baseType: CompendiumCategory
) {
  // If baseType is provided, route query to specific category tables/handlers
  switch (baseType) {
    case 'character':
      return await templatesDB.deleteTemplate(
        db,
        id
      );
    case 'location':
      return await templatesDB.deleteTemplate(
        db,
        id
      );
    case 'organization':
      return await templatesDB.deleteTemplate(
        db,
        id
      );
    case 'item':
      return await templatesDB.deleteTemplate(
        db,
        id
      );
    case 'lore':
      return await templatesDB.deleteTemplate(
        db,
        id
      );
    default:
      // Fallback if baseType is omitted: query unified entities table or search across categories
      return null;
  }
}