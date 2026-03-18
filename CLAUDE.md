# ArcTrail — Claude Code Project Context

## Stack

- Remix v2 + TypeScript + React 18
- Prisma + SQLite (dev) → Postgres (prod)
- Zustand (client state) + Remix loaders (server state)
- Tailwind CSS + tokens.ts design token system
- elkjs for graph layout
- react-three-fiber + drei for ConstellationView
- @uiw/react-md-editor for markdown authoring
- Anthropic SDK for AI features

## Key conventions

- Naming: Artifact (not Node), Relation (not Edge)
- ArtifactKind enum: CONCEPT PROTOTYPE SUBSYSTEM
  FEATURE VARIATION COMPONENT
- Atomic design: atoms → molecules → organisms → views
  Remix routes are pages
- Each level imports only from levels below it
- Optimistic mutations: update Zustand first, sync server
  async, rollback on error via useOptimisticMutation hook
- Design tokens: tokens.ts → CSS vars + Tailwind theme
- ProjectGraph is the base DTO; each view derives its
  own transformed state from it
- Diff logic: pure utility functions, no hooks
- DiffContext: ancestor provides, cards consume

## Commands

- npm run dev
- npm run typecheck
- npm run db:push
- npx prisma db seed
- npm test

## File reference examples

- Component pattern: app/components/atoms/Badge.tsx
- Route pattern: app/routes/app.$projectSlug.\_index.tsx
- Derived data: app/lib/derived/graphView.ts
- Token system: app/lib/tokens.ts

## Do not touch

- prisma/schema.prisma (only edit via phase prompts)
- app/lib/tokens.ts (only edit via phase prompts)

## Session Notes

### Phase 1 — Scaffold (2026-03-18)

**Key decisions:**

- **No remix.config.ts** — using Remix v2 Vite mode; all config lives in `vite.config.ts`.
- **ArtifactKind defined locally in tokens.ts** as a string union type, NOT imported from
  `@prisma/client`. This prevents circular dep when `tailwind.config.ts` imports tokens
  at build time. The Prisma schema stores `kind` as `String`; app layer validates values.
- **SQLite schema adaptations** — SQLite (Prisma 5.x) does not support `enum`, `Json`, or
  `String[]`. All three were replaced:
  - `enum ArtifactKind` → `String` field with comment listing valid values
  - `Json?` fields → `String?` (app layer serializes/deserializes JSON)
  - `String[]` fields (`categories`, `knowledgeDimensions`) → `String` with `@default("[]")`
    (stored as JSON array string; parse at app layer)
  - When migrating to Postgres, restore `Json`, `String[]`, and `enum ArtifactKind` in schema.
- **`@types/node` + `tsx` in devDependencies** — `generateCssVars.ts` uses `fs`/`path`;
  seed script runs via `tsx`.
- **`postinstall: "prisma generate"`** — ensures Prisma client exists before any typecheck.
- **`app/styles/tokens.css` committed as pre-generated artifact** — imported in `root.tsx`
  later; regenerated anytime via `npm run generate:css`.

### Phase 2 — Type System & Pure Utilities (2026-03-18)

**Files created:**
- `app/lib/types.ts` — all app-layer types; `ArtifactKind` re-exported from `tokens.ts`
- `app/lib/version.ts` — `parseVersionString`, `generateSubsystemCode`, `diffSnapshots`,
  `inferVersionBump` with full grammar documentation
- `app/lib/diffSnapshot.ts` — `computeSnapshotDiff` returning `SnapshotDiffResult`
- `app/lib/elk.ts` — `layoutGraph` (UP direction) and `layoutPrototypeView` (RIGHT direction)
- `app/lib/derived/graphView.ts` — `deriveGraphViewData` (async, uses ELK) + pure selectors
- `app/lib/derived/prototypeView.ts` — `derivePrototypeViewData` (async, uses ELK)
- `app/lib/derived/constellationView.ts` — `deriveConstellationData` (sync, radial layout)
- `vitest.config.ts` — standalone config without Remix plugin
- `tests/version.test.ts`, `tests/diffSnapshot.test.ts`, `tests/derived/*.test.ts`

**Key decisions:**
- `Artifact` and `Relation` types include optional embedded `artifactType?` / `relationType?`
  fields (populated via Prisma `include`) so derived functions can build type maps from
  the graph alone without a separate registry argument.
- `deriveConstellationData` is **synchronous** — uses analytic radial layout (no ELK).
- `deriveGraphViewData` / `derivePrototypeViewData` are **async** — call ELK internally.
  Tests mock `app/lib/elk` entirely so no ELK WASM runs in test environment.
- `vitest.config.ts` overrides `vite.config.ts` to exclude the Remix plugin.
- 65 tests pass across 5 test files.
