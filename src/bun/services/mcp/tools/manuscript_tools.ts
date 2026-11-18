import * as chapterDB from '../../../database/tables/chapters.js'
import { db } from "@/bun/electrobun/db";
import { mcpServer } from "@/bun/services/mcp/server";
import z from "zod";

const chapterStatusEnum = z.enum(['outline', 'draft', 'revision', 'done']);

mcpServer.registerTool(
  'create_chapter',
  {
    title: 'Create Chapter',
    description:
      "Creates a new Chapter within a project using the provided chapter fields (such as title, summary, status, or content). Requires projectId. Use this tool when adding a new narrative chapter or story section to an existing project.",
    inputSchema: z.object({
      title: z.string().describe('The primary title of the Chapter'),
      projectId: z.string().describe('The Project ID of the Chapter'),
      status: chapterStatusEnum.describe('Status of the chapter')
    }),
  },
  async ({ projectId, title, status }) => {
    const newChapter = {
      outline: null,
      title: title,
      content: null,
      projectId: projectId,
      id: crypto.randomUUID(),
      status: status || 'outline',
      filePath: null,
      orderIndex: 0,
      povCharacterId: null,
      wordCountTarget: null,
      actId: null,
      sequenceId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    console.log(
      `[calling createChapters] Project: ${projectId}, Name: ${title}`
    );

    const template = await chapterDB.createChapter(
      db,
      newChapter
    );
    console.log(
      `[CRUD: Create] Project: ${projectId}, Name: ${title}`
    );
    console.log('Chapter created ', template);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created "${JSON.stringify(template, null, 2)}".`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'update_chapter',
  {
    title: 'Update Chapter',
    description:
      "Updates an existing Chapter within a project. Requires projectId or take current projectId if not provided and the chapter's id. Use this tool when modifying a chapter's fields (such as title, summary, status or content). If the chapter id is unknown, use the list chapters tool first to retrieve it.",
    inputSchema: z.object({
      id: z.string().describe('The id of the chapter'),
      title: z.string().describe('The primary title of the Chapter'),
      projectId: z.string().describe('The Project ID of the Chapter'),
      status: chapterStatusEnum.describe('Status of the chapter')
    }),
  },
  async ({ projectId, title, status, id }) => {
    const newChapter = {
      outline: null,
      title: title,
      content: null,
      projectId: projectId,
      id: id,
      status: status || 'outline',
      filePath: null,
      orderIndex: 0,
      povCharacterId: null,
      wordCountTarget: null,
      actId: null,
      sequenceId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const template = await chapterDB.updateChapter(
      db,
      id,
      newChapter
    );

    if (!template) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: project with ID ${projectId} was not found`,
          },
        ],
      };
    }

    console.log('Chapter Updated ', template);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully Updated "${JSON.stringify(template, null, 2)}".`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'get_chapter',
  {
    title: 'Retreive Chapter',
    description:
      "Retrieves the full details of a specific Chapter within a project. Requires projectId or take current projectId if not provided, baseType, and either the chapter's id or title. Use this tool when inspecting a single narrative chapter.If the id or exact title is unknown, use the list chapters tool first to retrieve it.",
    inputSchema: z.object({
      id: z.string().describe('The id of the chapter'),
      title: z.string().describe('The primary title of the Chapter'),
      projectId: z.string().describe('The Project ID of the Chapter'),
    }),
  },
  async ({ id }) => {

    const template = await chapterDB.getChapterById(
      db,
      id
    );

    if (!template) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ID ${id} was not found`,
          },
        ],
      };
    }

    console.log('Chapter Retreived by ID', id);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully Retreived "${JSON.stringify(template, null, 2)}".`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'list_chapters',
  {
    title: 'Retreive Chapter',
    description:
      "Retrieves full details of all Chapters within a project. Requires either an explicit projectId or the active/current projectId. Use this to browse existing narrative chapters or to find a chapter's id before updating or retrieving its individual details.",
    inputSchema: z.object({
      projectId: z.string().describe('The Project ID of the Chapter'),
    }),
  },
  async ({ projectId }) => {

    const template = await chapterDB.getChaptersByProject(
      db,
      projectId
    );

    if (!template) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: project with ID ${projectId} was not found`,
          },
        ],
      };
    }

    console.log('Chapters Retreived by Project ID', template);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully Retreived "${projectId}".`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'delete_chapter',
  {
    title: 'Delete Chapter',
    description:
      "Permanently deletes a specific Chapter from a project. Requires projectId or take current projectId if not provided and either the chapter's id or title. Use only when explicitly removing an existing narrative chapter.If the ID or exact title is unknown, list the project's chapters first to confirm the target before deleting.",
    inputSchema: z.object({
      id: z.string().describe('The id of the chapter'),
      title: z.string().describe('The primary title of the Chapter'),
      projectId: z.string().describe('The Project ID of the Chapter'),
      status: chapterStatusEnum.describe('Status of the chapter')
    }),
  },
  async ({ title, id }) => {

    try {
      await chapterDB.deleteChapter(
        db,
        id
      );

      console.log('Chapter Deleted by ID', id);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully Deleted chapter with ${id}, title ${title}.`,
          },
        ],
      };
    }

    catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ID ${err} was not found`,
          },
        ],
      };
    }
  }
);