import { existsSync } from 'fs';
import { join } from 'path';
import { Database } from 'bun:sqlite';
import { Utils } from 'electrobun';

import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as sqliteVec from 'sqlite-vec';

import * as schema from '../../shared/schema';
import { ensureDirectory } from '@/bun/database/utils';

export const dbPath = join(Utils.paths.userData, 'novelty.db');
export const dbDir = Utils.paths.userData;

ensureDirectory(dbDir);

console.log('Database path:', dbPath);
console.log('Database directory:', dbDir);

let sqliteVecAvailable = false;

if (process.platform === 'darwin') {
    try {
        const homebrewPaths = [
            '/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib',
            '/usr/local/opt/sqlite/lib/libsqlite3.dylib',
        ];
        for (const p of homebrewPaths) {
            if (existsSync(p)) {
                Database.setCustomSQLite(p);
                break;
            }
        }
    } catch {
        console.warn(
            'Could not set custom SQLite on macOS, using system SQLite. Vector features may be unavailable.'
        );
    }
}

export const sqlite = new Database(dbPath);

try {
    sqliteVec.load(sqlite);
    sqliteVecAvailable = true;
    console.log('sqlite-vec loaded successfully');
} catch (err) {
    console.warn(
        'Failed to load sqlite-vec extension. Vector features will be unavailable.',
        err
    );
}

export { sqliteVecAvailable };

export const db = drizzle(sqlite, { schema });

export { sqlite as rawSqlite };
