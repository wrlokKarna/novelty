import type {
    ApiMessage,
    ChatMessage,
    ToolCall,
    ToolStep,
    UserChatMessage,
} from '../../../shared/types/ai';
import type { Model, Provider } from '../../../shared/types/ai/provider';
import { getRPC } from '../../contexts/RPCContext';

export function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
    return messages.map((m) => ({
        role: m.role,
        content:
            m.role === 'assistant'
                ? m.content[m.currentVariantIndex]
                : m.content,
    }));
}

export interface LLMTool {
    type: string;
    function: {
        name: string;
        description: string | undefined;
        parameters: {
            [x: string]: unknown;
            type: 'object';
            properties?: Record<string, object> | undefined;
            required?: string[] | undefined;
        };
    };
}

export interface ChatCompletionRequest {
    model: string;
    messages: ApiMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: LLMTool[];
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string | null;
            reasoning_content?: string;
            reasoning?: string;
            tool_calls?: ToolCall[];
        };
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface AICompletionOptions {
    enabledModel: {
        provider: Provider;
        activeModelId?: string;
    };
    messages: ChatMessage[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    onChunk?: (chunk: string) => void;
    onReasoningChunk?: (chunk: string) => void;
    onToolStep?: (step: ToolStep) => void;
    signal?: AbortSignal;
    connectTimeoutMs?: number;
    chunkTimeoutMs?: number;
    supportsTools?: boolean;
    onToolSupportDetermined?: (modelId: string, supports: boolean) => void;
    maxToolRounds?: number;
}

export interface ChatCompletionResult {
    content: string;
    reasoning_content?: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    } | null;
}

interface RoundResult {
    content: string;
    reasoning: string;
    toolCalls: ToolCall[];
    usage: ChatCompletionResult['usage'];
}

export class AIAbortError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AIAbortError';
    }
}

function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    signal?: AbortSignal,
    label = 'Request'
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            abortController.abort();
            reject(
                new AIAbortError(
                    `${label} timed out after ${Math.round(ms / 1000)}s`
                )
            );
        }, ms);

        const abortController = new AbortController();

        if (signal) {
            if (signal.aborted) {
                clearTimeout(timer);
                reject(new AIAbortError(`${label} was aborted`));
                return;
            }
            signal.addEventListener(
                'abort',
                () => {
                    clearTimeout(timer);
                    abortController.abort();
                    reject(new AIAbortError(`${label} was aborted`));
                },
                { once: true }
            );
        }

        promise
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                if (err instanceof AIAbortError) {
                    reject(err);
                } else if (abortController.signal.aborted) {
                    reject(new AIAbortError(`${label} timed out`));
                } else {
                    reject(err);
                }
            });
    });
}

