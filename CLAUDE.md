# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with code in this repository.

## Project Overview

ToolShed is a local-first workshop tool inventory system built with SvelteKit, SQLite, and Drizzle ORM. It allows users to catalog tools with photos, organize them in hierarchical locations, and track borrowed status.

## Tech Stack

- **Framework**: SvelteKit with TypeScript (Svelte 5 runes mode)
- **Database**: SQLite via better-sqlite3 with Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Search**: SQLite FTS5 for full-text search

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run check

# Build for production
npm run build
```

## Architecture

### Database Schema

- **locations**: Hierarchical containers (self-referential via `parentId`)
- **tools**: Tool entries with optional location reference
- **tools_fts**: FTS5 virtual table for full-text search (auto-synced via triggers)

### Key Files

- `src/lib/db/schema.ts` - Drizzle schema definitions
- `src/lib/db/index.ts` - Database connection and FTS helpers
- `src/hooks.server.ts` - Database initialization on server start
- `src/routes/api/` - REST API endpoints
- `src/routes/+page.svelte` - Main tool list with search/filter

### API Design

RESTful endpoints under `/api/`:
- `/api/tools` - Tool CRUD with search (`?q=`), location filter (`?locationId=`), borrowed filter (`?borrowed=`)
- `/api/locations` - Location CRUD
- Location filtering includes all descendant locations (recursive)

### Data Storage

- Database: `data/tools.db` (gitignored)
- Images: `uploads/` directory (gitignored)
- Both should be backed up separately from the codebase

## Svelte 5 Patterns

This project uses Svelte 5 runes:
- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component props

## Notes

- Image uploads are handled via multipart form data
- FTS5 search uses prefix matching (query + '*')
- Location hierarchy is traversed recursively for filtering
