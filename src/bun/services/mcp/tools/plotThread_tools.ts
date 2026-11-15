import { db } from "@/bun/electrobun/db";
import { mcpServer } from "@/bun/services/mcp/server";
import * as plotthreadDB from '../../../database/tables/plotThreads.js'
import type { PlotThreadType } from "@/shared/types/project/manuscript";
import z from "zod";

mcpServer.registerTool(
  'create_plot_thread',
  {
    title: 'Create Plot Thread',
    description:
      'Create new plot thread based on project ID,thread type, title and description',
    inputSchema: z.object({
      title: z.string().describe('The title of the plot thread'),
      threadType: z
        .string()
        .optional()
        .describe('The thread type of the plot thread'),
      description: z
        .string()
        .optional()
        .describe('The description of the plot thread'),
      projectId: z.string().optional().describe('The Project ID'),
      color: z
        .string()
        .optional()
        .describe('Color of the plot thread'),
    }),
  },
  async ({ title, threadType, description, projectId, color }) => {
    console.log(`[calling create_plot_thread] Name: ${title}`);

    const newPlotThread = {
      id: crypto.randomUUID(),
      projectId: projectId ?? 'null',
      color: color ?? 'blue',
      name: title,
      threadType: (threadType ?? 'subplot') as PlotThreadType,
      description: description ?? null,
    };

    const result = await plotthreadDB.createThread(db, newPlotThread);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created with ${result} plot thread`,
        },
      ],
    };
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
            text: `ERROR: ID ${id} was not found`,
          },
        ],
      };
    }

    console.log(`[calling get_story_beat] ID: ${id}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
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
    const result = await plotthreadDB.getThreadsByProject(
      db,
      projectId
    );

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: `ERROR: Project ID ${projectId} was not found`,
          },
        ],
      };
    }

    console.log(`[calling get_story_beat] ID: ${projectId}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'update_plot_thread',
  {
    title: 'Update Plot Thread',
    description: 'Update existing plot thread based on ID',
    inputSchema: z.object({
      title: z
        .string()
        .optional()
        .describe('The title of the plot thread'),
      description: z
        .string()
        .optional()
        .describe('The description of the plot thread'),
      id: z.string().describe('The id of the plot thread'),
      projectId: z
        .string()
        .optional()
        .describe('Project Id of the plot thread'),
      color: z
        .string()
        .optional()
        .describe('Color of the plot thread'),
      threadType: z
        .string()
        .optional()
        .describe('Thread type of the plot thread'),
    }),
  },
  async ({ title, description, id, projectId, color, threadType }) => {
    const newPlotThread = {
      id: crypto.randomUUID(),
      projectId: projectId,
      color: color ?? 'blue',
      name: title,
      threadType: (threadType ?? 'subplot') as PlotThreadType,
      description: description ?? null,
    };

    const result = await plotthreadDB.updateThread(
      db,
      id,
      newPlotThread
    );

    if (!result) {
      return {
        content: [
          {
            type: 'text',
            text: `ERROR: ID ${id} was not found`,
          },
        ],
      };
    }
    console.log(`[calling update_plot_thread] id: ${id}`);
    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated ${result} plot thread`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'delete_plot_thread',
  {
    title: 'Delete Plot Thread',
    description: 'Delete plot thread based on ID',
    inputSchema: z.object({
      id: z.string().describe('The id of the plot thread'),
    }),
  },
  async ({ id }) => {
    await plotthreadDB.deleteThread(db, id);

    try {
      await plotthreadDB.deleteThread(db, id);

      console.log(`plotThread id delete with: ${id}`);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted plot thread ${id}`,
          },
        ],
      };
    } catch (err) {
      console.log('[tools.ts]', err);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ID ${id} was not found`,
          },
        ],
      };
    }
  }
);
