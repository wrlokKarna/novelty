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

export type ChatSession = {
    id: string;
    projectId: string | null;
    title: string;
    isArchived: boolean;
    isManuallyNamed: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type NewChatSession = Omit<ChatSession, 'createdAt' | 'updatedAt'>;

export type NewChatMessage = Omit<ChatMessage, 'timestamp'> & {
    reasoning?: string;
    steps?: AssistantStep[];
    durationMs?: number;
};

export interface ReasoningStep {
    type: 'reasoning';
    content: string;
}

export interface ToolStep {
    type: 'tool';
    id: string;
    name: string;
    arguments?: string;
    result?: string;
    status: 'running' | 'completed' | 'error';
}

export type AssistantStep = ReasoningStep | ToolStep;

export interface ToolCall {
    id?: string;
    type?: string;
    function: {
        name: string;
        arguments: string;
    };
}

export interface ApiMessage {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface ChatMessageCommon {
    id: string;
    sessionId: string;
    mode: 'assistant' | 'editor';
    timestamp: string;
    model?: string;
}

export interface UserChatMessage extends ChatMessageCommon {
    role: 'user';
    content: string;
}

export interface AssistantChatMessage extends ChatMessageCommon {
    role: 'assistant';
    content: string[];
    reasoning?: string;
    steps?: AssistantStep[];
    /** Wall-clock time the response took to stream, in milliseconds. */
    durationMs?: number;
    currentVariantIndex: number;
    model: string;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage;
