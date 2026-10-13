import { db } from './index';
import { agents, agentRuns } from '../schema';
import { eq, asc } from 'drizzle-orm';

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export async function getAllAgents(): Promise<Agent[]> {
    return db.select().from(agents).orderBy(asc(agents.updatedAt));
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id));
    return result[0];
}

export async function getAgentsByProject(projectId: string): Promise<Agent[]> {
    return db
        .select()
        .from(agents)
        .where(eq(agents.projectId, projectId))
        .orderBy(asc(agents.updatedAt));
}

export async function createAgent(agent: NewAgent): Promise<Agent> {
    await db.insert(agents).values(agent);
    return agent as Agent;
}

export async function updateAgent(
    id: string,
    data: Partial<NewAgent>
): Promise<Agent | undefined> {
    await db
        .update(agents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agents.id, id));
    return getAgentById(id);
}

export async function deleteAgent(id: string): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
}

export async function getRunsByAgent(agentId: string): Promise<AgentRun[]> {
    return db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.agentId, agentId))
        .orderBy(asc(agentRuns.startedAt));
}

export async function createRun(run: NewAgentRun): Promise<AgentRun> {
    await db.insert(agentRuns).values(run);
    return run as AgentRun;
}

export async function updateRun(
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
