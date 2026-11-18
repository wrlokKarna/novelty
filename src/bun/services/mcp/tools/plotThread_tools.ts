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
      "Creates a new Plot Thread within a project using a threadType, color, title, and description. Requires projectId. Use this tool when adding a new storyline, subplot, character arc, or narrative thread to an existing project.",
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
  'get_plot_thread',
  {
    title: 'Retreive Plot Thread',
    description: "Retrieves the full details of a specific Plot Thread within a project. Requires projectId or take current projectId if not provided and either the plot thread's id or title. Use this tool when inspecting a single storyline, subplot, or narrative arc.If the id or exact title is unknown, use the list plot threads tool first to retrieve it.",
    inputSchema: z.object({
      id: z.string().describe('The id of the plot thread'),
      title: z.string().describe('The title of the plot thread')
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
  'list_plot_threads',
  {
    title: 'Retreive Plot Thread',
    description: "Retrieves full details of all available Plot Threads within a project. Requires either an explicit projectId or the active/current projectId. Use this to browse existing storylines, subplots, and narrative arcs, or to find a plot thread's id before updating or retrieving its individual details.",
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

    console.log(`[calling list_plot_threads] ID: ${projectId}`);
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
    description: "Updates an existing Plot Thread within a project. Requires projectId or take current projectId if not provided and either the color,threadType,plot thread's id or title. Use this tool when modifying a storyline, subplot, character arc, or narrative thread (such as its thread type, title, or description). If the id or exact title is unknown, use the list plot threads tool first to retrieve it.",
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
    description: "Permanently deletes a specific Plot Thread from a project. Requires projectId and either the plot thread's id or title. Use only when explicitly removing an existing storyline, subplot, or narrative arc.If the ID or exact title is unknown, list the project's plot threads first to confirm the target before deleting.",
    inputSchema: z.object({
      id: z.string().describe('The id of the plot thread'),
      title: z
        .string()
        .optional()
        .describe('The title of the plot thread'),
      projectId: z
        .string()
        .optional()
        .describe('Project Id of the plot thread'),
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
