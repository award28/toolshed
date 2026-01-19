import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';
import type { RequestHandler } from './$types';

const MIME_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const { filename } = params;

	// Prevent directory traversal
	if (filename.includes('..') || filename.includes('/')) {
		throw error(400, 'Invalid filename');
	}

	const filePath = path.resolve('uploads', filename);

	try {
		const buffer = await readFile(filePath);
		const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
		const contentType = MIME_TYPES[ext] || 'application/octet-stream';

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000'
			}
		});
	} catch {
		throw error(404, 'Image not found');
	}
};
