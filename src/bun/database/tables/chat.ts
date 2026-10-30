import { eq, asc } from 'drizzle-orm';

import { chatSessions, chatMessages } from '../../../shared/schema';
import type {
    ChatSession,
    NewChatSession,
    ChatMessage,
    NewChatMessage,
} from '@/shared/types/ai';
import type { SQLiteDB } from '@/shared/types/db';

//type ChatSession = typeof chatSessions.$inferSelect;
//type NewChatSession = typeof chatSessions.$inferInsert;
//type ChatMessage = typeof chatMessages.$inferSelect;
//type NewChatMessage = typeof chatMessages.$inferInsert;

export async function getAllSessions(db: SQLiteDB): Promise<ChatSession[]> {
    return db.select().from(chatSessions).orderBy(asc(chatSessions.updatedAt));
}

export async function getSessionById(
    db: SQLiteDB,
    id: string
): Promise<ChatSession | undefined> {
    const result = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, id));
    return result[0];
}

export async function getSessionsByProject(
    db: SQLiteDB,
    projectId: string
): Promise<ChatSession[]> {
    return db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.projectId, projectId))
        .orderBy(asc(chatSessions.updatedAt));
}

export async function createSession(
    db: SQLiteDB,
    session: NewChatSession
): Promise<ChatSession> {
    await db.insert(chatSessions).values(session);
    return session as ChatSession;
}

export async function updateSession(
    db: SQLiteDB,
    id: string,
    data: Partial<NewChatSession>
): Promise<ChatSession | undefined> {
    await db
        .update(chatSessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(chatSessions.id, id));
    return getSessionById(db, id);
}

export async function deleteSession(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
}

export async function getMessagesBySession(
    db: SQLiteDB,
    sessionId: string
): Promise<ChatMessage[]> {
    const rows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(asc(chatMessages.timestamp));

    return rows.map((row) => ({
        ...row,
        timestamp: row.timestamp.toISOString(),

        content:
            row.role === 'assistant' ? JSON.parse(row.content) : row.content,
    })) as ChatMessage[];
}

export async function createMessage(
    db: SQLiteDB,
    message: NewChatMessage
): Promise<ChatMessage> {
    const now = new Date();

    const dbValues = {
        ...message,
        content: Array.isArray(message.content)
            ? JSON.stringify(message.content)
            : message.content,
        timestamp: now,
    };

    await db.insert(chatMessages).values(dbValues as any);

    return {
        ...message,
        timestamp: now.toISOString(),
    } as ChatMessage;
}

export async function deleteMessage(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
}
