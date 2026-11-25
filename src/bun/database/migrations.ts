import type { Database } from 'bun:sqlite';
import { normalizeTreeFields } from '../../mainview/templates/tree';
import type { TemplateFieldRecord } from '../../shared/types';
import { columnExists, parseFieldList } from './utils';

export const SCHEMA_MIGRATIONS = [
    { table: 'story_beats', name: 'in_story_date', type: 'TEXT' },
    {
        table: 'story_beats',
        name: 'date_order',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    { table: 'story_beats', name: 'end_in_story_date', type: 'TEXT' },
    { table: 'story_beats', name: 'end_date_order', type: 'INTEGER' },
    { table: 'story_beats', name: 'entity_type', type: 'TEXT' },
    { table: 'story_beats', name: 'entity_id', type: 'TEXT' },
    {
        table: 'story_beats',
        name: 'event_type',
        type: "TEXT NOT NULL DEFAULT 'story_beat'",
    },
    { table: 'story_beats', name: 'metadata', type: 'TEXT' },
    {
        table: 'story_beats',
        name: 'auto_generated',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    {
        table: 'chapters',
        name: 'status',
        type: "TEXT NOT NULL DEFAULT 'outline'",
    },
    { table: 'chapters', name: 'outline', type: 'TEXT' },
    {
        table: 'chapters',
        name: 'pov_character_id',
        type: 'TEXT REFERENCES characters(id)',
    },
    { table: 'chapters', name: 'word_count_target', type: 'INTEGER' },
    {
        table: 'chapters',
        name: 'act_id',
        type: 'TEXT REFERENCES story_acts(id)',
    },
    {
        table: 'chapters',
        name: 'sequence_id',
        type: 'TEXT REFERENCES story_sequences(id)',
    },
    {
        table: 'story_sequences',
        name: 'chapter_id',
        type: 'TEXT REFERENCES chapters(id)',
    },
    { table: 'projects', name: 'cover_image_id', type: 'TEXT' },
    { table: 'projects', name: 'cover_images_array', type: 'TEXT' },
    { table: 'projects', name: 'project_scope', type: 'TEXT' },
    { table: 'projects', name: 'series_arch', type: 'TEXT' },
    {
        table: 'projects',
        name: 'series_id',
        type: 'TEXT REFERENCES series(id)',
    },
    { table: 'projects', name: 'pov', type: 'TEXT' },
    { table: 'projects', name: 'pacing', type: 'TEXT' },
    { table: 'projects', name: 'work_type', type: 'TEXT' },
    { table: 'projects', name: 'project_structure', type: 'TEXT' },
    { table: 'projects', name: 'target_age', type: 'TEXT' },
    {
        table: 'projects',
        name: 'project_status',
        type: "TEXT NOT NULL DEFAULT 'planning'",
    },
    { table: 'projects', name: 'tonal_type', type: 'TEXT' },
    { table: 'projects', name: 'description', type: 'TEXT' },
    { table: 'projects', name: 'system_prompt', type: 'TEXT' },
    { table: 'characters', name: 'template_data', type: 'TEXT' },
    { table: 'locations', name: 'template_data', type: 'TEXT' },
    { table: 'organizations', name: 'template_data', type: 'TEXT' },
    { table: 'items', name: 'template_data', type: 'TEXT' },
    { table: 'lore_entries', name: 'template_data', type: 'TEXT' },
    {
        table: 'chat_messages',
        name: 'model',
        type: "text Default 'unknown'",
    },
    {
        table: 'chat_messages',
        name: 'mode',
        type: "text NOT NULL Default 'assistant'",
    },
    {
        table: 'chat_messages',
        name: 'currentVariantIndex',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    { table: 'chat_messages', name: 'reasoning', type: 'TEXT' },
    { table: 'chat_messages', name: 'steps', type: 'TEXT' },
    { table: 'chat_messages', name: 'duration_ms', type: 'INTEGER' },
    {
        table: 'chat_sessions',
        name: 'is_archived',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    {
        table: 'chat_sessions',
        name: 'is_manually_named',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    {
        table: 'project_genres',
        name: 'is_primary',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    {
        table: 'projects',
        name: 'content_rating',
        type: "TEXT NOT NULL DEFAULT 'Unrated'",
    },
    { table: 'lore_entries', name: 'file_path', type: 'TEXT' },
    {
        table: 'story_sequences',
        name: 'display_order',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    {
        table: 'story_scenes',
        name: 'display_order',
        type: 'INTEGER NOT NULL DEFAULT 0',
    },
    { table: 'entity_templates', name: 'layout', type: 'TEXT' },
    { table: 'series_templates', name: 'layout', type: 'TEXT' },
    { table: 'plot_threads', name: 'linked_beats', type: 'TEXT' }
];

async function migrateOutlineScenesToStoryScenes(sqlite: Database) {
    try {
        const chapters = sqlite
            .query(
                `SELECT id, project_id, act_id, sequence_id, outline FROM chapters WHERE outline IS NOT NULL`
            )
            .all() as {
                id: string;
                project_id: string | null;
                act_id: string | null;
                sequence_id: string | null;
                outline: string;
            }[];

        for (const chapter of chapters) {
            let parsed: { scenes?: unknown[] } | null = null;
            try {
                parsed = JSON.parse(chapter.outline);
            } catch {
                // outline isn't valid JSON - leave untouched
            }
            const scenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
            if (scenes.length === 0 || !parsed) continue;

            const existing = sqlite
                .query(
                    `SELECT COUNT(*) AS count FROM story_scenes WHERE chapter_id = ?`
                )
                .get(chapter.id) as { count: number };
            if (existing.count > 0) continue;

            const now = Date.now();
            const insertStmt = sqlite.prepare(
                `INSERT INTO story_scenes
					(id, project_id, act_id, sequence_id, chapter_id, title, summary, setting, characters_present, key_events, duration, conflict, status, order_index, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'outline', ?, ?, ?)`
            );
            scenes.forEach((raw, index) => {
                const scene = (raw || {}) as Record<string, unknown>;
                const id =
                    typeof scene.id === 'string' && scene.id
                        ? scene.id
                        : crypto.randomUUID();
                insertStmt.run(
                    id,
                    chapter.project_id,
                    chapter.act_id,
                    chapter.sequence_id,
                    chapter.id,
                    typeof scene.title === 'string' ? scene.title : '',
                    typeof scene.summary === 'string' ? scene.summary : null,
                    typeof scene.setting === 'string' ? scene.setting : null,
                    JSON.stringify(
                        Array.isArray(scene.charactersPresent)
                            ? scene.charactersPresent
                            : []
                    ),
                    JSON.stringify(
                        Array.isArray(scene.keyEvents) ? scene.keyEvents : []
                    ),
                    typeof scene.duration === 'string' ? scene.duration : null,
                    typeof scene.conflict === 'string' ? scene.conflict : null,
                    index,
                    now,
                    now
                );
            });

            const { scenes: _stripped, ...rest } = parsed;
            sqlite
                .prepare(`UPDATE chapters SET outline = ? WHERE id = ?`)
                .run(JSON.stringify(rest), chapter.id);
        }

        const orphanedSequences = sqlite
            .query(`SELECT id FROM story_sequences WHERE chapter_id IS NULL`)
            .all() as { id: string }[];
        for (const seq of orphanedSequences) {
            const firstChapter = sqlite
                .query(
                    `SELECT id FROM chapters WHERE sequence_id = ? ORDER BY order_index ASC LIMIT 1`
                )
                .get(seq.id) as { id: string } | undefined;
            if (firstChapter) {
                sqlite
                    .prepare(
                        `UPDATE story_sequences SET chapter_id = ? WHERE id = ?`
                    )
                    .run(firstChapter.id, seq.id);
            }
        }
    } catch (err) {
        console.warn('Failed to migrate outline scenes:', err);
    }
}

// Moves the retired per-field `order`/`span` properties and the standalone
// `columns` column into a single `layout` JSON blob, then strips them from the
// stored field definitions. Idempotent: a row that already carries a layout is
// skipped, so an interrupted run resumes cleanly. The `columns` column is
// dropped afterwards; fresh databases never create it.
async function migrateTemplateLayouts(sqlite: Database) {
    try {
        const backfill = (
            table: 'entity_templates' | 'series_templates',
            includeColumns: boolean
        ) => {
            if (!columnExists(sqlite, table, 'custom_fields')) return;
            if (!columnExists(sqlite, table, 'layout')) return;
            const hasColumns =
                includeColumns && columnExists(sqlite, table, 'columns');
            const cols = `id, custom_fields, layout${hasColumns ? ', columns' : ''
                }`;
            const rows = sqlite.query(`SELECT ${cols} FROM ${table}`).all() as {
                id: string;
                custom_fields: string | null;
                layout: string | null;
                columns?: number | null;
            }[];

            const update = sqlite.prepare(
                `UPDATE ${table} SET layout = ?, custom_fields = ? WHERE id = ?`
            );

            for (const row of rows) {
                if (row.layout) continue;
                if (!row.custom_fields) continue;
                let fields: Record<string, unknown>[];
                try {
                    const parsed = JSON.parse(row.custom_fields);
                    if (!Array.isArray(parsed)) continue;
                    fields = parsed;
                } catch {
                    continue;
                }
                const hasLegacy = fields.some(
                    (f) => f && ('order' in f || 'span' in f)
                );
                const hasColumnCount = hasColumns && row.columns != null;
                if (!hasLegacy && !hasColumnCount) continue;

                const indexed = fields.map((f, index) => ({ f, index }));
                indexed.sort((a, b) => {
                    const ao =
                        typeof a.f.order === 'number'
                            ? (a.f.order as number)
                            : a.index;
                    const bo =
                        typeof b.f.order === 'number'
                            ? (b.f.order as number)
                            : b.index;
                    return ao === bo ? a.index - b.index : ao - bo;
                });

                const order = indexed
                    .map((x) => x.f.name)
                    .filter((n): n is string => typeof n === 'string');
                const spans: Record<string, number> = {};
                for (const { f } of indexed) {
                    if (
                        typeof f.name === 'string' &&
                        typeof f.span === 'number'
                    ) {
                        spans[f.name] = f.span;
                    }
                }
                const layout = {
                    order,
                    spans,
                    cols: {},
                    rowStarts: {},
                    rowSpans: {},
                    fullWidth: {},
                    columns: hasColumns ? (row.columns ?? null) : null,
                };
                const stripped = indexed.map(({ f }) => {
                    const copy = { ...f };
                    delete copy.order;
                    delete copy.span;
                    return copy;
                });
                update.run(
                    JSON.stringify(layout),
                    JSON.stringify(stripped),
                    row.id
                );
            }
        };

        backfill('entity_templates', true);
        backfill('series_templates', false);

        if (columnExists(sqlite, 'entity_templates', 'columns')) {
            sqlite.exec(`ALTER TABLE entity_templates DROP COLUMN columns`);
            console.log('Migrated template layouts; dropped columns column');
        }
    } catch (err) {
        console.warn('Failed to migrate template layouts:', err);
    }
}

async function migrateGlobalTemplatesAway(sqlite: Database) {
    try {
        const exists = sqlite
            .query(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='global_templates'`
            )
            .get();
        if (!exists) return;

        sqlite.exec('BEGIN');
        try {
            const rows = sqlite
                .query(
                    `SELECT et.id AS id,
                            et.custom_fields AS project_fields,
                            gt.custom_fields AS global_fields,
                            st.custom_fields AS series_fields
                     FROM entity_templates et
                     LEFT JOIN global_templates gt
                            ON gt.id = et.global_template_id
                     LEFT JOIN series_templates st
                            ON st.id = et.series_template_id`
                )
                .all() as {
                    id: string;
                    project_fields: string | null;
                    global_fields: string | null;
                    series_fields: string | null;
                }[];

            const updateStmt = sqlite.prepare(
                `UPDATE entity_templates SET custom_fields = ?, updated_at = ? WHERE id = ?`
            );
            const now = Date.now();
            let flattened = 0;

            for (const row of rows) {
                const fieldMap = new Map<string, TemplateFieldRecord>();

                // Mirror the pre-removal resolve order exactly:
                // global -> series -> project, so the flattened row yields
                // the same effective field list the app resolves today.
                for (const field of parseFieldList(row.global_fields)) {
                    fieldMap.set(field.name, { ...field, disabled: false });
                }

                for (const field of parseFieldList(row.series_fields)) {
                    if (field.disabled) {
                        fieldMap.delete(field.name);
                    } else {
                        fieldMap.set(field.name, { ...field, disabled: false });
                    }
                }

                for (const field of parseFieldList(row.project_fields)) {
                    if (field.disabled) {
                        fieldMap.delete(field.name);
                    } else {
                        fieldMap.set(field.name, { ...field, disabled: false });
                    }
                }

                const merged = normalizeTreeFields(
                    Array.from(fieldMap.values())
                );
                updateStmt.run(JSON.stringify(merged), now, row.id);
                flattened++;
            }

            sqlite.exec(`DROP TABLE global_templates`);
            // series_templates.global_template_id was never created by the
            // original DDL or ALTER list, so guard every statement.
            if (
                columnExists(sqlite, 'entity_templates', 'global_template_id')
            ) {
                sqlite.exec(
                    `ALTER TABLE entity_templates DROP COLUMN global_template_id`
                );
            }
            if (
                columnExists(sqlite, 'series_templates', 'global_template_id')
            ) {
                sqlite.exec(
                    `ALTER TABLE series_templates DROP COLUMN global_template_id`
                );
            }

            sqlite.exec('COMMIT');
            console.log(
                `Removed global templates; flattened ${flattened} project template(s)`
            );
        } catch (err) {
            sqlite.exec('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.warn('Failed to remove global templates:', err);
    }
}

// Collapses series templates to one per (series, category) and drops the stored
// project -> series template link in favour of deriving it from projects.series_id.
// Every step is independently guarded so an interrupted run resumes cleanly.
async function migrateSeriesTemplatesToSinglePerCategory(sqlite: Database) {
    try {
        const legacyLink = columnExists(
            sqlite,
            'entity_templates',
            'series_template_id'
        );
        const legacyName = columnExists(sqlite, 'series_templates', 'name');
        if (!legacyLink && !legacyName) return;

        sqlite.exec('BEGIN');
        try {
            let staleLinks = 0;
            let collapsed = 0;
            let pruned = 0;

            // A project reassigned to another series (or to none) kept pointing
            // at its old series' template, so those fields kept merging in
            // invisibly. The derived model makes this state unrepresentable.
            if (legacyLink) {
                const repair = sqlite
                    .query(
                        `UPDATE entity_templates
                         SET series_template_id = NULL
                         WHERE series_template_id IS NOT NULL
                           AND series_template_id IN (
                               SELECT st.id
                               FROM series_templates st
                               JOIN projects p
                                 ON p.id = entity_templates.project_id
                               WHERE p.series_id IS NOT st.series_id
                           )`
                    )
                    .run();
                staleLinks = repair.changes;
            }

            // Winner per (series_id, base_type): most projects applied it, then
            // oldest. Losers are dropped; their per-project overrides stay in
            // entity_templates.custom_fields as ordinary project fields.
            const groups = sqlite
                .query(
                    `SELECT series_id, base_type
                     FROM series_templates
                     GROUP BY series_id, base_type
                     HAVING COUNT(*) > 1`
                )
                .all() as { series_id: string; base_type: string }[];

            const repoint = sqlite.prepare(
                `UPDATE entity_templates
                 SET series_template_id = ?
                 WHERE series_template_id = ?`
            );
            const removeTpl = sqlite.prepare(
                `DELETE FROM series_templates WHERE id = ?`
            );

            for (const group of groups) {
                const candidates = sqlite
                    .query(
                        `SELECT st.id AS id,
                                st.created_at AS created_at,
                                (SELECT COUNT(*) FROM entity_templates et
                                  WHERE et.series_template_id = st.id) AS uses
                         FROM series_templates st
                         WHERE st.series_id = ? AND st.base_type = ?
                         ORDER BY uses DESC, created_at ASC`
                    )
                    .all(group.series_id, group.base_type) as {
                        id: string;
                    }[];

                const winner = candidates[0];
                if (!winner) continue;

                for (const loser of candidates.slice(1)) {
                    repoint.run(winner.id, loser.id);
                    removeTpl.run(loser.id);
                    collapsed++;
                }
            }

            // migrateGlobalTemplatesAway() flattened series fields into every
            // project row. Drop entries byte-identical to the live series field
            // so removing that field later doesn't leave a project-level ghost.
            if (legacyLink) {
                const rows = sqlite
                    .query(
                        `SELECT et.id AS id, et.custom_fields AS project_fields,
                                st.custom_fields AS series_fields
                         FROM entity_templates et
                         JOIN projects p ON p.id = et.project_id
                         JOIN series_templates st ON st.series_id = p.series_id
                                           AND st.base_type = et.base_type
                         WHERE et.custom_fields IS NOT NULL
                           AND st.custom_fields IS NOT NULL`
                    )
                    .all() as {
                        id: string;
                        project_fields: string;
                        series_fields: string;
                    }[];

                const updateFields = sqlite.prepare(
                    `UPDATE entity_templates
                     SET custom_fields = ?, updated_at = ?
                     WHERE id = ?`
                );
                const now = Date.now();

                // The flatten wrote series fields as a copy with
                // `disabled: false` forced on, so both sides are normalized
                // the same way instead of compared verbatim.
                const canonical = (f: TemplateFieldRecord) =>
                    JSON.stringify({ ...f, disabled: f.disabled ?? false });

                for (const row of rows) {
                    const projectFields = parseFieldList(row.project_fields);
                    const seriesByName = new Map(
                        parseFieldList(row.series_fields).map((f) => [
                            f.name,
                            canonical(f),
                        ])
                    );
                    const kept = projectFields.filter(
                        (f) => seriesByName.get(f.name) !== canonical(f)
                    );
                    if (kept.length === projectFields.length) continue;
                    updateFields.run(JSON.stringify(kept), now, row.id);
                    pruned += projectFields.length - kept.length;
                }
            }

            for (const [table, column] of [
                ['entity_templates', 'series_template_id'],
                ['series_templates', 'name'],
                ['series_templates', 'description'],
            ] as const) {
                if (!columnExists(sqlite, table, column)) continue;
                sqlite.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
            }

            sqlite.exec('COMMIT');
            console.log(
                `Collapsed series templates to one per category: ` +
                `${collapsed} duplicate(s) removed, ` +
                `${staleLinks} stale link(s) cleared, ` +
                `${pruned} shadow field(s) pruned`
            );
        } catch (err) {
            sqlite.exec('ROLLBACK');
            throw err;
        }
    } catch (err) {
        console.warn('Failed to collapse series templates:', err);
    }
}

async function migrateTimelineEventsIntoStoryBeats(sqlite: Database) {
    try {
        if (!columnExists(sqlite, 'story_beats', 'event_type')) return;

        // Normalize existing beats to unified defaults.
        sqlite.exec(`
            UPDATE story_beats
            SET event_type = COALESCE(NULLIF(event_type, ''), 'story_beat'),
                beat_type = COALESCE(NULLIF(beat_type, ''), 'custom'),
                date_order = COALESCE(date_order, order_index, 0),
                auto_generated = COALESCE(auto_generated, 0)
        `);

        const hasTimeline = sqlite
            .query(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='timeline_events'`
            )
            .get();
        if (!hasTimeline) return;

        const rows = sqlite.query(`SELECT * FROM timeline_events`).all() as Record<
            string,
            unknown
        >[];
        const insert = sqlite.prepare(`
            INSERT INTO story_beats (
                id, project_id, chapter_id, beat_type, title, description, order_index,
                in_story_date, date_order, end_in_story_date, end_date_order,
                entity_type, entity_id, event_type, metadata, auto_generated,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                project_id=excluded.project_id,
                chapter_id=excluded.chapter_id,
                beat_type=CASE WHEN story_beats.beat_type IS NULL OR story_beats.beat_type = '' THEN excluded.beat_type ELSE story_beats.beat_type END,
                title=excluded.title,
                description=excluded.description,
                in_story_date=excluded.in_story_date,
                date_order=excluded.date_order,
                entity_type=excluded.entity_type,
                entity_id=excluded.entity_id,
                event_type=excluded.event_type,
                metadata=excluded.metadata,
                auto_generated=excluded.auto_generated,
                updated_at=excluded.updated_at
        `);

        for (const row of rows) {
            const dateOrder =
                typeof row.date_order === 'number' ? row.date_order : 0;
            insert.run(
                String(row.id),
                (row.project_id as string | null) ?? null,
                (row.chapter_id as string | null) ?? null,
                'custom',
                String(row.title ?? 'Untitled'),
                (row.description as string | null) ?? null,
                dateOrder,
                (row.in_story_date as string | null) ?? null,
                dateOrder,
                (row.entity_type as string | null) ?? null,
                (row.entity_id as string | null) ?? null,
                String(row.event_type ?? 'milestone'),
                (row.metadata as string | null) ?? null,
                row.auto_generated ? 1 : 0,
                typeof row.created_at === 'number' ? row.created_at : Date.now(),
                typeof row.updated_at === 'number' ? row.updated_at : Date.now()
            );
        }

        sqlite.exec(`DROP TABLE timeline_events`);
    } catch (err) {
        console.warn('Failed to migrate timeline_events into story_beats:', err);
    }
}

export default async function runComplexMigrations(sqlite: Database) {
    await migrateTemplateLayouts(sqlite);
    await migrateOutlineScenesToStoryScenes(sqlite);
    await migrateGlobalTemplatesAway(sqlite);
    await migrateSeriesTemplatesToSinglePerCategory(sqlite);
    await migrateTimelineEventsIntoStoryBeats(sqlite);
}
