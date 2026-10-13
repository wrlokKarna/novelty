import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { Utils } from 'electrobun/main';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import * as schema from '../schema';
import * as sqliteVec from 'sqlite-vec';

const dbPath = join(Utils.paths.userData, 'novelty.db');
const dbDir = Utils.paths.userData;

console.log('Database path:', dbPath);
console.log('Database directory:', dbDir);

if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
}

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

const sqlite = new Database(dbPath);

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

export function ensureVecTable(dimension: number): void {
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

export async function initDatabase() {
    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			path TEXT,
			metadata TEXT,
			cover_image_id TEXT,
			cover_images_array TEXT,
			project_scope TEXT,
			series_arch TEXT,
			pov TEXT,
			pacing TEXT,
			work_type TEXT,
			project_structure TEXT,
			target_age TEXT,
			project_status TEXT NOT NULL DEFAULT 'planning',
			tonal_type TEXT,
			content_rating TEXT NOT NULL DEFAULT 'Unrated',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS assets (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			path TEXT,
			metadata TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS chat_sessions (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			title TEXT NOT NULL,
			is_archived INTEGER NOT NULL DEFAULT 0,
			is_manually_named INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS chat_messages (
			id TEXT PRIMARY KEY,
			session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			timestamp INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS agents (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			config TEXT,
			system_prompt TEXT,
			tools TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS agent_runs (
			id TEXT PRIMARY KEY,
			agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
			status TEXT NOT NULL DEFAULT 'pending',
			input TEXT,
			output TEXT,
			started_at INTEGER,
			finished_at INTEGER
		);

		CREATE TABLE IF NOT EXISTS chapters (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			title TEXT NOT NULL,
			content TEXT,
			file_path TEXT,
			order_index INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS characters (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			file_path TEXT,
			template_data TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS locations (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			file_path TEXT,
			template_data TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS organizations (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			file_path TEXT,
			template_data TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS items (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			file_path TEXT,
			template_data TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS lore_entries (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			file_path TEXT,
			template_data TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS genres (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			is_global INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS tags (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			is_global INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS project_genres (
			project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
			genre_id TEXT REFERENCES genres(id) ON DELETE CASCADE,
			is_primary INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (project_id, genre_id)
		);

		CREATE TABLE IF NOT EXISTS project_tags (
			project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
			tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (project_id, tag_id)
		);

		CREATE TABLE IF NOT EXISTS themes (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			is_global INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS project_themes (
			project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
			theme_id TEXT REFERENCES themes(id) ON DELETE CASCADE,
			is_primary INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (project_id, theme_id)
		);

		CREATE TABLE IF NOT EXISTS entry_relationships (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			source_type TEXT NOT NULL,
			source_id TEXT NOT NULL,
			target_type TEXT NOT NULL,
			target_id TEXT NOT NULL,
			relationship_type TEXT NOT NULL,
			notes TEXT,
			created_at INTEGER NOT NULL
		);

CREATE TABLE IF NOT EXISTS scratch_notes (
		id TEXT PRIMARY KEY,
		project_id TEXT REFERENCES projects(id),
		content TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS entity_templates (
		id TEXT PRIMARY KEY,
		project_id TEXT REFERENCES projects(id),
		base_type TEXT NOT NULL,
		custom_fields TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS series (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT,
		series_arch TEXT,
		cover_image_id TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS global_templates (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT,
		base_type TEXT NOT NULL,
		custom_fields TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS series_templates (
		id TEXT PRIMARY KEY,
		series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		description TEXT,
		base_type TEXT NOT NULL,
		custom_fields TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);
`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS token_usage (
			id TEXT PRIMARY KEY,
			session_id TEXT REFERENCES chat_sessions(id) ON DELETE SET NULL,
			project_id TEXT REFERENCES projects(id),
			prompt_tokens INTEGER NOT NULL DEFAULT 0,
			completion_tokens INTEGER NOT NULL DEFAULT 0,
			total_tokens INTEGER NOT NULL DEFAULT 0,
			model TEXT,
			created_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS timeline_events (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			title TEXT NOT NULL,
			description TEXT,
			in_story_date TEXT,
			date_order INTEGER NOT NULL DEFAULT 0,
			entity_type TEXT,
			entity_id TEXT,
			event_type TEXT NOT NULL DEFAULT 'milestone',
			chapter_id TEXT REFERENCES chapters(id),
			metadata TEXT,
			auto_generated INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    try {
        sqlite.exec(
            `ALTER TABLE timeline_events ADD COLUMN auto_generated INTEGER NOT NULL DEFAULT 0`
        );
    } catch {
        // Column already exists - ignore error
    }

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS story_acts (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			title TEXT NOT NULL,
			summary TEXT,
			order_index INTEGER NOT NULL DEFAULT 0,
			act_number INTEGER NOT NULL DEFAULT 1,
			status TEXT NOT NULL DEFAULT 'outline',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS story_sequences (
			id TEXT PRIMARY KEY,
			act_id TEXT REFERENCES story_acts(id) ON DELETE CASCADE,
			project_id TEXT REFERENCES projects(id),
			title TEXT NOT NULL,
			summary TEXT,
			order_index INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'outline',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS story_scenes (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			act_id TEXT REFERENCES story_acts(id),
			sequence_id TEXT REFERENCES story_sequences(id),
			chapter_id TEXT REFERENCES chapters(id),
			title TEXT NOT NULL,
			summary TEXT,
			setting TEXT,
			characters_present TEXT,
			key_events TEXT,
			duration TEXT,
			conflict TEXT,
			status TEXT NOT NULL DEFAULT 'outline',
			order_index INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS plot_threads (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			name TEXT NOT NULL,
			description TEXT,
			thread_type TEXT NOT NULL DEFAULT 'subplot',
			color TEXT NOT NULL DEFAULT '#6366f1',
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS chapter_plot_threads (
			chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
			plot_thread_id TEXT NOT NULL REFERENCES plot_threads(id) ON DELETE CASCADE,
			intensity INTEGER NOT NULL DEFAULT 5,
			PRIMARY KEY (chapter_id, plot_thread_id)
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS story_beats (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			chapter_id TEXT REFERENCES chapters(id),
			beat_type TEXT NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			order_index INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS inspirations (
			id TEXT PRIMARY KEY,
			project_id TEXT REFERENCES projects(id),
			source_name TEXT NOT NULL,
			source_type TEXT NOT NULL,
			source_year INTEGER,
			inspired_aspects TEXT,
			inspired_notes TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(`
		CREATE TABLE IF NOT EXISTS embeddings (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			entity_type TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			content_hash TEXT NOT NULL,
			chunk_index INTEGER NOT NULL DEFAULT 0,
			chunk_text TEXT NOT NULL,
			token_count INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);

    sqlite.exec(
        `CREATE INDEX IF NOT EXISTS idx_embeddings_project ON embeddings(project_id)`
    );
    sqlite.exec(
        `CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_type, entity_id)`
    );
    sqlite.exec(
        `CREATE INDEX IF NOT EXISTS idx_embeddings_hash ON embeddings(content_hash)`
    );

    const migrations = [
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
        {
            table: 'entity_templates',
            name: 'global_template_id',
            type: 'TEXT REFERENCES global_templates(id)',
        },
        {
            table: 'entity_templates',
            name: 'series_template_id',
            type: 'TEXT REFERENCES series_templates(id)',
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
    ];

    for (const col of migrations) {
        try {
            sqlite.exec(
                `ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.type}`
            );
        } catch {
            // Column already exists - ignore error
        }
    }

    migrateOutlineScenesToStoryScenes();

    try {
        sqlite.exec(
            `UPDATE scratch_notes SET id = project_id WHERE id = 'scratch'`
        );
    } catch {
        // ignore if table doesn't exist yet
    }

    seedGlobalData();

    console.log('Database initialized at:', dbPath);
}

function migrateOutlineScenesToStoryScenes() {
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

function seedGlobalData() {
    const globalGenres = [
        'fantasy',
        'sci-fi',
        'romance',
        'thriller',
        'horror',
        'mystery',
        'historical',
        'contemporary',
        'western',
        'literary-fiction',
        'young-adult',
        'dystopian',
        'cyberpunk',
        'steampunk',
        'urban-fantasy',
    ];

    const globalTags = [
        'dragons',
        'magic',
        'space',
        'aliens',
        'vampires',
        'zombies',
        'romance',
        'mystery',
        'war',
        'political',
        'supernatural',
        'dystopia',
        'time-travel',
        'post-apocalyptic',
        'coming-of-age',
    ];

    for (const genre of globalGenres) {
        try {
            const id = genre.replace(/-/g, '_');
            sqlite.exec(
                `INSERT OR IGNORE INTO genres (id, name, is_global, created_at) VALUES ('${id}', '${genre}', 1, ${Date.now()})`
            );
        } catch {
            // Ignore duplicates
        }
    }

    for (const tag of globalTags) {
        try {
            const id = tag.replace(/-/g, '_');
            sqlite.exec(
                `INSERT OR IGNORE INTO tags (id, name, is_global, created_at) VALUES ('${id}', '${tag}', 1, ${Date.now()})`
            );
        } catch {
            // Ignore duplicates
        }
    }

    const globalThemes = [
        'redemption',
        'revenge',
        'betrayal',
        'identity',
        'coming-of-age',
        'good-vs-evil',
        'love',
        'death',
        'power',
        'freedom',
        'survival',
        'justice',
        'sacrifice',
        'transformation',
        'war-and-peace',
    ];

    for (const theme of globalThemes) {
        try {
            const id = theme.replace(/-/g, '_');
            sqlite.exec(
                `INSERT OR IGNORE INTO themes (id, name, is_global, created_at) VALUES ('${id}', '${theme}', 1, ${Date.now()})`
            );
        } catch {
            // Ignore duplicates
        }
    }
}
