import { createHash } from 'crypto';
import {
    db,
    sqliteVecAvailable,
    rawSqlite,
    ensureVecTable,
} from '../../database/index';
import * as schema from '../../schema/index';
import { embeddings } from '../../schema/index';
import { eq, and } from 'drizzle-orm';
import { createEmbeddingProvider } from './provider';
import { chunkHtml, chunkText, type TextChunk } from './chunker';
import type { EmbeddingSettings } from '../../../mainview/types';

const ENTITY_TYPES = [
    'chapter',
    'character',
    'location',
    'organization',
    'item',
    'lore',
    'plot_thread',
    'story_beat',
    'scratch_note',
] as const;
type EntityType = (typeof ENTITY_TYPES)[number];

function computeHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

function serializeEntityData(entityType: string, entity: any): string {
    switch (entityType) {
        case 'chapter':
            return entity.content || '';
        case 'character':
        case 'location':
        case 'organization':
        case 'item':
        case 'lore':
            return serializeTemplateData(entity.name, entity.templateData);
        case 'plot_thread':
            return `${entity.name}\n\n${entity.description || ''}`;
        case 'story_beat':
            return `${entity.title}: ${entity.description || ''}`;
        case 'scratch_note':
            return entity.content || '';
        default:
            return '';
    }
}

function serializeTemplateData(
    name: string,
    templateData: string | null
): string {
    if (!templateData) return name;
    try {
        const data = JSON.parse(templateData);
        const lines = [name];
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined && value !== '') {
                const displayKey = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                lines.push(
                    `${displayKey}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`
                );
            }
        }
        return lines.join('\n');
    } catch {
        return name;
    }
}

function extractEntities(entityType: EntityType, projectId: string): any[] {
    const tableMap: Record<string, any> = {
        chapter: schema.chapters,
        character: schema.characters,
        location: schema.locations,
        organization: schema.organizations,
        item: schema.items,
        lore: schema.loreEntries,
        plot_thread: schema.plotThreads,
        story_beat: schema.storyBeats,
        scratch_note: schema.scratchNotes,
    };
    const table = tableMap[entityType];
    if (!table) return [];
    return db.select().from(table).where(eq(table.projectId, projectId)).all();
}

export interface IndexResult {
    indexed: number;
    skipped: number;
    failed: number;
    totalChunks: number;
}

