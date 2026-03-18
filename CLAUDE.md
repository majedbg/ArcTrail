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

### Phase 2b — Zustand Stores & Sync Layer (2026-03-18)

**Files created:**
- `app/lib/store/graphSlice.ts`, `uiSlice.ts`, `snapshotSlice.ts`, `aiSlice.ts`, `syncSlice.ts`
- `app/lib/store.ts` — composed store with persist middleware
- `app/lib/sync.ts` — syncToServer, flushQueue, setupAutoSync
- `app/hooks/useOptimisticMutation.ts`
- `tests/store/graphSlice.test.ts`, `tests/store/syncSlice.test.ts`

**Key decisions:**
- SSR-safe storage: falls back to in-memory Map when localStorage undefined.
- `sync.ts` uses dynamic `await import("./store.js")` to avoid circular dependency.
- Zustand v5 slice composition uses `as unknown as SC<T>` cast in store.ts.
- 109 tests pass across 7 test files.

### Phase 3 — Atomic Design System (2026-03-18)

**Files created:**
- `app/hooks/useTilt.ts` — CSS 3D tilt hook (auto-disables on touch/reduced-motion)
- `app/contexts/DiffContext.ts` — DiffContext + useDiffStatus hook
- `app/styles/globals.css` — .tilt-card base styles + prefers-reduced-motion
- 12 atoms: Badge, Button, Icon, Spinner, Tag, Tooltip, MediaThumb,
  MarkdownRenderer, StageChip, KindIcon, VersionBadge, SyncIndicator
- 9 molecules: ArtifactCardMinimal, ArtifactCardMedium, ArtifactCardRich,
  SnapshotVersionLabel, RelationTypePill, EntryPreview, MediaCarousel,
  KnowledgeDimensionBadges, CategoryTagRow
- Barrel exports: `atoms/index.ts`, `molecules/index.ts`

**Key decisions:**
- All components use token CSS variables or Tailwind token classes — no hardcoded hex.
- `useTilt` uses `useRef<HTMLDivElement>(null!)` for React 18 ref compatibility.
- `Icon.tsx` uses inline SVG paths — no icon library dependency.
- `MarkdownRenderer` uses react-markdown + remark-gfm + rehype-sanitize.
- `SyncIndicator` atom is dot-only; full organism variant comes in later phase.
- ArtifactCardRich: factor=12, scale=1.02; ArtifactCardMedium: factor=8, scale=1.02.
- Every component has JSDoc `@layer` annotation per spec §25.10.

### Phase 4 — Remix Routes & Data Layer (2026-03-18)

**Files created:**
- `app/lib/db.server.ts` — Prisma client singleton (survives HMR in dev)
- `app/env.d.ts` — Vite/Remix type references for CSS `?url` imports
- `app/root.tsx` — imports tokens.css + globals.css
- `app/routes/_index.tsx` — landing page with actual copy
- `app/routes/app._index.tsx` — project list loader + createProject action
- `app/routes/app.$projectSlug._index.tsx` — full ProjectGraph loader + 7 actions
  (createArtifact, updateArtifact, deleteArtifact, createRelation, deleteRelation,
  createEntry, deleteEntry)
- `app/routes/app.$projectSlug.prototype.tsx` — graph + snapshots loader + 3 actions
  (createSnapshot, deleteSnapshot, createSnapshotRelation)
- `app/routes/p.$projectSlug.tsx` — public read-only loader
- `app/routes/api.embed.$projectSlug.tsx` — JSON endpoint with CORS headers
- `app/routes/api.upload.tsx` — multipart upload to /public/uploads/
- `app/routes/api.ai.tsx` — stub returning 200 (wired in phase 7)

**Key decisions:**
- `db.server.ts` stores PrismaClient on `globalThis` in dev to survive HMR.
- SQLite JSON string fields parsed at loader boundary (categories, media, typeProps, metrics, metadata).
- `deleteArtifact` uses `$transaction` to cascade entries, components, snapshot members, and relations.
- All routes verified via `curl` — 7/7 return HTTP 200 with correct data.
- `env.d.ts` provides `vite/client` types for CSS `?url` imports in root.tsx.

### Phase 5 — GraphCanvas Organism & View (2026-03-18)

**Files created:**
- `app/components/organisms/ArtifactCard.tsx` — representation dispatcher
- `app/components/views/GraphCanvas/index.tsx` — pannable/zoomable canvas with ELK layout
- `app/components/views/GraphCanvas/SVGRelationLine.tsx` — cubic bezier with glow + animated dash
- `app/components/organisms/RelationLayerToggle.tsx` — floating pill per RelationType
- `app/components/organisms/SyncIndicator.tsx` — full organism with all 5 states + text labels

**Key decisions:**
- `graphView.ts` was already complete from Phase 2 — calls real `layoutGraph()`.
- ELK runs client-side only; SSR shows "Loading graph…" placeholder, hydrates on mount.
- `vite.config.ts` updated: `web-worker` alias + `optimizeDeps.exclude: ["elkjs"]` to resolve elkjs bundling.
- Canvas pan uses PointerEvents with `setPointerCapture` for unified mouse/touch drag.
- Wheel zoom: `deltaY * 0.001`, clamped to [0.25, 2.5].
- SVG bezier control points: vertical handles `(fromX, fromY - 60)` / `(toX, toY + 60)` for upward tree.
- Remix `json()` serializes `Date → string`; route casts `data.graph as unknown as ProjectGraph`.
- Route hydrates Zustand store from loader data via `useEffect` on mount.

