import { sqlite } from '.';
import { TemplateFieldRecord } from '../../shared/types';

export function parseFieldList(raw: unknown): TemplateFieldRecord[] {
    if (typeof raw !== 'string' || !raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function columnExists(table: string, column: string): boolean {
    const cols = sqlite.query(`PRAGMA table_info(${table})`).all() as {
        name: string;
    }[];
    return cols.some((c) => c.name === column);
}
