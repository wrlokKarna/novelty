import { asc, eq } from 'drizzle-orm';
import type {
    ChatMessage,
    ChatSession,
    NewChatMessage,
    NewChatSession,
} from '@/shared/types/ai';
import type { SQLiteDB } from '@/shared/types/db';
import { chatMessages, chatSessions } from '../../../shared/schema';

//type ChatSession = typeof chatSessions.$inferSelect;
//type NewChatSession = typeof chatSessions.$inferInsert;
//type ChatMessage = typeof chatMessages.$inferSelect;
//type NewChatMessage = typeof chatMessages.$inferInsert;

function parseAssistantContent(content: string): string[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item));
        return [String(parsed)];
    } catch {
        return [content];
    }
}

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
            row.role === 'assistant'
                ? parseAssistantContent(row.content)
                : row.content,
        steps: row.steps ? JSON.parse(row.steps) : undefined,
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
        steps:
            message.role === 'assistant' && message.steps
                ? JSON.stringify(message.steps)
                : undefined,
        timestamp: now,
    };

    await db.insert(chatMessages).values(dbValues as any);

    return {
        ...message,
        timestamp: now.toISOString(),
    } as ChatMessage;
}

export async function updateMessage(
    db: SQLiteDB,
    id: string,
    data: Partial<NewChatMessage>
): Promise<ChatMessage | undefined> {
    const dbValues: Record<string, unknown> = { ...data };

    if (data.content !== undefined) {
        dbValues.content = Array.isArray(data.content)
            ? JSON.stringify(data.content)
            : data.content;
    }
    if ('steps' in data) {
        dbValues.steps = data.steps ? JSON.stringify(data.steps) : null;
    }
    if ('reasoning' in data) {
        dbValues.reasoning = data.reasoning ?? null;
    }

    await db
        .update(chatMessages)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(dbValues as any)
        .where(eq(chatMessages.id, id));

    const rows = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, id));
    const row = rows[0];
    if (!row) return undefined;

    return {
        ...row,
        timestamp: row.timestamp.toISOString(),
        content:
            row.role === 'assistant'
                ? parseAssistantContent(row.content)
                : row.content,
        steps: row.steps ? JSON.parse(row.steps) : undefined,
    } as ChatMessage;
}

export async function deleteMessage(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.id, id));
}
