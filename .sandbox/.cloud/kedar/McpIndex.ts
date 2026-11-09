/// <reference types="bun-types" />

import { mkdirSync } from 'fs';
import { join } from 'path';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './McpSchema';

const dbDir = join(import.meta.dir, '../../.tmp');
mkdirSync(dbDir, { recursive: true });

export const sqlite = new Database(join(dbDir, 'novelty_test.db'));
console.log('Mcpindex ');

const appSettings = Bun.file(join(dbDir, 'settings.json'));
(async () => {
    if (await appSettings.exists()) {
        console.log('as', await appSettings.json());
    } else {
        console.log('settings.json not found yet');
    }
})();

export const db = drizzle(sqlite, { schema });
