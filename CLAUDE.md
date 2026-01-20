# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

ToolShed is a local-first workshop tool inventory system built with SvelteKit, PostgreSQL, and Drizzle ORM. It allows users to catalog tools with photos, organize them in hierarchical locations, and track borrowed status.

## Tech Stack

- **Framework**: SvelteKit with TypeScript (Svelte 5 runes mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Search**: PostgreSQL full-text search (tsvector/tsquery)

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (requires DATABASE_URL env var)
DATABASE_URL=postgresql://user:pass@localhost:5432/toolshed npm run dev

# Start with Docker Compose (includes PostgreSQL)
docker compose up -d

# Type check
npm run check

# Build for production
npm run build
```

## Architecture

### Database Schema

- **locations**: Hierarchical containers (self-referential via `parentId`)
- **tools**: Tool entries with optional location reference, includes `search_vector` for FTS

### Key Files

- `src/lib/db/schema.ts` - Drizzle schema definitions (PostgreSQL)
- `src/lib/db/index.ts` - Database connection (lazy initialization) and FTS helpers
- `src/hooks.server.ts` - Database initialization on server start
- `src/routes/api/` - REST API endpoints
- `src/routes/+page.svelte` - Main tool list with search/filter

### API Design

RESTful endpoints under `/api/`:
- `/api/tools` - Tool CRUD with search (`?q=`), location filter (`?locationId=`), borrowed filter (`?borrowed=`)
- `/api/locations` - Location CRUD
- Location filtering includes all descendant locations (recursive)

### Data Storage

- Database: PostgreSQL (configured via `DATABASE_URL` environment variable)
- Images: `uploads/` directory (gitignored, mount as volume in production)

## Environment Variables

- `DATABASE_URL` (required): PostgreSQL connection string
- `PORT` (optional): Server port, defaults to 3000
- `LOG_LEVEL` (optional): Logging level (trace, debug, info, warn, error, fatal). Defaults to "debug" in dev, "info" in production

## Svelte 5 Patterns

This project uses Svelte 5 runes:
- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component props

## Logging

The application uses [pino](https://getpino.io/) for structured JSON logging:

- `src/lib/logger.ts` - Logger configuration and factory
- Request logging in `hooks.server.ts` captures timing, status codes, and errors
- Each request gets a unique `X-Request-ID` header for tracing
- API endpoints log CRUD operations with relevant context

Logs are JSON-formatted in production (for Loki/Grafana) and pretty-printed in development.

## Notes

- Image uploads are handled via multipart form data
- PostgreSQL full-text search uses `plainto_tsquery` for natural language queries
- Location hierarchy is traversed recursively for filtering
- Database connection is lazy-initialized to avoid build-time errors
