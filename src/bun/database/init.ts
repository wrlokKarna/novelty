import { Database } from 'bun:sqlite';
import runComplexMigrations, { SCHEMA_MIGRATIONS } from './migrations';
import { resolveSqliteLibraryPath } from '@/bun/database/utils';

export function initializeSqliteEngine(): void {
    if (process.platform !== 'darwin') return;

    try {
        const path = resolveSqliteLibraryPath();

        if (path) {
            Database.setCustomSQLite(path);
        } else {
            console.warn(
                'Homebrew SQLite paths not found. Falling back to system SQLite.'
            );
        }
    } catch (error) {
        console.warn(
            'Could not set custom SQLite on macOS, using system SQLite. Vector features may be unavailable.',
            error
        );
    }
}

export async function initDatabase(sqlite: Database, dbPath: string) {
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
			timestamp INTEGER NOT NULL,
            model TEXT,
            mode TEXT NOT NULL,
            currentVariantIndex INTEGER NOT NULL

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
		layout TEXT,
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

	CREATE TABLE IF NOT EXISTS series_templates (
		id TEXT PRIMARY KEY,
		series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
		base_type TEXT NOT NULL,
		custom_fields TEXT,
		layout TEXT,
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

    for (const col of SCHEMA_MIGRATIONS) {
        try {
            sqlite.exec(
                `ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.type}`
            );
        } catch {
            // Column already exists - ignore error
        }
    }

    await runComplexMigrations(sqlite);

    // Enforced after the collapse above, since pre-migration databases can
    // hold more than one row per (series_id, base_type).
    sqlite.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_series_templates_series_base
         ON series_templates (series_id, base_type)`
    );

    try {
        sqlite.exec(
            `UPDATE scratch_notes SET id = project_id WHERE id = 'scratch'`
        );
    } catch {
        // ignore if table doesn't exist yet
    }

    seedGlobalData(sqlite);

    console.log('Database initialized at:', dbPath);
}

function seedGlobalData(sqlite: Database) {
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
