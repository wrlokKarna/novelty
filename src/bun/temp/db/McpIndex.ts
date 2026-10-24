import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./McpSchema";

export const sqlite = new Database("novelty_manuscript.db");
console.log("Mcpindex ");

export const db = drizzle(sqlite, { schema });