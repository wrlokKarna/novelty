import { db } from "@/bun/electrobun/db";
import { mcpServer } from "@/bun/services/mcp/server";
import * as storybeatDB from '../../../database/tables/storyBeats.js'
import z from "zod";
import type { StoryBeatType } from "@/shared/types/project/manuscript";

mcpServer.registerTool(
  'create_story_beat',
  {
    title: 'Create Story Beat',
    description:
      "Creates a new Story Beat within a project using a beatType, title, and description. Requires projectId. Use this tool when adding a specific plot point, scene milestone, turning point, or pacing event to an existing project.",
    inputSchema: z.object({
      projectId: z.string().describe('The Project ID'),
      title: z.string().describe('The title of the story beat'),
      beatType: z
        .string()
        .optional()
        .describe('The beat type of the story beat'),
      description: z
        .string()
        .optional()
        .describe('The description of the story beat'),
    }),
  },
  async ({ title, projectId, beatType, description }) => {
    console.log(`[calling create_story_beat] Name: ${title}`);

    const newStoryBeat = {
      id: crypto.randomUUID(),
      projectId: projectId,
      chapterId: 'null',
      orderIndex: 1,
      title: title,
      beatType: (beatType ?? 'custom') as StoryBeatType,
      description: description ?? null,
    };

    const result = await storybeatDB.createBeat(db, newStoryBeat);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created with ${result} storybeat`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'list_story_beats',
  {
    title: 'Retrieve all story beats',
    description:
      "Retrieves all available Story Beats within a project. Requires either an explicit projectId or the active/current project context. Use this to browse existing plot points, scene milestones, or narrative events, or to find a story beat's id before updating or retrieving its individual details.",
    inputSchema: z.object({
      projectId: z.string().describe('The ID of the project'),
    }),
  },
  async ({ projectId }) => {
    console.log(`[Calling list_story_beats] for Project: ${projectId}`);
    const template = await storybeatDB.getBeatsByProject(
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

    console.log('[Story Beats:', template);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(template),
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'get_story_beat',
  {
    title: 'Retrieve story_beat',
    description:
      "Retrieves the full details of a specific Story Beat within a project. Requires projectId and either the story beat's id or title. Use this tool when inspecting a single plot point, scene milestone, or narrative event.",
    inputSchema: z.object({
      id: z.string().describe('The ID of the story beat'),
      title: z.string().describe('The title of the story beat'),
      projectId: z
        .string()
        .optional()
        .describe('The ID of the project'),
    }),
  },
  async ({ id }) => {
    console.log(`[Calling get_story_beat] for Id: ${id}`);
    const storyBeat = await storybeatDB.getBeatById(db, id);
    console.log('[Get Story Beat:', storyBeat);

    if (!storyBeat) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: story beat with ID ${id} was not found`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(storyBeat),
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'update_story_beat',
  {
    title: 'Update Story beat',
    description: "Updates an existing Story Beat within a project. Requires projectId and either the story beat's id or title. Use this tool when modifying a plot point, scene milestone, or narrative event (such as its beat type, title, or description). If the id or exact title is unknown, use the list story beats tool first to retrieve it.",
    inputSchema: z.object({
      id: z
        .string()
        .describe('The unique ID of the story beat to update'),
      title: z.string().optional().describe('New title if updating'),
      description: z
        .string()
        .optional()
        .describe('The description of the story beat'),
      projectId: z
        .string()
        .optional()
        .describe('The projectId of the story beat'),
      beatType: z
        .string()
        .optional()
        .describe('Beat type of the story beat'),
    }),
  },

  async ({ id, projectId, description, title, beatType }) => {
    const newStoryBeat = {
      id: crypto.randomUUID(),
      projectId: projectId,
      chapterId: 'null',
      orderIndex: 1,
      title: title,
      beatType: (beatType ?? 'custom') as StoryBeatType,
      description: description,
    };
    console.log(`[story beat update with] ${id} and ${title}`);
    const UpdateBeat = await storybeatDB.updateBeat(
      db,
      id,
      newStoryBeat
    );

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
          text: `Successfully updated story beat ${id}`,
        },
      ],
    };
  }
);

mcpServer.registerTool(
  'delete_story_beat',
  {
    title: 'Delete Story beat',
    description:
      "Permanently deletes a specific Story Beat from a project. Requires projectId and either the story beat's id or title. Use only when explicitly removing an existing plot point, scene milestone, or narrative event—if the ID or exact title is unknown, list the project's story beats first to confirm the target before deleting.",
    inputSchema: z.object({
      id: z
        .string()
        .describe('The unique ID of the story beat to delete'),
      title: z.string().optional().describe('title of the story beat'),
      projectId: z
        .string()
        .optional()
        .describe('The projectId of the story beat'),
    }),
  },

  async ({ id }) => {
    try {
      await storybeatDB.deleteBeat(db, id);

      console.log(`storybeat id delete with: ${id}`);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted story beat ${id}`,
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