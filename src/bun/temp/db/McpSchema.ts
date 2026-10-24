import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const characters = sqliteTable("characters",
  {
    id: integer("id").primaryKey({ autoIncrement: true }), // Note accepts pos and neg number 
    name: text("name").notNull(),
    role: text("role"),
    bio: text("bio"),
    status: text("status").default("Alive"),
  }
);

console.log("McpSchema ");

export type Character = InferSelectModel<typeof characters>;
export type NewCharacter = InferInsertModel<typeof characters>;

export const scenes = sqliteTable("scenes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    content: text("content").default(""),
    chapterNumber: integer("chapter_number").notNull(),
    order: integer("order").notNull(),
  }
);

export type Scene = InferSelectModel<typeof scenes>;
export type NewScene = InferInsertModel<typeof scenes>;


export const timelineEvents = sqliteTable("timeline_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: text("start_date").notNull(), // ISO Date string
    characterId: integer("character_id").references(() => characters.id, {
      onDelete: "set null",
    }),
  });

export type TimelineEvent = InferSelectModel<typeof timelineEvents>;
export type NewTimelineEvent = InferInsertModel<typeof timelineEvents>;