export async function chatCompletion(
    url: string,
    options: AICompletionOptions
): Promise<ChatCompletionResult> {
    const { messages, systemPrompt, signal } = options;

    const activeModel = options.enabledModel.provider.models.find(
        (m) => m.id === options.enabledModel.activeModelId
    );
    const modelLabel = activeModel?.label || 'local-model';

    console.log('ai.ts', modelLabel);

    let toolsSupported: boolean =
        options.supportsTools ?? activeModel?.supportsTools ?? false;
    if (
        options.supportsTools === undefined &&
        activeModel?.supportsTools === undefined
    ) {
        const cacheKey = `${url}:${modelLabel}`;
        if (toolSupportCache.has(cacheKey)) {
            toolsSupported = toolSupportCache.get(cacheKey)!;
        } else {
            toolsSupported = await checkModelToolSupport(url, modelLabel);
            toolSupportCache.set(cacheKey, toolsSupported);
            if (activeModel) {
                options.onToolSupportDetermined?.(
                    activeModel.id,
                    toolsSupported
                );
            }
        }
    }

    const apiMessages = toApiMessages(messages);
    if (systemPrompt) {
        apiMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const tools = toolsSupported ? await getCachedTools() : undefined;
    console.log(
        '[ai.ts] tools available:',
        tools && tools.length > 0
            ? tools.map((tool) => tool.function.name)
            : 'none'
    );

    const controller = new AbortController();
    if (signal) {
        if (signal.aborted) {
            throw new AIAbortError('Request was aborted');
        }
        signal.addEventListener('abort', () => controller.abort(), {
            once: true,
        });
    }

    return runAgenticLoop(url, options, apiMessages, tools, controller.signal);
}

interface StreamingCompletionHandlers {
    onChunk?: (chunk: string) => void;
    onReasoningChunk?: (chunk: string) => void;
    chunkTimeoutMs?: number;
}

async function readStreamingCompletion(
    response: Response,
    handlers: StreamingCompletionHandlers
): Promise<RoundResult> {
    const { onChunk, onReasoningChunk, chunkTimeoutMs = 120_000 } = handlers;

    if (!response.body) {
        return readJsonCompletion(response);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let lineBuffer = '';
    let content = '';
    let reasoning = '';
    let usage: ChatCompletionResult['usage'] = null;
    const streamedToolCalls: Record<
        number,
        {
            id?: string;
            type: string;
            function: { name: string; arguments: string };
        }
    > = {};

    const handleLine = (rawLine: string) => {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) return;

        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') return;

        let parsed: {
            usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
            };
            choices?: {
                delta?: {
                    content?: string;
                    reasoning_content?: string;
                    reasoning?: string;
                    tool_calls?: {
                        index?: number;
                        id?: string;
                        type?: string;
                        function?: { name?: string; arguments?: string };
                    }[];
                };
            }[];
        };
        try {
            parsed = JSON.parse(data);
        } catch {
            return;
        }

        if (parsed.usage) {
            usage = {
                prompt_tokens: parsed.usage.prompt_tokens ?? 0,
                completion_tokens: parsed.usage.completion_tokens ?? 0,
                total_tokens: parsed.usage.total_tokens ?? 0,
            };
        }

        const delta = parsed.choices?.[0]?.delta;
        if (!delta) return;

        if (delta.content) {
            content += delta.content;
            onChunk?.(delta.content);
        }

        const reasoningDelta = delta.reasoning_content || delta.reasoning || '';
        if (reasoningDelta) {
            reasoning += reasoningDelta;
            onReasoningChunk?.(reasoningDelta);
        }

        if (Array.isArray(delta.tool_calls)) {
            console.log('[delta tools]', delta.tool_calls);
            for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!streamedToolCalls[idx]) {
                    streamedToolCalls[idx] = {
                        id: tc.id || `call_${idx}_${Date.now()}`,
                        type: tc.type || 'function',
                        function: {
                            name: tc.function?.name || '',
                            arguments: '',
                        },
                    };
                }
                const accumulated = streamedToolCalls[idx];
                if (tc.id) {
                    accumulated.id = tc.id;
                }
                const nameFragment = tc.function?.name;
                if (nameFragment) {
                    if (!accumulated.function.name) {
                        accumulated.function.name = nameFragment;
                    } else if (
                        !nameFragment.startsWith(accumulated.function.name) &&
                        !accumulated.function.name.endsWith(nameFragment)
                    ) {
                        accumulated.function.name += nameFragment;
                    }
                }
                if (tc.function?.arguments) {
                    accumulated.function.arguments += tc.function.arguments;
                }
            }
        }
    };

    while (true) {
        const readPromise = reader.read();
        const result = await Promise.race([
            readPromise,
            new Promise<{ done: true; value: undefined }>((_, reject) => {
                const timer = setTimeout(() => {
                    reader.cancel().catch(() => {});
                    reject(
                        new AIAbortError(
                            `No data received for ${Math.round(chunkTimeoutMs / 1000)}s, stream may be stuck`
                        )
                    );
                }, chunkTimeoutMs);
                readPromise
                    .then(() => clearTimeout(timer))
                    .catch(() => clearTimeout(timer));
            }),
        ]);

        if (result.done) break;

        lineBuffer += decoder.decode(result.value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const line of lines) handleLine(line);
    }

    lineBuffer += decoder.decode();
    if (lineBuffer.trim()) handleLine(lineBuffer);

    return {
        content,
        reasoning,
        toolCalls: Object.values(streamedToolCalls),
        usage,
    };
}

async function readJsonCompletion(response: Response): Promise<RoundResult> {
    const result: ChatCompletionResponse = await response.json();
    const message = result.choices?.[0]?.message;

    return {
        content: message?.content || '',
        reasoning: message?.reasoning_content || message?.reasoning || '',
        toolCalls: message?.tool_calls ?? [],
        usage: result.usage ?? null,
    };
}

