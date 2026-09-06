import type { Provider } from '../types/index';
import { Model } from '../utils/ai/providerHelpers';

export interface ApiMessage {
    role: string;
    content: string;
}

export interface UserChatMessage {
    id: string;
    role: 'user';
    content: string;
    mode: 'assistant' | 'editor';
    timestamp: string;
}

export interface AssistantChatMessage {
    id: string;
    role: 'assistant';
    content: string[];
    reasoning?: string;
    currentVariantIndex: number;
    model: string;
    mode: 'assistant' | 'editor';
    timestamp: string;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage;

export function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
    return messages.map((m) => ({
        role: m.role,
        content:
            m.role === 'assistant'
                ? m.content[m.currentVariantIndex]
                : m.content,
    }));
}

export interface ChatCompletionRequest {
    model: string;
    messages: ApiMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
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
            content: string;
            reasoning_content?: string;
            reasoning?: string;
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
    signal?: AbortSignal;
    connectTimeoutMs?: number;
    chunkTimeoutMs?: number;
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
    const {
        messages,
        temperature = 0.7,
        maxTokens = 2048,
        onChunk,
        onReasoningChunk,
        systemPrompt,
        signal,
        connectTimeoutMs = 30_000,
        chunkTimeoutMs = 120_000,
    } = options;

    const modelLabel =
        options.enabledModel.provider.models.find(
            (m) => m.id === options.enabledModel.activeModelId
        )?.label || 'local-model';

    console.log('ai.ts', modelLabel);

    const apiMessages = toApiMessages(messages);
    if (systemPrompt) {
        apiMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const request: ChatCompletionRequest = {
        model: modelLabel,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: !!onChunk,
    };

    const controller = new AbortController();
    if (signal) {
        if (signal.aborted) {
            throw new AIAbortError('Request was aborted');
        }
        signal.addEventListener('abort', () => controller.abort(), {
            once: true,
        });
    }

    const response = await withTimeout(
        fetch(`${url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            signal: controller.signal,
        }),
        connectTimeoutMs,
        signal,
        'Connection'
    );

    if (!response.ok) {
        const error = await response.text();
        console.log('ai.ts', error);
        console.log('ai.ts', response);
        console.log('ai.ts', request);
        throw new Error(`AI request failed: ${response.status} ${error}`);
    }

    if (onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let fullReasoning = '';
        let usage: ChatCompletionResult['usage'] = null;

        const chunkTimeout = chunkTimeoutMs;

        while (true) {
            const readPromise = reader.read();
            const result = await Promise.race([
                readPromise,
                new Promise<{ done: true; value: undefined }>((_, reject) => {
                    const timer = setTimeout(() => {
                        reader.cancel().catch(() => {});
                        reject(
                            new AIAbortError(
                                `No data received for ${Math.round(chunkTimeout / 1000)}s, stream may be stuck`
                            )
                        );
                    }, chunkTimeout);
                    readPromise
                        .then(() => clearTimeout(timer))
                        .catch(() => clearTimeout(timer));
                }),
            ]);

            if (result.done) break;
            const { value } = result;

            const chunk = decoder.decode(value);
            const lines = chunk
                .split('\n')
                .filter((line) => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.usage) {
                            usage = {
                                prompt_tokens: parsed.usage.prompt_tokens ?? 0,
                                completion_tokens:
                                    parsed.usage.completion_tokens ?? 0,
                                total_tokens: parsed.usage.total_tokens ?? 0,
                            };
                        }
                        const content =
                            parsed.choices?.[0]?.delta?.content || '';
                        const reasoning =
                            parsed.choices?.[0]?.delta?.reasoning_content ||
                            parsed.choices?.[0]?.delta?.reasoning ||
                            '';
                        fullContent += content;
                        if (reasoning) {
                            fullReasoning += reasoning;
                            onReasoningChunk?.(reasoning);
                        }
                        onChunk?.(content);
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        return {
            content: fullContent,
            reasoning_content: fullReasoning || undefined,
            usage,
        };
    }

    const result: ChatCompletionResponse = await response.json();
    return {
        content: result.choices[0]?.message?.content || '',
        reasoning_content:
            result.choices[0]?.message?.reasoning_content ||
            result.choices[0]?.message?.reasoning ||
            undefined,
        usage: result.usage ?? null,
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
