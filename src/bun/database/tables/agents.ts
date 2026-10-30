import { eq, asc } from 'drizzle-orm';

import { agents, agentRuns } from '@/shared/schema';
import type { SQLiteDB } from '@/shared/types/db';

type Agent = typeof agents.$inferSelect;
type NewAgent = typeof agents.$inferInsert;
type AgentRun = typeof agentRuns.$inferSelect;
type NewAgentRun = typeof agentRuns.$inferInsert;

export async function getAllAgents(db: SQLiteDB): Promise<Agent[]> {
    return db.select().from(agents).orderBy(asc(agents.updatedAt));
}

export async function getAgentById(
    db: SQLiteDB,
    id: string
): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id));
    return result[0];
}

export async function getAgentsByProject(
    db: SQLiteDB,
    projectId: string
): Promise<Agent[]> {
    return db
        .select()
        .from(agents)
        .where(eq(agents.projectId, projectId))
        .orderBy(asc(agents.updatedAt));
}

export async function createAgent(
    db: SQLiteDB,
    agent: NewAgent
): Promise<Agent> {
    await db.insert(agents).values(agent);
    return agent as Agent;
}

export async function updateAgent(
    db: SQLiteDB,
    id: string,
    data: Partial<NewAgent>
): Promise<Agent | undefined> {
    await db
        .update(agents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agents.id, id));
    return getAgentById(db, id);
}

export async function deleteAgent(db: SQLiteDB, id: string): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
}

export async function getRunsByAgent(
    db: SQLiteDB,
    agentId: string
): Promise<AgentRun[]> {
    return db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.agentId, agentId))
        .orderBy(asc(agentRuns.startedAt));
}

export async function createRun(
    db: SQLiteDB,
    run: NewAgentRun
): Promise<AgentRun> {
    await db.insert(agentRuns).values(run);
    return run as AgentRun;
}

export async function updateRun(
    db: SQLiteDB,
    id: string,
    data: Partial<NewAgentRun>
): Promise<AgentRun | undefined> {
    await db.update(agentRuns).set(data).where(eq(agentRuns.id, id));
    const result = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, id));
    return result[0];
}
