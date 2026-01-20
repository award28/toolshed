import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { locations } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { logger } from '$lib/logger';
import { locationOperations } from '$lib/metrics';

// GET /api/locations/:id - Get single location
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid location ID');
	}

	const result = await db.select().from(locations).where(eq(locations.id, id));

	if (result.length === 0) {
		throw error(404, 'Location not found');
	}

	return json(result[0]);
};

// PUT /api/locations/:id - Update location
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const log = locals.log || logger;
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid location ID');
	}

	const body = await request.json();
	const { name, description, parentId } = body;

	// Prevent setting parent to self
	if (parentId && parseInt(parentId) === id) {
		log.warn({ locationId: id }, 'Location cannot be its own parent');
		return json({ error: 'Location cannot be its own parent' }, { status: 400 });
	}

	const updateData: Record<string, unknown> = {
		updatedAt: new Date()
	};

	if (name !== undefined) {
		if (typeof name !== 'string' || name.trim() === '') {
			return json({ error: 'Name cannot be empty' }, { status: 400 });
		}
		updateData.name = name.trim();
	}

	if (description !== undefined) {
		updateData.description = description?.trim() || null;
	}

	if (parentId !== undefined) {
		updateData.parentId = parentId ? parseInt(parentId) : null;
	}

	const result = await db
		.update(locations)
		.set(updateData)
		.where(eq(locations.id, id))
		.returning();

	if (result.length === 0) {
		throw error(404, 'Location not found');
	}

	locationOperations.inc({ operation: 'update' });
	log.info({ locationId: id, fields: Object.keys(updateData) }, 'Location updated');
	return json(result[0]);
};

// DELETE /api/locations/:id - Delete location
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const log = locals.log || logger;
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid location ID');
	}

	const result = await db.delete(locations).where(eq(locations.id, id)).returning();

	if (result.length === 0) {
		throw error(404, 'Location not found');
	}

	locationOperations.inc({ operation: 'delete' });
	log.info({ locationId: id, name: result[0].name }, 'Location deleted');
	return json({ success: true });
};
