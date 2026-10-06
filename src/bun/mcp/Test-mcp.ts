import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mcpServer } from "./Server.ts";
import { db, sqlite } from "../db/McpIndex.ts";
import { characters } from "../db/McpSchema.ts";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

async function runPhase1Tests() {
  console.log("Test-mcp ")
  console.log("Starting Phase 1 Integration Tests \n");

  try {

    sqlite.run(`CREATE TABLE IF NOT EXISTS characters(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT null,
      role TEXT,
      bio TEXT,
      status TEXT DEFAULT 'Alive'
      );`
    );

    // 1. Create a linked pair of in-memory transports
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    // 2. Connect the McpServer to the server side of the transport
    await mcpServer.connect(serverTransport);

    // 3. Initialize an MCP Client connected to the client side
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(clientTransport);

    console.log("🔌 Connected MCP Client & Server via InMemoryTransport.\n");

    // Helper to invoke MCP tools using the standard MCP protocol schema
    const createCharRes = await client.callTool(
      {
        name: "create_character",
        arguments: {
          name: "Marcus Vance",
          role: "Protagonist",
          bio: "A retired investigator drawn back for one last case.",
        },
      },
      CallToolResultSchema
    );

    console.log(" Result", JSON.stringify(createCharRes.content));

    // Verify in SQLite via Drizzle
    const allCharacters = await db.select().from(characters);
    console.assert(allCharacters.length > 0, "Character was not saved to DB");
    const createdCharacter = allCharacters[allCharacters.length - 1];
    console.log("saved to DB", createdCharacter);

    const updateCharRes = await client.callTool(
      {
        name: "update_character_status",
        arguments: {
          characterId: 1,
          newStatus: "Injured",
        },
      },
      CallToolResultSchema
    );

    await client.close();
    await mcpServer.close();
  }

  catch (error) {
    console.log("Test failed with error", error);
  }
}

runPhase1Tests();