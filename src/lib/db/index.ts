import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

// Lazy initialization to avoid build-time database connection
let pool: pg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function getPool(): pg.Pool {
	if (!pool) {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL environment variable is required');
		}
		pool = new Pool({ connectionString });
	}
	return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
	if (!_db) {
		_db = drizzle(getPool(), { schema });
	}
	return _db;
}

// Keep db export for backwards compatibility, but as a getter
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
	get(_, prop) {
		return (getDb() as any)[prop];
	}
});

// Initialize database tables
export async function initializeDatabase() {
	const client = await getPool().connect();
	try {
		// Create locations table
		await client.query(`
			CREATE TABLE IF NOT EXISTS locations (
				id SERIAL PRIMARY KEY,
				name TEXT NOT NULL,
				description TEXT,
				parent_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`);

		// Create tools table
		await client.query(`
			CREATE TABLE IF NOT EXISTS tools (
				id SERIAL PRIMARY KEY,
				label TEXT NOT NULL,
				description TEXT,
				notes TEXT,
				image_path TEXT,
				location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
				is_borrowed BOOLEAN DEFAULT FALSE,
				borrowed_by TEXT,
				borrowed_at TIMESTAMP,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
				search_vector TSVECTOR GENERATED ALWAYS AS (
					to_tsvector('english', coalesce(label, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, ''))
				) STORED
			)
		`);

		// Create index for full-text search
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_tools_search ON tools USING GIN(search_vector)
		`);

		// Create index on location_id for faster location-based queries
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_tools_location ON tools(location_id)
		`);

		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id)
		`);
	} finally {
		client.release();
	}
}

// Full-text search helper - returns matching tool IDs
export async function searchTools(query: string): Promise<number[]> {
	const client = await getPool().connect();
	try {
		const result = await client.query(
			`SELECT id FROM tools WHERE search_vector @@ plainto_tsquery('english', $1) ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC`,
			[query]
		);
		return result.rows.map((r: { id: number }) => r.id);
	} finally {
		client.release();
	}
}

// Get raw pool instance for custom queries
export function getRawDb() {
	return getPool();
}
