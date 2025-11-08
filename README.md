# Skill-Tree Boilerplate

A production-ready Remix v2 boilerplate for visualizing the evolution of design projects as interactive skill trees.

## Features

- **2D Graph Visualization**: React Flow with automatic layout using elkjs
- **3D Constellation View**: Stubbed React Three Fiber visualization (ready for enhancement)
- **CRUD Operations**: Full create, read, update, delete for projects, nodes, and edges
- **Public Read-Only Views**: Shareable public project pages
- **Embeddable Widget**: Lightweight embed script for external sites
- **Type-Safe**: Full TypeScript support with strict types
- **Portable**: No vendor lock-in, works anywhere Remix runs

## Tech Stack

- **Framework**: Remix v2 (file-based routing)
- **Language**: TypeScript
- **UI**: React 18
- **Styling**: Tailwind CSS
- **Graph Layout**: React Flow + elkjs
- **3D**: React Three Fiber + drei (stub)
- **Database**: Prisma + SQLite (dev), easily swappable to Postgres
- **Testing**: Vitest + React Testing Library

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

The `.env` file will contain:
```
DATABASE_URL="file:./dev.db"
```

### 3. Initialize Database

```bash
npm run db:push
```

This creates the SQLite database and applies the Prisma schema.

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in your terminal).

## Available Scripts

- `npm run dev` - Start Remix development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:generate` - Generate Prisma Client

## Project Structure

```
/app
  /components       # React components (NodeCard, Graph2D, Graph3D, MediaThumb)
  /lib             # Utilities (types, elk layout, server utils, embed)
  /routes          # Remix routes (file-based routing)
  /styles          # Tailwind CSS
  entry.client.tsx # Client entry point
  entry.server.tsx # Server entry point
  root.tsx         # Root layout component
/prisma
  schema.prisma    # Database schema
/public
  media/           # Uploaded media files
/tests
  smoke.test.tsx   # Basic smoke tests
```

## Routes

- `/` - Landing page
- `/app` - Project list and creation
- `/app/:projectId` - Project editor (2D graph view with CRUD)
- `/p/:projectId` - Public read-only view (uses slug)
- `/api/embed/:projectId` - JSON API for embeds (CORS enabled)
- `/embed` - Embed script loader

## Data Model

### Project
- `id`: Unique identifier (cuid)
- `slug`: URL-friendly identifier
- `title`: Project name
- `summary`: Optional description
- `nodes`: Array of iteration nodes
- `edges`: Array of relationships between nodes

### Node
- `id`: Unique identifier
- `title`: Node name
- `dateISO`: Date string (ISO format)
- `categories`: Array of category strings (e.g., ["digital", "physical"])
- `summary`: Optional description
- `media`: Optional array of media items (images/videos)
- `metrics`: Optional key-value metrics

### Edge
- `id`: Unique identifier
- `fromId`: Source node ID
- `toId`: Target node ID
- `kind`: Optional relationship type ("improves", "reverts", "forks", etc.)

## Example: Creating Test Data

After creating a project, you can add nodes and edges programmatically. Here's an example using the browser console or a test script:

```javascript
const projectId = "YOUR_PROJECT_ID";

// Create sample nodes
await fetch(`/app/${projectId}`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    intent: "createNode",
    title: "Initial Prototype",
    dateISO: "2024-01-15",
    categories: "digital,physical",
    summary: "First iteration of the design"
  })
});

// Create another node
await fetch(`/app/${projectId}`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    intent: "createNode",
    title: "Improved Version",
    dateISO: "2024-02-20",
    categories: "digital",
    summary: "Second iteration with improvements"
  })
});

// Create an edge between nodes (replace NODE_ID_1 and NODE_ID_2 with actual IDs)
await fetch(`/app/${projectId}`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    intent: "createEdge",
    fromId: "NODE_ID_1",
    toId: "NODE_ID_2",
    kind: "improves"
  })
});
```

## Embedding Projects

### Basic Embed

Include the embed script on your page:

```html
<script src="https://yourdomain.com/embed"></script>
<div data-project="project-slug"></div>
```

The script will automatically fetch and render the project data.

### Advanced Embed (Using React)

For more control, you can use the embed viewer component directly:

```tsx
import { mountEmbedViewer } from "~/lib/embed";
import type { ProjectDTO } from "~/lib/types";

// Fetch project data
const response = await fetch("/api/embed/project-slug");
const project: ProjectDTO = await response.json();

// Mount into DOM element
const element = document.getElementById("embed-container");
if (element) {
  mountEmbedViewer(element, project);
}
```

## Extending the Project

### Adding New Categories

Categories are stored as string arrays, so you can add any category without schema changes. The type system supports extensibility:

```typescript
// In app/lib/types.ts
export type Category = "digital" | "physical" | "circuit" | "your-new-category" | (string & {});
```

### Switching to Postgres

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   ```

3. Run migrations:
   ```bash
   npm run db:push
   ```

### Adding Authentication

The codebase is designed to make adding auth easy. In `app/lib/utils.server.ts`, you can add user context:

```typescript
// Example: Add userId to project queries
export async function getProject(projectId: string, userId?: string) {
  // Add user-specific filtering here
}
```

## Development Notes

- The 3D view (`Graph3D.tsx`) is a stub implementation. Enhance it with more sophisticated layouts and interactions.
- Media uploads are not yet implemented. For now, use external URLs in the `media` field.
- The embed script is a basic implementation. Consider bundling React for a richer embed experience.
- All routes use Remix's file-based routing convention.

## License

MIT

