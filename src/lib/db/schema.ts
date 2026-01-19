import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Locations - hierarchical container system (can contain other locations or tools)
// Note: parentId is a self-reference, foreign key constraint is handled in db/index.ts
export const locations = sqliteTable('locations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	description: text('description'),
	parentId: integer('parent_id'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Tools
export const tools = sqliteTable('tools', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	label: text('label').notNull(),
	description: text('description'),
	notes: text('notes'),
	imagePath: text('image_path'),
	locationId: integer('location_id'),
	isBorrowed: integer('is_borrowed', { mode: 'boolean' }).default(false),
	borrowedBy: text('borrowed_by'),
	borrowedAt: text('borrowed_at'),
	createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString())
});

// Type exports for use in the app
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
