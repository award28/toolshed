import { register, toolsTotal, toolsBorrowed, locationsTotal } from '$lib/metrics';
import { db } from '$lib/db';
import { tools, locations } from '$lib/db/schema';
import { eq, count } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Update gauge metrics with current counts
	const [toolCount] = await db.select({ count: count() }).from(tools);
	const [borrowedCount] = await db
		.select({ count: count() })
		.from(tools)
		.where(eq(tools.isBorrowed, true));
	const [locationCount] = await db.select({ count: count() }).from(locations);

	toolsTotal.set(toolCount.count);
	toolsBorrowed.set(borrowedCount.count);
	locationsTotal.set(locationCount.count);

	const metrics = await register.metrics();

	return new Response(metrics, {
		headers: {
			'Content-Type': register.contentType
		}
	});
};
