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
      'Create a new Chapter inside a project using its fields based on project Id.',
    inputSchema: z.object({
      title: z.string().describe('The primary name of the Chapter'),
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
          text: `Successfully created "${title}".`,
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
      'Update a Chapter based on project Id by using id or using list chapters tool to get details about the chapter.',
    inputSchema: z.object({
      id: z.string().describe('The id of the chapter'),
      title: z.string().describe('The primary name of the Chapter'),
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
          text: `Successfully Updated "${title}".`,
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
      'Retreive a Chapter based on project Id using id or title and name of the base type.',
    inputSchema: z.object({
      id: z.string().describe('The id of the chapter'),
      title: z.string().describe('The primary name of the Chapter'),
      projectId: z.string().describe('The Project ID of the Chapter'),
      status: chapterStatusEnum.describe('Status of the chapter')
    }),
  },
  async ({ title, id }) => {

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
          text: `Successfully Retreived "${title}".`,
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
      'Retreive Chapters details based on project Id using project id or current project id.',
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
      'Delete a Chapter based on project Id using id or title.',
    inputSchema: z.object({
      id: z.string().describe('The id of the chapter'),
      title: z.string().describe('The primary name of the Chapter'),
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
            text: `Successfully Deleted ${title}${id}.`,
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