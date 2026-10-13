import { getRPC } from '../contexts/RPCContext';
import type { ContextSource, MentionTarget } from '../types/index';

export interface ContextResult {
    systemPrompt: string;
    tokenEstimate: number;
    sources: ContextSource[];
}

export interface IndexResult {
    indexed: number;
    skipped: number;
    failed: number;
    totalChunks: number;
}

export interface IndexStatus {
    total: number;
    byType: Record<string, number>;
}

export async function checkEmbeddingsAvailable(): Promise<boolean> {
    try {
        const rpc = getRPC();
        return await rpc.request['embeddings:check-availability']();
    } catch {
        return false;
    }
}

export async function indexProject(projectId: string): Promise<IndexResult> {
    const rpc = getRPC();
    return await rpc.request['embeddings:index-project']({ projectId });
}

export async function getIndexStatus(projectId: string): Promise<IndexStatus> {
    const rpc = getRPC();
    return (await rpc.request['embeddings:status'](projectId)) as IndexStatus;
}

export async function rebuildEmbeddings(projectId: string): Promise<void> {
    const rpc = getRPC();
    await rpc.request['embeddings:rebuild'](projectId);
}

export async function buildAIContext(params: {
    projectId: string;
    userMessage: string;
    currentChapterId?: string;
    mentionTargets?: MentionTarget[];
    fileContents?: string[];
    customPrompt?: string | null;
    chapterContextMode?: 'brief' | 'full';
    tokenBudget: number;
}): Promise<ContextResult> {
    const rpc = getRPC();
    return await rpc.request['embeddings:context'](params);
}
