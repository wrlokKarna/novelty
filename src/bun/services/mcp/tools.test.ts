import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { mcpServer } from './server';
import './tools.js';

async function runTest() {
    console.log('🧪 Starting MCP Tool Test...');

    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

    const client = new Client({
        name: 'test-harness',
        version: '1.0.0',
    });

    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);

    const toolsList = await client.listTools();
    console.log();
    console.log(
        '📦 Registered Tools:',
        toolsList.tools.map((t) => t.name)
    );
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
    process.exit(0);
}

runTest().catch((error) => {
    console.log();
    console.error('❌ Test failed:', error);
    process.exit(1);
});
