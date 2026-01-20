import { initializeDatabase } from '$lib/db';
import { logger, createRequestLogger } from '$lib/logger';
import { httpRequestDuration, httpRequestsTotal } from '$lib/metrics';

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

	// Normalize route for metrics (replace IDs with :id)
	const route = event.url.pathname.replace(/\/\d+/g, '/:id');

	try {
		const response = await resolve(event);

		const durationMs = Math.round(performance.now() - startTime);
		const durationSec = durationMs / 1000;

		// Record metrics
		httpRequestDuration.observe(
			{ method: event.request.method, route, status_code: response.status },
			durationSec
		);
		httpRequestsTotal.inc({ method: event.request.method, route, status_code: response.status });

		log.info(
			{
				method: event.request.method,
				url: event.url.pathname,
				status: response.status,
				duration: durationMs
			},
			'Request completed'
		);

		// Add request ID to response headers for debugging
		response.headers.set('X-Request-ID', requestId);
		return response;
	} catch (error) {
		const durationMs = Math.round(performance.now() - startTime);
		const durationSec = durationMs / 1000;

		// Record error metrics
		httpRequestDuration.observe(
			{ method: event.request.method, route, status_code: 500 },
			durationSec
		);
		httpRequestsTotal.inc({ method: event.request.method, route, status_code: 500 });

		log.error(
			{
				method: event.request.method,
				url: event.url.pathname,
				duration: durationMs,
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
