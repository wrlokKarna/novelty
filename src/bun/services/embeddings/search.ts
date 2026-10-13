import { sqliteVecAvailable, rawSqlite } from '../../database/index';
import { createEmbeddingProvider } from './provider';
import type { EmbeddingSettings } from '../../../mainview/types';

export interface SearchOptions {
    projectId: string;
    query: string;
    topK?: number;
    entityTypes?: string[];
    minScore?: number;
}

export interface SearchResult {
    entityId: string;
    entityType: string;
    chunkText: string;
    score: number;
    tokenCount: number;
}

export async function semanticSearch(
    settings: EmbeddingSettings,
    options: SearchOptions
): Promise<SearchResult[]> {
    if (!sqliteVecAvailable) {
        console.warn('sqlite-vec not available, skipping semantic search');
        return [];
    }

    const { projectId, query, topK = 10, entityTypes, minScore } = options;

    const provider = createEmbeddingProvider(settings);
    const queryVector = (await provider.embed([query]))[0];

    if (!queryVector || queryVector.length === 0) {
        return [];
    }

    const vectorParam = new Float32Array(queryVector);

    const vecResults = rawSqlite
        .prepare(
            `SELECT rowid, distance FROM embeddings_vec WHERE embedding MATCH ? ORDER BY distance LIMIT ?`
        )
        .all(vectorParam, topK * 3) as { rowid: number; distance: number }[];

    if (vecResults.length === 0) return [];

    const rowIds = vecResults.map((r) => r.rowid);
    const distanceMap = new Map(vecResults.map((r) => [r.rowid, r.distance]));

    const placeholders = rowIds.map(() => '?').join(',');
    const metaRows = rawSqlite
        .prepare(
            `
		SELECT rowid, entity_type AS entityType, entity_id AS entityId,
		       chunk_text AS chunkText, token_count AS tokenCount
		FROM embeddings
		WHERE rowid IN (${placeholders}) AND project_id = ?
	`
        )
        .all(...rowIds, projectId) as any[];

    const results: SearchResult[] = [];

    for (const meta of metaRows) {
        if (
            entityTypes &&
            entityTypes.length > 0 &&
            !entityTypes.includes(meta.entityType)
        ) {
            continue;
        }

        const distance = distanceMap.get(meta.rowid) ?? 1;
        const score = 1 - distance;

        if (minScore !== undefined && score < minScore) continue;

        results.push({
            entityId: meta.entityId,
            entityType: meta.entityType,
            chunkText: meta.chunkText,
            score,
            tokenCount: meta.tokenCount,
        });
    }

    results.sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const deduplicated: SearchResult[] = [];
    for (const r of results) {
        const key = `${r.entityType}:${r.entityId}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduplicated.push(r);
        }
    }

    return deduplicated.slice(0, topK);
}
