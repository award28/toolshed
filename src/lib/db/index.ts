import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import path from 'path';

const dbPath = path.resolve('data/tools.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize database tables and FTS
export function initializeDatabase() {
	// Create locations table
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS locations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			parent_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	// Create tools table
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS tools (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			label TEXT NOT NULL,
			description TEXT,
			notes TEXT,
			image_path TEXT,
			location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
			is_borrowed INTEGER DEFAULT 0,
			borrowed_by TEXT,
			borrowed_at TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	// Create FTS5 virtual table for full-text search on tools
	sqlite.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS tools_fts USING fts5(
			label,
			description,
			notes,
			content='tools',
			content_rowid='id'
		)
	`);

	// Create triggers to keep FTS in sync with tools table
	sqlite.exec(`
		CREATE TRIGGER IF NOT EXISTS tools_ai AFTER INSERT ON tools BEGIN
			INSERT INTO tools_fts(rowid, label, description, notes)
			VALUES (new.id, new.label, new.description, new.notes);
		END
	`);

	sqlite.exec(`
		CREATE TRIGGER IF NOT EXISTS tools_ad AFTER DELETE ON tools BEGIN
			INSERT INTO tools_fts(tools_fts, rowid, label, description, notes)
			VALUES ('delete', old.id, old.label, old.description, old.notes);
		END
	`);

	sqlite.exec(`
		CREATE TRIGGER IF NOT EXISTS tools_au AFTER UPDATE ON tools BEGIN
			INSERT INTO tools_fts(tools_fts, rowid, label, description, notes)
			VALUES ('delete', old.id, old.label, old.description, old.notes);
			INSERT INTO tools_fts(rowid, label, description, notes)
			VALUES (new.id, new.label, new.description, new.notes);
		END
	`);

	// Create index on location_id for faster location-based queries
	sqlite.exec(`
		CREATE INDEX IF NOT EXISTS idx_tools_location ON tools(location_id)
	`);

	sqlite.exec(`
		CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id)
	`);
}

// Full-text search helper
export function searchTools(query: string): number[] {
	const stmt = sqlite.prepare(`
		SELECT rowid FROM tools_fts WHERE tools_fts MATCH ? ORDER BY rank
	`);
	const results = stmt.all(query) as { rowid: number }[];
	return results.map((r) => r.rowid);
}

// Get raw sqlite instance for custom queries
export function getRawDb() {
	return sqlite;
}
