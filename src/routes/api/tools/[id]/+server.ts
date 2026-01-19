import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { tools, locations } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';

// GET /api/tools/:id - Get single tool with location info
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid tool ID');
	}

	const result = await db
		.select({
			tool: tools,
			location: locations
		})
		.from(tools)
		.leftJoin(locations, eq(tools.locationId, locations.id))
		.where(eq(tools.id, id));

	if (result.length === 0) {
		throw error(404, 'Tool not found');
	}

	const { tool, location } = result[0];
	return json({ ...tool, location });
};

// PUT /api/tools/:id - Update tool
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid tool ID');
	}

	const contentType = request.headers.get('content-type') || '';
	const updateData: Record<string, unknown> = {
		updatedAt: new Date().toISOString()
	};

	// Get current tool to check for old image
	const currentTool = await db.select().from(tools).where(eq(tools.id, id));
	if (currentTool.length === 0) {
		throw error(404, 'Tool not found');
	}

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();

		const label = formData.get('label') as string;
		if (label !== null) {
			if (label.trim() === '') {
				return json({ error: 'Label cannot be empty' }, { status: 400 });
			}
			updateData.label = label.trim();
		}

		const description = formData.get('description');
		if (description !== null) {
			updateData.description = (description as string)?.trim() || null;
		}

		const notes = formData.get('notes');
		if (notes !== null) {
			updateData.notes = (notes as string)?.trim() || null;
		}

		const locationIdStr = formData.get('locationId');
		if (locationIdStr !== null) {
			updateData.locationId = locationIdStr ? parseInt(locationIdStr as string) : null;
		}

		const isBorrowed = formData.get('isBorrowed');
		if (isBorrowed !== null) {
			updateData.isBorrowed = isBorrowed === 'true';
			if (updateData.isBorrowed) {
				updateData.borrowedAt = new Date().toISOString();
			} else {
				updateData.borrowedAt = null;
				updateData.borrowedBy = null;
			}
		}

		const borrowedBy = formData.get('borrowedBy');
		if (borrowedBy !== null) {
			updateData.borrowedBy = (borrowedBy as string)?.trim() || null;
		}

		const image = formData.get('image') as File | null;
		if (image && image.size > 0) {
			// Delete old image if exists
			if (currentTool[0].imagePath) {
				try {
					const oldPath = path.resolve('.' + currentTool[0].imagePath);
					await unlink(oldPath);
				} catch {
					// Ignore if file doesn't exist
				}
			}

			// Save new image
			const ext = image.name.split('.').pop() || 'jpg';
			const filename = `${uuidv4()}.${ext}`;
			const uploadsDir = path.resolve('uploads');

			await mkdir(uploadsDir, { recursive: true });

			const buffer = Buffer.from(await image.arrayBuffer());
			await writeFile(path.join(uploadsDir, filename), buffer);

			updateData.imagePath = `/uploads/${filename}`;
		}

		// Check for removeImage flag
		const removeImage = formData.get('removeImage');
		if (removeImage === 'true') {
			if (currentTool[0].imagePath) {
				try {
					const oldPath = path.resolve('.' + currentTool[0].imagePath);
					await unlink(oldPath);
				} catch {
					// Ignore if file doesn't exist
				}
			}
			updateData.imagePath = null;
		}
	} else {
		const body = await request.json();

		if (body.label !== undefined) {
			if (typeof body.label !== 'string' || body.label.trim() === '') {
				return json({ error: 'Label cannot be empty' }, { status: 400 });
			}
			updateData.label = body.label.trim();
		}

		if (body.description !== undefined) {
			updateData.description = body.description?.trim() || null;
		}

		if (body.notes !== undefined) {
			updateData.notes = body.notes?.trim() || null;
		}

		if (body.locationId !== undefined) {
			updateData.locationId = body.locationId ? parseInt(body.locationId) : null;
		}

		if (body.isBorrowed !== undefined) {
			updateData.isBorrowed = !!body.isBorrowed;
			if (updateData.isBorrowed) {
				updateData.borrowedAt = new Date().toISOString();
			} else {
				updateData.borrowedAt = null;
				updateData.borrowedBy = null;
			}
		}

		if (body.borrowedBy !== undefined) {
			updateData.borrowedBy = body.borrowedBy?.trim() || null;
		}
	}

	const result = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning();

	return json(result[0]);
};

// DELETE /api/tools/:id - Delete tool
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid tool ID');
	}

	// Get tool to delete image
	const currentTool = await db.select().from(tools).where(eq(tools.id, id));
	if (currentTool.length === 0) {
		throw error(404, 'Tool not found');
	}

	// Delete image file if exists
	if (currentTool[0].imagePath) {
		try {
			const imagePath = path.resolve('.' + currentTool[0].imagePath);
			await unlink(imagePath);
		} catch {
			// Ignore if file doesn't exist
		}
	}

	await db.delete(tools).where(eq(tools.id, id));

	return json({ success: true });
};
