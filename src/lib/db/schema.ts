import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Locations - hierarchical container system (can contain other locations or tools)
export const locations = pgTable('locations', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	parentId: integer('parent_id'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Tools
export const tools = pgTable('tools', {
	id: serial('id').primaryKey(),
	label: text('label').notNull(),
	description: text('description'),
	notes: text('notes'),
	imagePath: text('image_path'),
	locationId: integer('location_id'),
	isBorrowed: boolean('is_borrowed').default(false),
	borrowedBy: text('borrowed_by'),
	borrowedAt: timestamp('borrowed_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Type exports for use in the app
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
