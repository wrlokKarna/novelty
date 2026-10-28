export type Agent = {
    id: string;
    projectId: string | null;
    name: string;
    config: string | null;
    systemPrompt: string | null;
    tools: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type NewAgent = Omit<Agent, 'createdAt' | 'updatedAt'>;

export type AgentRun = {
    id: string;
    agentId: string;
    status: string;
    input: string | null;
    output: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
};

export type NewAgentRun = Omit<AgentRun, 'startedAt' | 'finishedAt'>;
