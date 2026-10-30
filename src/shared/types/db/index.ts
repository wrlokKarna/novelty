import type { Database } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type * as schema from '../../../shared/schema';

export type SQLiteDB = BunSQLiteDatabase<typeof schema> & {
    $client: Database;
};
