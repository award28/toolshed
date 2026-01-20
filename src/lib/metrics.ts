import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestDuration = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

export const httpRequestsTotal = new client.Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestsTotal);

// Application-specific metrics
export const toolsTotal = new client.Gauge({
	name: 'toolshed_tools_total',
	help: 'Total number of tools in the inventory'
});
register.registerMetric(toolsTotal);

export const toolsBorrowed = new client.Gauge({
	name: 'toolshed_tools_borrowed',
	help: 'Number of tools currently borrowed'
});
register.registerMetric(toolsBorrowed);

export const locationsTotal = new client.Gauge({
	name: 'toolshed_locations_total',
	help: 'Total number of locations'
});
register.registerMetric(locationsTotal);

export const toolOperations = new client.Counter({
	name: 'toolshed_tool_operations_total',
	help: 'Total tool operations',
	labelNames: ['operation'] // create, update, delete, borrow, return
});
register.registerMetric(toolOperations);

export const locationOperations = new client.Counter({
	name: 'toolshed_location_operations_total',
	help: 'Total location operations',
	labelNames: ['operation'] // create, update, delete
});
register.registerMetric(locationOperations);

export const imageUploads = new client.Counter({
	name: 'toolshed_image_uploads_total',
	help: 'Total image uploads',
	labelNames: ['status'] // success, failure
});
register.registerMetric(imageUploads);

export const searchQueries = new client.Counter({
	name: 'toolshed_search_queries_total',
	help: 'Total search queries performed'
});
register.registerMetric(searchQueries);