async function runCompletionRound(
    url: string,
    request: ChatCompletionRequest,
    options: AICompletionOptions,
    signal?: AbortSignal
): Promise<RoundResult> {
    const response = await withTimeout(
        fetch(`${url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            signal,
        }),
        options.connectTimeoutMs ?? 30_000,
        signal,
        'Connection'
    );

    if (!response.ok) {
        const error = await response.text();
        console.error(
            '[ai.ts] AI request failed:',
            response.status,
            error,
            request
        );
        throw new Error(`AI request failed: ${response.status} ${error}`);
    }

    if (options.onChunk && response.body) {
        return readStreamingCompletion(response, {
            onChunk: options.onChunk,
            onReasoningChunk: options.onReasoningChunk,
            chunkTimeoutMs: options.chunkTimeoutMs,
        });
    }

    return readJsonCompletion(response);
}

async function runAgenticLoop(
    url: string,
    options: AICompletionOptions,
    apiMessages: ApiMessage[],
    tools: LLMTool[] | undefined,
    signal?: AbortSignal
): Promise<ChatCompletionResult> {
    const { onChunk, onToolStep } = options;
    const rpc = getRPC();

    const activeModel = options.enabledModel.provider.models.find(
        (m) => m.id === options.enabledModel.activeModelId
    );
    const modelLabel = activeModel?.label || 'local-model';

    const configuredRounds = options.maxToolRounds ?? 10;
    const maxRounds = configuredRounds <= 0 ? Infinity : configuredRounds;

    let content = '';
    let reasoning = '';
    let usage: ChatCompletionResult['usage'] = null;

    let round = 0;
    for (; round < maxRounds; round++) {
        const request: ChatCompletionRequest = {
            model: modelLabel,
            messages: apiMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stream: !!onChunk,
            ...(tools && tools.length > 0 ? { tools } : {}),
        };

        console.log(
            `[ai.ts] round ${round + 1}${maxRounds === Infinity ? '' : `/${maxRounds}`}`,
            JSON.stringify({
                model: request.model,
                messages: request.messages.length,
                tools: tools?.length ?? 0,
            })
        );

        const roundResult = await runCompletionRound(
            url,
            request,
            options,
            signal
        );

        content += roundResult.content;
        reasoning += roundResult.reasoning;
        usage = roundResult.usage ?? usage;

        if (roundResult.toolCalls.length === 0) break;

        console.log('[toolCalls]', roundResult.toolCalls);

        // Add assistant message with tool calls to conversation history.
        apiMessages.push({
            role: 'assistant',
            content: roundResult.content || null,
            tool_calls: roundResult.toolCalls,
        });

        for (const toolCall of roundResult.toolCalls) {
            const toolName = toolCall.function.name;
            console.log('[toolName]', toolName);
            const toolStepId = toolCall.id ?? crypto.randomUUID();
            const rawArguments =
                typeof toolCall.function.arguments === 'string'
                    ? toolCall.function.arguments
                    : JSON.stringify(toolCall.function.arguments ?? {});

            onToolStep?.({
                type: 'tool',
                id: toolStepId,
                name: toolName,
                arguments: rawArguments,
                status: 'running',
            });

            let toolArgs: Record<string, unknown> = {};

            if (typeof toolCall.function.arguments === 'string') {
                try {
                    toolArgs = JSON.parse(toolCall.function.arguments);
                } catch {
                    toolArgs = {};
                }
            } else if (
                typeof toolCall.function.arguments === 'object' &&
                toolCall.function.arguments !== null
            ) {
                toolArgs = toolCall.function.arguments as Record<
                    string,
                    unknown
                >;
            }

            console.log(
                `[ai.ts] Executing tool '${toolName}' with arguments:`,
                toolArgs
            );

            let resultText: string;
            let toolStatus: ToolStep['status'] = 'completed';
            try {
                const execResult = await rpc.request['ai:execute-tool']({
                    name: toolName,
                    arguments: toolArgs,
                });

                if (execResult?.content && Array.isArray(execResult.content)) {
                    resultText = execResult.content
                        .map(
                            (item: { text?: string; [k: string]: unknown }) =>
                                item.text || JSON.stringify(item)
                        )
                        .join('\n');
                } else {
                    resultText = JSON.stringify(execResult);
                }
            } catch (error) {
                console.error(
                    `[ai.ts] Error executing tool '${toolName}':`,
                    error
                );
                toolStatus = 'error';
                resultText = `Error executing tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`;
            }

            console.log(`[ai.ts] Tool '${toolName}' result:`, resultText);

            onToolStep?.({
                type: 'tool',
                id: toolStepId,
                name: toolName,
                arguments: rawArguments,
                result: resultText,
                status: toolStatus,
            });

            // Add tool execution result to conversation history.
            apiMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolName,
                content: resultText,
            });
        }
    }

    if (round >= maxRounds) {
        console.warn(
            `[ai.ts] Reached the maximum of ${maxRounds} tool rounds, returning partial result`
        );
    }

    return {
        content,
        reasoning_content: reasoning || undefined,
        usage,
    };
}

export async function generateCompletion(
    endpoint: string,
    enabledModel: {
        provider: Provider;
        activeModelId?: string;
    },
    prompt: string,
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<ChatCompletionResult> {
    const msg: UserChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        mode: 'assistant',
        timestamp: new Date().toISOString(),
    };
    return chatCompletion(endpoint, {
        enabledModel,
        messages: [msg],
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
    });
}

export async function streamCompletion(
    endpoint: string,
    enabledModel: {
        provider: Provider;
        activeModelId?: string;
    },
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<ChatCompletionResult> {
    const msg: UserChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        mode: 'assistant',
        timestamp: new Date().toISOString(),
    };
    return chatCompletion(endpoint, {
        enabledModel,
        messages: [msg],
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        onChunk,
    });
}

export async function checkProviderConnection(
    endpoint: string = 'http://localhost:1234'
): Promise<boolean> {
    try {
        const response = await fetch(`${endpoint}/models`);
        return response.ok;
    } catch {
        return false;
    }
}

export async function getModelsFromProvider(
    endpoint: string = 'http://localhost:1234'
): Promise<Model[]> {
    try {
        const response = await fetch(`${endpoint}/models`);
        if (!response.ok) return [];
        const data = await response.json();
        console.log('data', data);
        return (
            data.data?.map((m: Model) => {
                const model: Model = {
                    id: crypto.randomUUID().slice(0, 8),
                    label: m.id,
                    labelType: false,
                    favorite: false,
                    enabled: false,
                    active: false,
                };
                return model;
            }) || []
        );
    } catch {
        return [];
    }
}

export async function getCurrentlyLoadedModelInProvider(
    provider: Provider,
    modelName: string
) {
    const baseURL = provider.url.base.replace(/\/$/, '');
    console.log('modelName', modelName, baseURL);

    const response = await fetch(`${baseURL}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName,
        }),
    });

    if (response.ok) {
        console.log(`Model ${modelName} loaded successfully.`);
        return true;
    } else {
        console.error('Failed to initialize model:', response.statusText);
        return false;
    }

    /*

    const baseURL = provider.url.base
    const getPSEndPoint = provider.url.endpoint.type === 'lm-studio' ? '/api/ps' : '/api/generate';

    console.log("baseURL", baseURL)
    try {
        const response = await fetch(baseURL + getPSEndPoint)

        if (!response.ok) {
            console.log("model loading")
            throw new Error(
                `HTTP error! Status: ${response.status}`
            );
        }

        return {
            status: 'success',
        }
    }
    catch (error) {
        console.error('Failed to fetch data:', error);
        return {
            status: error
        }
    }
        */
}

