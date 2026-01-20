import { json } from '@sveltejs/kit';
import { db, searchTools, getRawDb } from '$lib/db';
import { tools, locations } from '$lib/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';
import { logger } from '$lib/logger';
import { toolOperations, imageUploads, searchQueries } from '$lib/metrics';

// Get all descendant location IDs (including the given location)
async function getLocationAndDescendants(locationId: number): Promise<number[]> {
	const allLocations = await db.select().from(locations);
	const result: number[] = [locationId];

	function addChildren(parentId: number) {
		for (const loc of allLocations) {
			if (loc.parentId === parentId) {
				result.push(loc.id);
				addChildren(loc.id);
			}
		}
	}

	addChildren(locationId);
	return result;
}

// GET /api/tools - List tools with optional search and filters
export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	const locationId = url.searchParams.get('locationId');
	const borrowed = url.searchParams.get('borrowed');

	let conditions: ReturnType<typeof eq>[] = [];

	// Filter by location (including all sub-locations)
	if (locationId) {
		const locationIds = await getLocationAndDescendants(parseInt(locationId));
		conditions.push(inArray(tools.locationId, locationIds));
	}

	// Filter by borrowed status
	if (borrowed === 'true') {
		conditions.push(eq(tools.isBorrowed, true));
	} else if (borrowed === 'false') {
		conditions.push(eq(tools.isBorrowed, false));
	}

	// Handle full-text search
	if (query && query.trim()) {
		// Use PostgreSQL full-text search
		searchQueries.inc();
		const matchingIds = await searchTools(query.trim());

		if (matchingIds.length === 0) {
			return json([]);
		}

		conditions.push(inArray(tools.id, matchingIds));
	}

	// Build query with left join to get location info
	let result;
	if (conditions.length > 0) {
		result = await db
			.select({
				tool: tools,
				location: locations
			})
			.from(tools)
			.leftJoin(locations, eq(tools.locationId, locations.id))
			.where(and(...conditions));
	} else {
		result = await db
			.select({
				tool: tools,
				location: locations
			})
			.from(tools)
			.leftJoin(locations, eq(tools.locationId, locations.id));
	}

	// Flatten the result
	const flatResult = result.map(({ tool, location }) => ({
		...tool,
		location: location
	}));

	return json(flatResult);
};

// POST /api/tools - Create a new tool
export const POST: RequestHandler = async ({ request, locals }) => {
	const log = locals.log || logger;
	const contentType = request.headers.get('content-type') || '';

	let label: string;
	let description: string | null = null;
	let notes: string | null = null;
	let locationId: number | null = null;
	let imagePath: string | null = null;

	try {
		if (contentType.includes('multipart/form-data')) {
			// Handle multipart form data with image upload
			const formData = await request.formData();

			label = formData.get('label') as string;
			description = (formData.get('description') as string) || null;
			notes = (formData.get('notes') as string) || null;
			const locationIdStr = formData.get('locationId') as string;
			locationId = locationIdStr ? parseInt(locationIdStr) : null;

			const image = formData.get('image') as File | null;
			if (image && image.size > 0) {
				// Save the image
				const ext = image.name.split('.').pop() || 'jpg';
				const filename = `${uuidv4()}.${ext}`;
				const uploadsDir = path.resolve('uploads');

				await mkdir(uploadsDir, { recursive: true });

				const buffer = Buffer.from(await image.arrayBuffer());
				await writeFile(path.join(uploadsDir, filename), buffer);

				imagePath = `/uploads/${filename}`;
				imageUploads.inc({ status: 'success' });
				log.debug({ filename, size: image.size }, 'Image saved');
			}
		} else {
			// Handle JSON request
			const body = await request.json();
			label = body.label;
			description = body.description || null;
			notes = body.notes || null;
			locationId = body.locationId ? parseInt(body.locationId) : null;
		}

		if (!label || typeof label !== 'string' || label.trim() === '') {
			log.warn('Tool creation failed: label is required');
			return json({ error: 'Label is required' }, { status: 400 });
		}

		const result = await db
			.insert(tools)
			.values({
				label: label.trim(),
				description: description?.trim() || null,
				notes: notes?.trim() || null,
				imagePath,
				locationId,
				isBorrowed: false
			})
			.returning();

		toolOperations.inc({ operation: 'create' });
		log.info({ toolId: result[0].id, label: result[0].label }, 'Tool created');
		return json(result[0], { status: 201 });
	} catch (error) {
		log.error(
			{ error: error instanceof Error ? error.message : String(error) },
			'Failed to create tool'
		);
		if (imagePath) {
			imageUploads.inc({ status: 'failure' });
		}
		return json({ error: 'Failed to create tool' }, { status: 500 });
	}
};
