import { BrowserView } from 'electrobun';
import {
    CallToolResultSchema,
    ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { mcpServer } from '../services/mcp/server';

//import { mcpServer } from './mcp/Server';

export interface ProcessAiPromptParams {
    prompt: string;
    model?: string; // "llama3.2:3b"
}

export interface ExecuteMcpToolParams {
    toolName: string;
    args?: Record<string, unknown>;
}

// 1. Explicitly typed AppRPC contract for seamless frontend consumption
export type AppRPC = {
    bun: {
        requests: {
            executeMcpTool: {
                params: ExecuteMcpToolParams;
                response: unknown;
            };
            listMcpTools: {
                params: void;
                response: unknown[];
            };
            processAiPrompt: {
                params: ProcessAiPromptParams;
                response: { text: string };
            };
        };
        messages: Record<string, never>;
    };
    webview: {
        requests: Record<string, never>;
        messages: Record<string, never>;
    };
};

export const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat';

export const MCPrpc = BrowserView.defineRPC<AppRPC>({
    handlers: {
        requests: {
            /*
             * Phase 2: AI Natural Language Prompt Handler
             * Direct fetch implementation for local Ollama instance
             */

            processAiPrompt: async (params: ProcessAiPromptParams) => {
                const payload = params;

                if (!payload || typeof payload.prompt !== 'string') {
                    throw new Error(
                        "Invalid RPC payload: 'prompt' string is required"
                    );
                }

                const { prompt, model = 'llama3.2:3b' } = payload;

                // 1. Retrieve all registered tools from mcpServer
                const mcpToolsResult = await mcpServer.server.request(
                    { method: 'tools/list', params: {} },
                    ListToolsResultSchema
                );

                // 2. Map MCP tools to Ollama's expected JSON format
                const ollamaTools = mcpToolsResult.tools.map((tool) => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema,
                    },
                }));

                // 3. Make direct HTTP request to Ollama API
                const response = await fetch(OLLAMA_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        tools: ollamaTools,
                        stream: false, // Stream false for simple JSON parsing
                    }),
                });

                if (!response.ok) {
                    throw new Error(
                        `Ollama API Error (${response.status}): ${await response.text()}`
                    );
                }

                const data = await response.json();
                const message = data.message;

                // 4. Check if Ollama emitted tool execution requests
                if (message?.tool_calls && message.tool_calls.length > 0) {
                    const executionResults: string[] = [];

                    for (const call of message.tool_calls) {
                        const toolName = call.function.name;
                        const toolArgs = call.function.arguments;

                        // Execute the requested MCP tool on SQLite via mcpServer
                        const result = await mcpServer.server.request(
                            {
                                method: 'tools/call',
                                params: {
                                    name: toolName,
                                    arguments: toolArgs,
                                },
                            },
                            CallToolResultSchema
                        );

                        executionResults.push(
                            `Executed '${toolName}': ${JSON.stringify(result.content)}`
                        );
                    }

                    return {
                        text: message.content
                            ? `${message.content}\n\n${executionResults.join('\n')}`
                            : executionResults.join('\n'),
                    };
                }

                // Return Ollama's conversational response if no tools were called
                return {
                    text:
                        message?.content ||
                        'Prompt processed without tool calls',
                };
            },

            executeMcpTool: async (params) => {
                const payload = params as ExecuteMcpToolParams;
                if (!payload || typeof payload.toolName !== 'string') {
                    throw new Error(
                        "Invalid RPC payload: 'toolName' is required."
                    );
                }

                return await mcpServer.server.request(
                    {
                        method: 'tools/call',
                        params: {
                            name: payload.toolName,
                            arguments: payload.args || {},
                        },
                    },
                    CallToolResultSchema
                );
            },

            listMcpTools: async () => {
                const result = await mcpServer.server.request(
                    { method: 'tools/list', params: {} },
                    ListToolsResultSchema
                );
                return result.tools;
            },
        },
    },
});