export async function indexProject(
    projectId: string,
    settings: EmbeddingSettings,
    onProgress?: (pct: number, msg: string) => void
): Promise<IndexResult> {
    if (!sqliteVecAvailable) {
        throw new Error(
            'sqlite-vec is not available. Vector features are disabled.'
        );
    }

    ensureVecTable(settings.dimension);

    const provider = createEmbeddingProvider(settings);
    const result: IndexResult = {
        indexed: 0,
        skipped: 0,
        failed: 0,
        totalChunks: 0,
    };

    const entityTypeList: EntityType[] = [
        'chapter',
        'character',
        'location',
        'organization',
        'item',
        'lore',
        'plot_thread',
        'story_beat',
        'scratch_note',
    ];
    const totalEntityTypes = entityTypeList.length;

    for (let ti = 0; ti < entityTypeList.length; ti++) {
        const entityType = entityTypeList[ti];
        onProgress?.(
            Math.round((ti / totalEntityTypes) * 100),
            `Processing ${entityType} entries...`
        );

        try {
            const entities = extractEntities(entityType, projectId);

            for (const entity of entities) {
                const text = serializeEntityData(entityType, entity);
                if (!text.trim()) {
                    result.skipped++;
                    continue;
                }

                const chunks =
                    entityType === 'chapter'
                        ? chunkHtml(
                              text,
                              settings.chunkSize,
                              settings.chunkOverlap
                          )
                        : chunkText(
                              text,
                              settings.chunkSize,
                              settings.chunkOverlap
                          );

                const existingRows = db
                    .select()
                    .from(embeddings)
                    .where(
                        and(
                            eq(embeddings.projectId, projectId),
                            eq(embeddings.entityType, entityType),
                            eq(embeddings.entityId, entity.id)
                        )
                    )
                    .all();

                const existingMap = new Map(
                    existingRows.map((r: any) => [r.chunkIndex, r])
                );

                const toEmbed: {
                    chunk: TextChunk;
                    index: number;
                    hash: string;
                }[] = [];

                for (let ci = 0; ci < chunks.length; ci++) {
                    const chunk = chunks[ci];
                    const hash = computeHash(chunk.text);
                    const existing = existingMap.get(ci);

                    if (existing && existing.contentHash === hash) {
                        result.skipped++;
                        continue;
                    }

                    toEmbed.push({ chunk, index: ci, hash });
                }

                if (toEmbed.length === 0) continue;

                const textsToEmbed = toEmbed.map((t) => t.chunk.text);
                let vectors: number[][];

                try {
                    vectors = await provider.embed(textsToEmbed);
                } catch (err) {
                    console.error(
                        `Failed to embed chunks for ${entityType}:${entity.id}`,
                        err
                    );
                    result.failed += toEmbed.length;
                    continue;
                }

                for (let vi = 0; vi < toEmbed.length; vi++) {
                    const { chunk, index: chunkIndex, hash } = toEmbed[vi];
                    const vector = vectors[vi];
                    const embeddingId = `${entity.id}_chunk_${chunkIndex}`;

                    const existingRow = db
                        .select()
                        .from(embeddings)
                        .where(eq(embeddings.id, embeddingId))
                        .get();

                    if (existingRow) {
                        db.update(embeddings)
                            .set({
                                contentHash: hash,
                                chunkText: chunk.text,
                                tokenCount: chunk.tokenCount,
                                updatedAt: new Date(),
                            })
                            .where(eq(embeddings.id, embeddingId))
                            .run();

                        const embedRow = rawSqlite
                            .prepare(
                                'SELECT rowid FROM embeddings WHERE id = ?'
                            )
                            .get(embeddingId) as { rowid: number } | undefined;
                        if (embedRow) {
                            const updateStmt = rawSqlite.prepare(
                                `UPDATE embeddings_vec SET embedding = vec_f32(?) WHERE rowid = ?`
                            );
                            updateStmt.run(
                                new Float32Array(vector),
                                embedRow.rowid
                            );
                        }
                    } else {
                        db.insert(embeddings)
                            .values({
                                id: embeddingId,
                                projectId,
                                entityType,
                                entityId: entity.id,
                                contentHash: hash,
                                chunkIndex: chunkIndex,
                                chunkText: chunk.text,
                                tokenCount: chunk.tokenCount,
                            })
                            .run();

                        const embedRow = rawSqlite
                            .prepare('SELECT last_insert_rowid() AS rowid')
                            .get() as { rowid: number };
                        const insertStmt = rawSqlite.prepare(
                            `INSERT INTO embeddings_vec(rowid, embedding) VALUES (?, vec_f32(?))`
                        );
                        insertStmt.run(
                            embedRow.rowid,
                            new Float32Array(vector)
                        );
                    }

                    result.indexed++;
                    result.totalChunks++;
                }
            }
        } catch (err) {
            console.error(`Failed to index ${entityType}:`, err);
            result.failed++;
        }
    }

    onProgress?.(100, 'Indexing complete');
    return result;
}

export function getIndexStatus(projectId: string): {
    total: number;
    byType: Record<string, number>;
} {
    const rows = db
        .select()
        .from(embeddings)
        .where(eq(embeddings.projectId, projectId))
        .all();

    const byType: Record<string, number> = {};
    for (const row of rows) {
        byType[row.entityType] = (byType[row.entityType] || 0) + 1;
    }

    return { total: rows.length, byType };
}

export function deleteEntityEmbeddings(
    entityType: string,
    entityId: string
): void {
    const rows = db
        .select()
        .from(embeddings)
        .where(
            and(
                eq(embeddings.entityType, entityType),
                eq(embeddings.entityId, entityId)
            )
        )
        .all();

    for (const row of rows) {
        rawSqlite
            .prepare(
                `DELETE FROM embeddings_vec WHERE rowid = (SELECT rowid FROM embeddings WHERE id = ?)`
            )
            .run(row.id);
    }

    db.delete(embeddings)
        .where(
            and(
                eq(embeddings.entityType, entityType),
                eq(embeddings.entityId, entityId)
            )
        )
        .run();
}

export function rebuildProjectEmbeddings(
    projectId: string,
    _settings: EmbeddingSettings
): void {
    rawSqlite
        .prepare(
            `DELETE FROM embeddings_vec WHERE rowid IN (SELECT rowid FROM embeddings WHERE project_id = ?)`
        )
        .run(projectId);
    db.delete(embeddings).where(eq(embeddings.projectId, projectId)).run();
}
