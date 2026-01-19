# ToolShed

A local-first workshop tool inventory system for cataloging and tracking your tools.

## Features

- **Tool Catalog**: Add tools with photos, labels, descriptions, and notes
- **Hierarchical Locations**: Organize tools in nested containers (e.g., Garage → Workbench → Top Drawer)
- **Borrowed Tracking**: Track which tools are lent out and to whom
- **Full-Text Search**: Search across all tool fields using SQLite FTS5
- **Filtering**: Filter by location and borrowed status

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS
- **Search**: SQLite FTS5 for full-text search

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Building for Production

```bash
npm run build
npm run preview
```

## Data Storage

- **Database**: `data/tools.db` - SQLite database file
- **Images**: `uploads/` - Tool photos

Both directories are gitignored. To backup your data, simply copy these files.

## Project Structure

```
toolshed/
├── src/
│   ├── lib/
│   │   └── db/           # Database schema and connection
│   └── routes/
│       ├── api/          # REST API endpoints
│       ├── tools/        # Tool pages (list, detail, edit)
│       └── locations/    # Location management
├── data/                 # SQLite database (gitignored)
└── uploads/              # Tool images (gitignored)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tools` | List tools (supports `?q=`, `?locationId=`, `?borrowed=`) |
| POST | `/api/tools` | Create tool (multipart for image) |
| GET/PUT/DELETE | `/api/tools/:id` | Tool CRUD operations |
| GET | `/api/locations` | List locations |
| POST | `/api/locations` | Create location |
| GET/PUT/DELETE | `/api/locations/:id` | Location CRUD operations |

## License

MIT