export const toolSupportCache = new Map<string, boolean>();

export async function checkModelToolSupport(
    endpoint: string,
    modelLabel: string
): Promise<boolean> {
    try {
        const testRequest = {
            model: modelLabel,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'probe_tool_support',
                        description: 'Probe tool capability',
                        parameters: {
                            type: 'object',
                            properties: {},
                        },
                    },
                },
            ],
        };

        const res = await fetch(`${endpoint}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testRequest),
        });

        if (res.ok) {
            return true;
        }

        const errorText = await res.text();
        const lower = errorText.toLowerCase();
        if (
            res.status === 400 ||
            res.status === 422 ||
            lower.includes('tool') ||
            lower.includes('function')
        ) {
            return false;
        }

        return false;
    } catch (e) {
        console.warn('Failed to probe tool support for model:', modelLabel, e);
        return false;
    }
}

let cachedLLMTools: LLMTool[] | null = null;

export async function getCachedTools(): Promise<LLMTool[]> {
    if (!cachedLLMTools) {
        try {
            const rpc = getRPC();
            const res = await rpc.request['ai:get-tools']();
            cachedLLMTools = res || [];
            console.log('ctools', res);
        } catch (error) {
            console.warn('Failed to load AI tools from RPC:', error);
            return [];
        }
    }
    return cachedLLMTools ?? [];
}
