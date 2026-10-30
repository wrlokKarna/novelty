import type { Database } from 'bun:sqlite';
import { mkdirSync, existsSync } from 'fs';

import type { TemplateFieldRecord } from '../../shared/types';

export function ensureDirectory(path: string): void {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
}

export const SQLITE_PATHS = {
    darwin: [
        '/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib',
        '/usr/local/opt/sqlite/lib/libsqlite3.dylib',
    ] as const,
} as const;

export function resolveSqliteLibraryPath(): string | null {
    const platformPaths =
        SQLITE_PATHS[process.platform as keyof typeof SQLITE_PATHS];

    if (!platformPaths) return null;

    for (const path of platformPaths) {
        if (existsSync(path)) {
            return path;
        }
    }

    return null;
}

export function ensureVecTable(
    sqlite: Database,
    sqliteVecAvailable: boolean,
    dimension: number
): void {
    if (!sqliteVecAvailable) return;
    try {
        const info = sqlite
            .prepare(
                `SELECT sql FROM sqlite_master WHERE name = 'embeddings_vec'`
            )
            .get() as any;
        if (info && info.sql) {
            const match = info.sql.match(/float\[(\d+)\]/);
            if (match) {
                const currentDim = parseInt(match[1]);
                if (currentDim !== dimension) {
                    console.log(
                        `Dimension mismatch (${currentDim} vs ${dimension}), recreating embeddings_vec`
                    );
                    sqlite.exec(`DROP TABLE embeddings_vec`);
                }
            }
        }
    } catch {
        // Table might not exist yet, that's fine
    }
    try {
        sqlite.exec(
            `CREATE VIRTUAL TABLE IF NOT EXISTS embeddings_vec USING vec0(embedding float[${dimension}])`
        );
        console.log(
            `embeddings_vec virtual table ready with dimension ${dimension}`
        );
    } catch (err: any) {
        console.warn('Failed to create embeddings_vec virtual table:', err);
    }
}

export function parseFieldList(raw: unknown): TemplateFieldRecord[] {
    if (typeof raw !== 'string' || !raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function columnExists(
    sqlite: Database,
    table: string,
    column: string
): boolean {
    const cols = sqlite.query(`PRAGMA table_info(${table})`).all() as {
        name: string;
    }[];
    return cols.some((c) => c.name === column);
}