### Phase 6 — ArtifactSheet, ArtifactForm, Optimistic Mutations (2026-03-18)

**Files created:**
- `app/components/organisms/ArtifactSheet.tsx` — slide-up (mobile) / side-panel (desktop),
  all content sections: header, categories, media gallery, markdown/details tabs,
  entries timeline, relations grouped by type, action row
- `app/components/organisms/ArtifactForm.tsx` — create/edit modal with two tabs (Details + Markdown),
  all fields including subsystemCode auto-generation, @uiw/react-md-editor (dynamic import),
  file upload to /api/upload, media preview with remove, optimistic mutations wired in

**Key decisions:**
- `useOptimisticMutation` wired for create/update/delete: builds optimistic Artifact,
  calls `upsertArtifact`/`removeArtifact` immediately, enqueues sync, rollbacks on error.
- MDEditor loaded via dynamic `import()` to avoid SSR issues (client-only).
- `ArtifactSheet` reads relations + linked artifacts directly from Zustand store.
- Route now renders: view toggle (Graph|Prototype|Constellation), Add Artifact button,
  ArtifactSheet overlay when selected, ArtifactForm modal for create/edit.
- `selectArtifactById` / `selectRelationsForArtifact` from graphSlice used in route for
  deriving selected artifact data from store.

### Phase 7 — AI Assistant (2026-03-18)

**Files created/updated:**
- `app/routes/api.ai.tsx` — full Anthropic SDK implementation: SSE streaming for narrator/graph-qa,
  structured JSON for snapshot-advisor, three system prompts from spec §13
- `app/components/organisms/AIAssistant.tsx` — floating panel (full-screen mobile / 380px desktop),
  three modes with labels, streaming display, typing indicator, message history in aiSlice,
  clear conversation, error state, auto-sends initial message for narrator/graph-qa

**Key decisions:**
- Anthropic SDK `messages.stream()` returns async iterable; parsed into SSE `data:` events.
- snapshot-advisor uses `messages.create()` (non-streaming) and parses JSON from response.
- API key checked before SDK init; returns 503 with clear error if missing/placeholder.
- Client fetches SSE and updates last assistant message in-place via `useStore.setState`.
- "Tell me about this" button added to ArtifactSheet action row → opens narrator mode.
- AI button added to route top bar → opens graph-qa mode with full projectGraph as context.
- Model: `claude-sonnet-4-20250514`, max_tokens: 1024.

### Phase 8 — PrototypeView & Snapshots (2026-03-18)

**Files created:**
- `app/components/molecules/SnapshotCard.tsx` — nested-rectangle snapshot card with
  DiffContext.Provider, computeSnapshotDiff, subsystem→feature→variation hierarchy,
  diff glow/strikethrough/opacity styling, tilt factor:10 scale:1.01
- `app/components/views/PrototypeView/index.tsx` — horizontal ELK layout (direction:RIGHT),
  SVG relation lines between cards, prototype selector dropdown, empty state
- `app/components/views/PrototypeView/SnapshotCreationPanel.tsx` — 2-step creation:
  Step 1 = artifact manifest checklist, Step 2 = AI version advisor + real-time grammar
  validation via parseVersionString(), chat follow-up, editable versionString

**Key decisions:**
- SnapshotCard builds subsystem→feature→variation nesting from graph relations (childMap).
- DiffContext wraps entire card; nested ArtifactBlock/ArtifactPill read diff status.
- `SnapshotRelation.relationType` populated by Prisma include but not in TS type; cast used.
- SnapshotCreationPanel calls `/api/ai` snapshot-advisor mode, pre-populates versionString
  from AI suggestion, validates grammar in real-time, allows chat follow-up.
- Prototype route updated from placeholder to render full PrototypeView.

### Phase 9 — ConstellationView (2026-03-18)

**Files created:**
- `app/components/views/ConstellationView/ParticleRelationLine.tsx` — TubeGeometry along
  CatmullRomCurve3, custom ShaderMaterial with uTime/uColor/uAnimated uniforms,
  fragment shader sin() pulse effect, full TODO block for particle system upgrade
- `app/components/views/ConstellationView/index.tsx` — R3F Canvas, Stars background,
  OrbitControls (enableDamping 0.05), concentric ring layout from deriveConstellationData(),
  sphere per artifact (color from artifactType), Text labels, click → selectArtifact()
- `app/components/views/ConstellationView/ConstellationView.client.tsx` — re-export for
  client-only dynamic import

**Key decisions:**
- ConstellationView loaded via `lazy()` + `Suspense` with "Loading 3D view…" fallback.
- WebGL cannot SSR; separate `.client.tsx` file re-exports the component.
- ParticleRelationLine is a working stub: TubeGeometry + ShaderMaterial with correct
  architecture. Full particle system (THREE.Points, 60 particles, AdditiveBlending) deferred.
- ArtifactSheet opens from 3D view via shared `selectedArtifactId` in store.
