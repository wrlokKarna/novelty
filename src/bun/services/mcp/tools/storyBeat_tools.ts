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
      'Create new story beat based on project ID, beat type, title and description',
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
      'Retrieve all available story beats based on project Id using project id or current project id',
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
      'Retrieve a story beat based on project Id using id or title',
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
    description: "Update an existing story beat based on project Id by using id or title or using list story beats tool call to get details about the story beat",
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
      'Delete story beat based on project Id using id or title',
    inputSchema: z.object({
      id: z
        .string()
        .describe('The unique ID of the story beat to delete'),
      title: z.string().optional().describe('title of the story beat'),
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