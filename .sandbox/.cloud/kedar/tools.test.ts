/// <reference types="bun-types" />
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { mcpServer } from '../../../src/bun/services/mcp/server';
import './tools.js';
import { sqlite } from './McpIndex.js';
import { mock } from 'bun:test';

mock.module('../core/BrowserWindow', () => ({
    BrowserWindow: class MockBrowserWindow {
        constructor() { }
        close() { }
    },
}));

async function runTest() {
    console.log('🧪 Starting MCP Tool Test...');

    try {
        sqlite.run(`CREATE TABLE IF NOT EXISTS characters(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projectid TEXT NOT null,
            name TEXT not null,
            filepath TEXT,
            templatedata TEXT
            );`);
        sqlite.run(`CREATE TABLE IF NOT EXISTS story_beats (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			chapter_id TEXT REFERENCES chapters(id),
			beat_type TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			order_index INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);`);
        const [clientTransport, serverTransport] =
            InMemoryTransport.createLinkedPair();

        const client = new Client({
            name: 'test-harness',
            version: '1.0.0',
        });

        await mcpServer.connect(serverTransport);
        await client.connect(clientTransport);

        console.log('test tools');
        const toolsList = await client.listTools();
        console.log();
        console.log(
            '📦 Registered Tools:',
            toolsList.tools.map((t) => t.name)
        );

        const createStoryBeat = await client.callTool({
            name: 'create_story_beat',
            arguments: {
                title: 'Investigation',
                description: 'theif caught in the bank',
            },
        })

        console.log('Result', createStoryBeat)

        /*
        console.log();
        console.log('🚀 Invoking "create_entry"...');
        const result = await client.callTool({
            name: 'create_entry',
            arguments: {
                projectId: crypto.randomUUID().split('-')[0],
                category: 'character',
                data: JSON.stringify({
                    id: crypto.randomUUID().split('-')[0],
                    name: 'Test Hero',
                    bio: 'A brave adventurer',
                }),
            },
        });
        console.log();
        console.log('✅ Result from Tool:', JSON.stringify(result, null, 2));
        const createToolCall = await client.callTool({
            name: 'create_character',
            arguments: {
                id: 1234,
                projectId: 'proj',
                name: 'car',
                filePath: 'null',
                templateData: 'null',
            },
        });
        console.log('character created', createToolCall);

        const updateToolCall = await client.callTool({
            name: 'update_character',
            arguments: {
                id: 1234,
                name: 'bike',
            },
        });
        console.log('character updated', updateToolCall);

        const getToolCall = await client.callTool({
            name: 'get_character',
            arguments: {
                id: 1234,
            },
        });
        console.log('character details', getToolCall);

        const deleteToolCall = await client.callTool({
            name: 'delete_character',
            arguments: {
                id: 1234,
            },
        });
        console.log('character deleted with id', deleteToolCall);
        process.exit(0);
 
*/
    } catch (error) {
        console.log('Test failed', error);
    }
}

runTest().catch((error) => {
    console.log();
    console.error('❌ Test failed:', error);
    process.exit(1);
});
