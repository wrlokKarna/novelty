import { eq, asc } from 'drizzle-orm';

import { db } from './../index';
import { chatSessions, chatMessages } from '../../schema';
import type {
    ChatSession,
    NewChatSession,
    ChatMessage,
    NewChatMessage,
} from '@/shared/types/ai';

//type ChatSession = typeof chatSessions.$inferSelect;
//type NewChatSession = typeof chatSessions.$inferInsert;
//type ChatMessage = typeof chatMessages.$inferSelect;
//type NewChatMessage = typeof chatMessages.$inferInsert;

export async function getAllSessions(): Promise<ChatSession[]> {
    return db.select().from(chatSessions).orderBy(asc(chatSessions.updatedAt));
}

export async function getSessionById(
    id: string
): Promise<ChatSession | undefined> {
    const result = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, id));
    return result[0];
}

export async function getSessionsByProject(
    projectId: string
): Promise<ChatSession[]> {
    return db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.projectId, projectId))
        .orderBy(asc(chatSessions.updatedAt));
}

export async function createSession(
    session: NewChatSession
): Promise<ChatSession> {
    await db.insert(chatSessions).values(session);
    return session as ChatSession;
}

export async function updateSession(
    id: string,
    data: Partial<NewChatSession>
): Promise<ChatSession | undefined> {
    await db
        .update(chatSessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(chatSessions.id, id));
    return getSessionById(id);
}

export async function deleteSession(id: string): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
}

export async function getMessagesBySession(
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

export async function deleteMessage(id: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
}
