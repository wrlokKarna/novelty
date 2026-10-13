import { db } from './index';
import { chatSessions, chatMessages } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

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
    return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(asc(chatMessages.timestamp));
}

export async function createMessage(
    message: NewChatMessage
): Promise<ChatMessage> {
    await db.insert(chatMessages).values(message);
    return message as ChatMessage;
}

export async function deleteMessage(id: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
}
