import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { characters } from "../db/McpSchema.js";
import { eq } from "drizzle-orm";
import { db } from "../database/index.js";


// Initialize MCP Server
export const mcpServer = new McpServer(
  { name: "novelty-mcp-server", version: "1.0.0" }
);

// Tool 1: create_character
mcpServer.registerTool(
  "create_character",
  {
    title: "create Character",
    description: "Add a new character to the manuscript database.",
    inputSchema: z.object({                                     // Note need to be added dynamically from template data
      name: z.string().describe("Character name"),
      role: z.string().optional().describe("Role in story"),
      bio: z.string().optional().describe("Character bio"),
    }),
  },
  async ({ name, role, bio }) => {
    const result = await db
      .insert(characters)
      .values({ name, role, bio })
      .returning();

    console.log("Server ");
    return {
      content: [{ type: "text", text: `Character created with ID: ${result[0].id}` }],
    };
  }
);

// Tool 2: update_character_status
mcpServer.registerTool(
  "update_character_status",
  {
    title: "Update Character Status",
    description: "Update a character's current status (e.g. Alive, Injured, Deceased).",
    inputSchema: z.object({
      characterId: z.number().describe("Character ID"),
      newStatus: z.string().describe("New status"),
    }),
  },
  async ({ characterId, newStatus }) => {
    await db
      .update(characters)
      .set({ status: newStatus })
      .where(eq(characters.id, characterId));

    return {
      content: [{ type: "text", text: `Character ${characterId} status updated to: ${newStatus}` }],
    };
  }
);

