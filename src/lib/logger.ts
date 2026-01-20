import pino from 'pino';
import { dev } from '$app/environment';

export const logger = pino({
	level: process.env.LOG_LEVEL || (dev ? 'debug' : 'info'),
	...(dev && {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true
			}
		}
	})
});

export function createRequestLogger(requestId: string) {
	return logger.child({ requestId });
}
