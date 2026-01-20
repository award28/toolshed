import { initializeDatabase } from '$lib/db';
import { logger, createRequestLogger } from '$lib/logger';

// Initialize database on server start
let initialized = false;

export async function handle({ event, resolve }) {
	if (!initialized) {
		await initializeDatabase();
		logger.info('Database initialized');
		initialized = true;
	}

	const requestId = crypto.randomUUID();
	const log = createRequestLogger(requestId);
	const startTime = performance.now();

	// Attach logger and requestId to event.locals
	event.locals.log = log;
	event.locals.requestId = requestId;

	// Log incoming request
	log.info(
		{
			method: event.request.method,
			url: event.url.pathname,
			query: Object.fromEntries(event.url.searchParams)
		},
		'Incoming request'
	);

	try {
		const response = await resolve(event);

		const duration = Math.round(performance.now() - startTime);
		log.info(
			{
				method: event.request.method,
				url: event.url.pathname,
				status: response.status,
				duration
			},
			'Request completed'
		);

		// Add request ID to response headers for debugging
		response.headers.set('X-Request-ID', requestId);
		return response;
	} catch (error) {
		const duration = Math.round(performance.now() - startTime);
		log.error(
			{
				method: event.request.method,
				url: event.url.pathname,
				duration,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			},
			'Request failed'
		);
		throw error;
	}
}

export function handleError({ error, event }) {
	const log = event.locals?.log || logger;
	log.error(
		{
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			url: event.url.pathname
		},
		'Unhandled error'
	);

	return {
		message: 'An unexpected error occurred'
	};
}
