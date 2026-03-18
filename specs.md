You are an expert Remix/TypeScript/React engineer. Generate
a complete, production-ready boilerplate for ArcTrail — an
interactive knowledge graph app for documenting and
visualizing the evolution of design and engineering projects.

════════════════════════════════════════════════════════

1. STACK
   ════════════════════════════════════════════════════════

- Remix v2, TypeScript, React 18
- Prisma + SQLite (dev), PostgreSQL-ready
- Custom HTML + SVG canvas (NO React Flow)
- elkjs for tree layout
- react-three-fiber + drei for ConstellationView (3D)
- @uiw/react-md-editor for markdown authoring
- Tailwind CSS, mobile-first
- Anthropic SDK (@anthropic-ai/sdk) for AI features
- Zustand for local UI state
- No Vercel-specific APIs — fully portable

Scripts: dev, build, start, typecheck, lint,
format, test, db:push, db:studio

════════════════════════════════════════════════════════ 2. NAMING CONVENTIONS (enforce everywhere, no exceptions)
════════════════════════════════════════════════════════

Database / Prisma models:
Artifact (NOT Node)
ArtifactKind (enum — structural kind)
ArtifactType (registry — semantic user-defined label)
Relation (NOT Edge — artifact-to-artifact)
RelationType (registry — typed, colored, animated)
SnapshotRelation (snapshot-to-snapshot edges)
Snapshot (versioned prototype configuration)
SnapshotMember (manifest junction — snapshot ↔ artifact)
Entry (timestamped journal log)
Stage (TRL-inspired lifecycle stage)
ComponentCatalog (global reusable parts catalog)
ArtifactComponent (junction — artifact uses catalog item)
EmbedKey (public embed access key)
Project (top-level container)

TypeScript types:
Artifact, ArtifactKind, ArtifactType
Relation, RelationType
Snapshot, SnapshotMember, SnapshotRelation
ProjectGraph (DTO: project + artifacts + relations)
Entry, Stage
ComponentCatalog, ArtifactComponent
ArtifactRepresentation ("rich"|"medium"|"minimal")
VersionString (parsed semantic version — see section 6)

React components:
GraphCanvas (main 2D interactive canvas)
ConstellationView (3D r3f view)
ArtifactCard (representation dispatcher)
ArtifactCardRich (rich card — tilt enabled)
ArtifactCardMedium (medium card — tilt enabled)
ArtifactCardMinimal (dot + label — no tilt)
ArtifactSheet (slide-up detail panel)
ArtifactForm (tabbed create/edit form)
RelationLine (animated SVG connector)
RelationLayerToggle (show/hide relation type layers)
PrototypeView (horizontal git-graph of snapshots)
SnapshotCard (nested rectangle config card)
AIAssistant (floating chat panel)

Routes:
\_index landing/marketing
app.\_index project list + create
app.$projectSlug._index         editor: GraphCanvas
  app.$projectSlug.prototype PrototypeView
p.$projectSlug                  public read-only view
  api.embed.$projectSlug JSON embed endpoint
api.upload media file upload
api.ai Anthropic AI route

════════════════════════════════════════════════════════ 3. PRISMA SCHEMA /prisma/schema.prisma
════════════════════════════════════════════════════════

generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "sqlite"
url = env("DATABASE_URL")
}

--- Registries (seeded, extensible) ---

model ArtifactType {
id String @id @default(cuid())
name String @unique
defaultRepresentation String @default("medium")
color String @default("#888888")
icon String?
schema Json?
artifacts Artifact[]
}

model RelationType {
id String @id @default(cuid())
name String @unique
label String
color String
description String?
icon String?
animated Boolean @default(true)
relations Relation[]
snapshotRelations SnapshotRelation[]
}

model Stage {
id String @id @default(cuid())
name String @unique
order Int
color String
description String?
artifacts Artifact[]
}

--- Global catalog ---

model ComponentCatalog {
id String @id @default(cuid())
name String
partNumber String?
manufacturer String?
category String?
specs Json?
datasheet String?
usages ArtifactComponent[]
}

model ArtifactComponent {
id String @id @default(cuid())
artifactId String
componentId String
quantity Int @default(1)
role String?
notes String?
artifact Artifact @relation(fields: [artifactId],
references: [id])
component ComponentCatalog @relation(fields: [componentId],
references: [id])
}

--- Core graph ---

enum ArtifactKind {
CONCEPT
PROTOTYPE
SUBSYSTEM
FEATURE
VARIATION
COMPONENT
}

model Artifact {
id String @id @default(cuid())
projectId String
artifactTypeId String?
stageId String?
kind ArtifactKind
representation String @default("medium")
title String
subsystemCode String?
dateISO String?
summary String?
contentMd String?
contentFormat String? @default("md")
showBoth Boolean @default(false)
media Json?
typeProps Json?
metrics Json?
categories String[]
catalogId String?
isPublic Boolean @default(true)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

project Project @relation(
fields: [projectId], references: [id])
artifactType ArtifactType? @relation(
fields: [artifactTypeId], references: [id])
stage Stage? @relation(
fields: [stageId], references: [id])
outgoingRelations Relation[] @relation("RelationFrom")
incomingRelations Relation[] @relation("RelationTo")
entries Entry[]
components ArtifactComponent[]
snapshotMembers SnapshotMember[]
snapshots Snapshot[] @relation("PrototypeSnapshots")
}

model Relation {
id String @id @default(cuid())
projectId String
fromId String
toId String
relationTypeId String
label String?
metadata Json?
order Int?
createdAt DateTime @default(now())

project Project @relation(
fields: [projectId], references: [id])
from Artifact @relation("RelationFrom",
fields: [fromId], references: [id])
to Artifact @relation("RelationTo",
fields: [toId], references: [id])
relationType RelationType @relation(
fields: [relationTypeId], references: [id])
}

--- Journal ---

model Entry {
id String @id @default(cuid())
artifactId String
title String
dateISO String
contentMd String?
summary String?
media Json?
knowledgeDimensions String[]
createdAt DateTime @default(now())

artifact Artifact @relation(
fields: [artifactId], references: [id])
}

--- Snapshots ---

model Snapshot {
id String @id @default(cuid())
projectId String
prototypeArtifactId String
versionString String
displayLabel String?
dateISO String
notes String?
createdAt DateTime @default(now())

project Project @relation(
fields: [projectId], references: [id])
prototypeArtifact Artifact @relation("PrototypeSnapshots",
fields: [prototypeArtifactId],
references: [id])
members SnapshotMember[]
outgoingRelations SnapshotRelation[] @relation("SnapRelFrom")
incomingRelations SnapshotRelation[] @relation("SnapRelTo")
}

model SnapshotMember {
id String @id @default(cuid())
snapshotId String
artifactId String
role String?
notes String?

snapshot Snapshot @relation(
fields: [snapshotId], references: [id])
artifact Artifact @relation(
fields: [artifactId], references: [id])
}

model SnapshotRelation {
id String @id @default(cuid())
fromSnapshotId String
toSnapshotId String
relationTypeId String
label String?
metadata Json?
createdAt DateTime @default(now())

from Snapshot @relation("SnapRelFrom",
fields: [fromSnapshotId], references: [id])
to Snapshot @relation("SnapRelTo",
fields: [toSnapshotId], references: [id])
relationType RelationType @relation(
fields: [relationTypeId], references: [id])
}

--- Project & embed ---

model Project {
id String @id @default(cuid())
slug String @unique
title String
summary String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

artifacts Artifact[]
relations Relation[]
snapshots Snapshot[]
embedKeys EmbedKey[]
}

model EmbedKey {
id String @id @default(cuid())
projectId String
publicKey String @unique
isActive Boolean @default(true)
createdAt DateTime @default(now())

project Project @relation(
fields: [projectId], references: [id])
}

════════════════════════════════════════════════════════ 4. SEED DATA /prisma/seed.ts
════════════════════════════════════════════════════════

Seed all registries so the app works out of the box.

ArtifactType rows:
Concept defaultRepresentation:rich color:#7F77DD
Prototype defaultRepresentation:rich color:#1D9E75
Subsystem defaultRepresentation:medium color:#378ADD
Feature defaultRepresentation:medium color:#BA7517
Variation defaultRepresentation:minimal color:#888780
Component defaultRepresentation:minimal color:#D4537E
Person defaultRepresentation:medium color:#639922
Location defaultRepresentation:medium color:#9B59B6
Event defaultRepresentation:medium color:#D85A30

Stage rows (ordered 0–6):
idea(0,#7F77DD) · research(1,#378ADD) ·
experiment(2,#1D9E75) · prototype(3,#BA7517) ·
validate(4,#EF9F27) · tune(5,#D85A30) ·
deploy(6,#D4537E)

RelationType rows:
ITERATES_ON label:"Iterates on" color:#3DDDF2 animated:true
FORKS_FROM label:"Forks from" color:#9B59B6 animated:true
USES_COMPONENT label:"Uses" color:#FFC876 animated:false
CONTRIBUTED_BY label:"Contributed by" color:#A8E6CF animated:false
DISPLAYED_AT label:"Displayed at" color:#FF6DB4 animated:false
PARENT_OF label:"Parent of" color:#555555 animated:false

Seed one demo Project "VisFrame" slug:"visframe":

- CONCEPT artifact "VisFrame"
  kind:CONCEPT representation:rich stage:idea
- PROTOTYPE artifact "Sonoform No.1"
  kind:PROTOTYPE representation:rich stage:prototype
- SUBSYSTEM "Audio Input"
  kind:SUBSYSTEM subsystemCode:"AI" stage:experiment
- SUBSYSTEM "Light Output"
  kind:SUBSYSTEM subsystemCode:"LO" stage:experiment
- FEATURE "RCA Input"
  kind:FEATURE stage:prototype
- FEATURE "Layered Acrylic Panels"
  kind:FEATURE stage:prototype
- Relations (all PARENT_OF):
  VisFrame → Sonoform No.1
  Sonoform No.1 → Audio Input
  Sonoform No.1 → Light Output
  Audio Input → RCA Input
  Light Output → Layered Acrylic Panels
- One Snapshot:
  versionString:"AI.RCA1-LO.LAP1"
  displayLabel:"Initial build"
  prototypeArtifactId: Sonoform No.1
  members: all four non-concept artifacts

════════════════════════════════════════════════════════ 5. TYPE DEFINITIONS /app/lib/types.ts
════════════════════════════════════════════════════════

Export all types mirroring Prisma models. Additionally:

export type ArtifactRepresentation =
"rich" | "medium" | "minimal" | (string & {})

export type KnowledgeDimension =
"form" | "function" | "manufacturing" | "ux" | "performance"

export type VersionSegment = {
subsystemCode: string // e.g. "AI"
featureCode: string // e.g. "RCA"
iteration: number // e.g. 1
forkSuffix?: string // e.g. "a" | "b"
componentMajor?: number // e.g. 1
componentMinor?: number // e.g. 2
}

export type VersionString = {
raw: string // e.g. "AI.RCA1.2.0-LO.LAP2"
segments: VersionSegment[]
}

export type SnapshotDiff = {
added: string[] // artifactIds in B not in A
removed: string[] // artifactIds in A not in B
unchanged: string[] // artifactIds in both
}

export type ProjectGraph = {
project: Project
artifacts: Artifact[]
relations: Relation[]
snapshots: Snapshot[]
}

export type RepresentationConfig = {
component: string
requiredProps: string[]
optionalProps: string[]
}

export const REPRESENTATION_REGISTRY:
Record<ArtifactRepresentation, RepresentationConfig> = {
rich: {
component: "ArtifactCardRich",
requiredProps: ["title","summary","media","categories"],
optionalProps: ["contentMd","metrics","links"]
},
medium: {
component: "ArtifactCardMedium",
requiredProps: ["title","categories"],
optionalProps: ["summary","media"]
},
minimal: {
component: "ArtifactCardMinimal",
requiredProps: ["title"],
optionalProps: ["categories"]
},
}

════════════════════════════════════════════════════════ 6. VERSION STRING UTILITIES /app/lib/version.ts
════════════════════════════════════════════════════════

Document the grammar at the top of this file:

Version string grammar:
version ::= segment ("-" segment)\*
segment ::= subsystemCode "." featureCode iteration
[forkSuffix] ["." componentMajor
"." componentMinor]
subsystemCode ::= UPPERCASE+ e.g. AI, LO, SP
featureCode ::= UPPERCASE+ e.g. RCA, LAP, CI
iteration ::= DIGIT+ e.g. 1, 2, 3
forkSuffix ::= LOWERCASE e.g. a, b, c
componentMajor/Minor ::= DIGIT+

Semver change rules:

- Component/variation diff → componentMinor++, ITERATES_ON
- Component swap → componentMajor++, ITERATES_ON
- Feature iterated → iteration++, ITERATES_ON
- Feature replaced → new featureCode, FORKS_FROM
- Subsystem added → append segment, ITERATES_ON
- Subsystem swapped → new subsystemCode, FORKS_FROM
- Parallel fork (same parent+iteration) → append a/b/c suffix

Implement and export:

parseVersionString(raw: string): VersionString
Parse "AI.RCA1.2.0-LO.LAP2" into VersionString.
Handle optional componentMajor.componentMinor.
Handle optional forkSuffix (lowercase letter after digits).

generateSubsystemCode(name: string, existing: string[]): string
Take "Audio Input" → "AI" (initials of each word).
If collision in existing[] → first 3 chars of first word.
If still collision → append digit suffix (AI2, AI3...).
User can always override after generation.

diffSnapshots(a: Snapshot, b: Snapshot): SnapshotDiff
Set comparison of SnapshotMember.artifactId lists.

inferVersionBump(
parentSnapshot: Snapshot,
diff: SnapshotDiff,
artifacts: Artifact[]
): { suggestion: string; reasoning: string;
relationType: "ITERATES_ON" | "FORKS_FROM" }
Determine bump level from ArtifactKind of changed items:
only COMPONENT/VARIATION changed → componentMinor++
FEATURE changed → new featureCode or iteration++
SUBSYSTEM changed → new subsystemCode or append
Return suggested raw version string + plain English
reasoning for AI to present to the user.
This output is passed to the AI route as pre-analysis
context — AI may refine or override it.

════════════════════════════════════════════════════════ 7. ELK LAYOUT HELPER /app/lib/elk.ts
════════════════════════════════════════════════════════

layoutGraph(
artifacts: Artifact[],
relations: Relation[]
): Promise<Record<string, {x: number, y: number}>>

Use elkjs with:
algorithm: "layered"
direction: "UP" ← root at bottom, grows upward
spacing.nodeNode: "40"
layered.spacing.nodeNodeBetweenLayers: "80"
Node sizes: rich=280x120, medium=200x80, minimal=48x48
Returns map of artifactId → {x, y} position

layoutPrototypeView(
snapshots: Snapshot[],
relations: SnapshotRelation[]
): Promise<Record<string, {x: number, y: number}>>

Use elkjs with:
algorithm: "layered"
direction: "RIGHT" ← horizontal git-graph
spacing.nodeNode: "40"
layered.spacing.nodeNodeBetweenLayers: "120"
Node size: 320x200 per snapshot card
Returns map of snapshotId → {x, y} position

════════════════════════════════════════════════════════ 8. CANVAS COMPONENT /app/components/GraphCanvas.tsx
════════════════════════════════════════════════════════

Rendering approach: React components for cards
(absolutely positioned divs inside a pannable container)

- a React SVG overlay component for relation lines.
  No React Flow.

All card variants (ArtifactCardRich, ArtifactCardMedium,
ArtifactCardMinimal) are modular React components
receiving artifact data as props, fully decoupled from
canvas positioning logic.

RelationLine is a React component returning SVG <path>
elements, living in its own file.

Pan/zoom applied via CSS transform on the inner container
div — cards and SVG overlay move as one unit. SVG overlay
has pointerEvents:none so clicks reach card components.

Canvas behaviors:

- Drag canvas to pan (touch and mouse, use PointerEvents)
- Pinch to zoom (touch) / scroll wheel (desktop)
- Tap/click artifact card → sets selectedArtifactId
- NO individual artifact dragging
- Root artifact(s) at bottom, branches grow upward

Structure:

<div class="canvas-viewport" overflow:hidden>
  <div class="canvas-inner" 
       style={{ transform: "translate(x,y) scale(z)" }}>
    
    {artifacts.map(a => (
      <ArtifactCard
        key={a.id}
        artifact={a}
        style={{ position:"absolute", 
                 left:positions[a.id].x, 
                 top:positions[a.id].y }}
        onClick={() => selectArtifact(a.id)}
      />
    ))}

    <svg style={{ position:"absolute", inset:0,
                  pointerEvents:"none",
                  width:canvasW, height:canvasH }}>
      {relations
        .filter(r => activeRelationTypes.includes(r.relationTypeId))
        .map(r => (
          <RelationLine key={r.id} relation={r}
                        positions={positions}
                        relationType={relationTypeMap[r.relationTypeId]} />
        ))}
    </svg>

  </div>
</div>

RelationLine component:

- Cubic bezier <path> between card center bottom →
  card center top (upward tree direction)
- stroke color from relationType.color
- When relationType.animated: CSS stroke-dasharray
  animation, flow direction follows edge direction
  (use stroke-dashoffset animation at 1s linear infinite)
- Subtle filter: drop-shadow in relation color at
  low opacity for glow effect
- fill: none on all paths

RelationLayerToggle:

- Floating pill top-right of canvas viewport
- One toggle button per RelationType
  (colored dot + short label)
- PARENT_OF active by default, others inactive
- State in useGraphStore.activeRelationTypes

ArtifactCard dispatcher:
Reads artifact.representation, renders:
"rich" → ArtifactCardRich (tilt enabled)
"medium" → ArtifactCardMedium (tilt enabled)
"minimal" → ArtifactCardMinimal (no tilt)
default → ArtifactCardMedium

ArtifactCardRich:

- Width 280px, min-height 120px
- Left border accent: artifactType.color (4px solid)
- Top-right: Stage badge (colored pill)
- Title (bold), date (muted small)
- Category badges row
- First media thumbnail (if exists):
  64px × 40px rounded, object-cover
- Summary snippet: 2 lines max, text-ellipsis
- Bottom: ArtifactKind badge + icon
- Tailwind: rounded-2xl, bg-white/90 dark:bg-zinc-900/90,
  shadow-md, backdrop-blur-sm

ArtifactCardMedium:

- Width 200px, min-height 80px
- Left border accent: artifactType.color
- Title, category badges, kind icon
- No media thumbnail

ArtifactCardMinimal:

- 48×48px circle or rounded square
- Background: artifactType.color at 20% opacity
- Border: artifactType.color
- Center: 2-letter initials or kind icon
- Label beneath: artifact.title, 10px, max 12 chars
- No tilt

All cards:

- Mobile touch target minimum 44×44px
- onClick → open ArtifactSheet
- class="tilt-card" on Rich and Medium

════════════════════════════════════════════════════════ 9. ARTIFACT SHEET /app/components/ArtifactSheet.tsx
════════════════════════════════════════════════════════

Mobile: slides up from bottom
(transform: translateY, transition 300ms ease-out)
Desktop (≥768px): side panel slides in from right
(transform: translateX, transition 300ms ease-out)
Backdrop: semi-transparent overlay behind sheet on mobile
Close: tap backdrop, swipe down (mobile), or X button

Contents (in order):

1. Handle bar (mobile only) — drag indicator pill
2. Header: title, ArtifactKind badge, Stage badge, date,
   close button
3. Category badges row
4. Media gallery: horizontal scroll carousel
   image/video thumbnails (80×60px), tap to fullscreen
   Fullscreen: fixed overlay with prev/next navigation
5. Content area:
   - contentMd exists AND showBoth false
     → render markdown only
     (react-markdown + remark-gfm + rehype-sanitize)
   - contentMd exists AND showBoth true
     → tabs: "Markdown" | "Details"
   - no contentMd → Details only
     (summary text + media grid 2-col)
6. Entries timeline:
   Scrollable list of Entry records, newest first.
   Each entry: date pill, title, knowledgeDimensions
   badges (form/function/manufacturing/ux/performance),
   summary or markdown preview (3 lines max),
   "Expand" to open full entry.
7. Components section:
   List of ArtifactComponent records.
   Each: catalog name, quantity, role badge, notes.
   "View in catalog" link (placeholder for now).
8. Relations section:
   Grouped by RelationType (colored header per group).
   Each relation: direction arrow, linked artifact title,
   click → navigate to that artifact (selectArtifact).
9. Action row (sticky bottom):
   - "Tell me about this" → AIAssistant narrator mode
   - "Edit" → open ArtifactForm pre-filled
   - "Add Entry" → inline entry form slides in

════════════════════════════════════════════════════════ 10. ARTIFACT FORM /app/components/ArtifactForm.tsx
════════════════════════════════════════════════════════

Used for create and edit. Two tabs: "Details" | "Markdown"
Default tab: Details for new; Markdown if contentMd exists.

Details tab fields:

- title (input, required)
- kind (select: ArtifactKind values)
- artifactTypeId (select from ArtifactType registry)
- stageId (select from Stage registry, colored options)
- dateISO (date input)
- categories (multi-value tag input — type + enter)
- subsystemCode (text input, only for SUBSYSTEM kind,
  auto-populated via generateSubsystemCode(),
  user-overridable, shown with tooltip explaining codes)
- summary (textarea, 4 rows)
- representation (select: rich | medium | minimal,
  with preview thumbnail of each card style)
- showBoth (checkbox, only visible when Markdown tab
  has content: "Show both markdown and details in view")
- Media uploader: drag-and-drop zone + file input,
  accepts image/_ video/_, multiple files,
  calls /api/upload on selection, shows preview
  thumbnails with ×remove button,
  tip: "TODO: swap /public/uploads to S3/R2"
- Tip text at bottom: "Markdown content (Markdown tab)
  takes precedence in view mode unless 'Show both' is on"

Markdown tab:

- Tip at top: "Markdown overrides Details in view mode
  unless 'Show both' is enabled on the Details tab"
- @uiw/react-md-editor, height:360, bound to contentMd
- Supports image paste → calls /api/upload → inserts URL

Hidden inputs in Remix <Form>:
mediaJson, contentMd, contentFormat, showBoth

Action intent values:
createArtifact | updateArtifact | deleteArtifact

════════════════════════════════════════════════════════ 11. PROTOTYPE VIEW /app/components/PrototypeView.tsx
════════════════════════════════════════════════════════

Route: app.$projectSlug.prototype

Top bar:

- Prototype selector dropdown (if project has multiple
  PROTOTYPE artifacts)
- "Create Snapshot" button (opens creation panel)
- "Ask AI about this prototype" → AIAssistant graph-qa mode
  with this prototype's full snapshot history as context

Layout:

- Horizontally scrollable container
- elkjs layout direction:RIGHT
- SnapshotRelation lines as SVG between cards
  ITERATES_ON: blue (#3DDDF2), animated dash flow
  FORKS_FROM: purple (#9B59B6), animated dash flow
- Empty state: "No snapshots yet. Create the first
  snapshot to start tracking versions."

SnapshotCard component (/app/components/SnapshotCard.tsx):

- Width 320px, variable height
- Outer rounded rect:
  header shows prototype name + versionString (monospace)
  - displayLabel if present + date
- Inner nested rects per subsystem (one per SUBSYSTEM
  artifact in this snapshot's members):
  - Subsystem rect: title + subsystemCode badge,
    background: artifactType.color at 15% opacity,
    border: artifactType.color
  - Inside each subsystem: feature rects
    (smaller, nested padding 8px)
  - Inside each feature: variation/component pills
    (small colored pills at bottom of feature rect)
- Diff highlighting vs parent snapshot:
  Added artifacts: border glows amber (#FFC876),
  label "NEW" badge
  Removed artifacts: shown with strikethrough +
  coral tint, label "REMOVED"
  Modified artifacts: border glows blue (#3DDDF2),
  label "CHANGED"
  Unchanged: opacity 0.5, no border highlight
- Tap card → opens snapshot detail panel:
  full member list, version string, display label,
  date, notes, "Ask AI about this snapshot" button,
  "Delete snapshot" (with confirmation)

Snapshot creation panel (slide-up sheet):
Step 1 — Manifest:
Checklist of all artifacts in this prototype's
current graph (pre-ticked). User can adjust.
"Continue" button.

Step 2 — AI version advisor:
Call /api/ai in snapshot-advisor mode:
Send: parent snapshot members, new manifest,
diff (from diffSnapshots), artifact details,
inferVersionBump() pre-analysis
Receive: { versionString, reasoning, relationType }
Show:
AI reasoning text (styled as assistant message)
Editable versionString input
(pre-filled with AI suggestion, monospace font,
real-time parse validation — show error if
grammar invalid)
displayLabel text input
dateISO date input (defaults today)
Chat input: "Ask AI to reconsider..."
→ appends message to conversation,
re-calls /api/ai with updated context
"Confirm & Create" button
"Back" button

════════════════════════════════════════════════════════ 12. CONSTELLATION VIEW
/app/components/ConstellationView.tsx
════════════════════════════════════════════════════════

Stub — structure correct, polish deferred.
Must be wrapped in dynamic import with ssr:false in
Remix (WebGL cannot SSR).

- R3F Canvas with Stars background (drei Stars)
- Camera: position [0, 4, 14], fov:50
- AmbientLight intensity:0.6 + DirectionalLight
- Each artifact = sphere mesh:
  radius: rich=0.4, medium=0.28, minimal=0.16
  color: artifactType.color
  position: radial layout grouped by ArtifactKind
  (CONCEPT center, PROTOTYPE ring 1, SUBSYSTEM ring 2,
  FEATURE/VARIATION/COMPONENT ring 3)
- Relations = LineSegments between sphere centers,
  color: relationType.color
- Labels: drei <Text> above each sphere,
  font-size: 0.22, color white
- OrbitControls with enableDamping dampingFactor:0.05
- Click sphere → sets selectedArtifactId in useGraphStore
  (same store as GraphCanvas — shared selection state,
  ArtifactSheet opens regardless of which view is active)
- TODO comment: add bloom (drei EffectComposer + Bloom)
  for constellation glow effect in future enhancement

════════════════════════════════════════════════════════ 13. AI ASSISTANT /app/components/AIAssistant.tsx
════════════════════════════════════════════════════════

Floating panel, position: fixed bottom-right.
Toggle button: always visible, bottom-right corner,
icon: chat bubble, shows unread indicator dot.
Panel: 380px wide, 520px tall, slides up from button.
Mobile: full-screen sheet when open.

Three modes:

Mode 1 — artifact-narrator
Triggered by: "Tell me about this" in ArtifactSheet
Context payload: { artifact, entries, relations,
relatedArtifacts }
System prompt:
"You are a design historian for ArcTrail, a
knowledge graph for design processes. Given the
artifact data below, narrate its evolution as
engaging prose. Highlight what changed, what was
learned, and why decisions were made. Be specific
and technical where the data supports it.
Write in plain paragraphs — no markdown headers.
Reference specific entry dates and changes."

Mode 2 — snapshot-advisor
Triggered by: snapshot creation flow (step 2)
Context payload: { parentSnapshot, diff, artifacts,
priorAnalysis (from inferVersionBump) }
System prompt:
"You are a semantic versioning assistant for ArcTrail.
Version string grammar:
SUBSYSTEM_CODE.FEATURE_CODEiteration[fork_suffix]
[.COMPONENT_MAJOR.COMPONENT_MINOR] per subsystem,
segments separated by hyphens.

    Rules:
    - Component/variation changed → componentMinor++,
      ITERATES_ON
    - Component swapped → componentMajor++, ITERATES_ON
    - Feature iterated (same concept) → iteration++,
      ITERATES_ON
    - Feature replaced (new concept) → new FEATURE_CODE,
      reset iteration to 1, FORKS_FROM
    - Subsystem added → append new segment, ITERATES_ON
    - Subsystem swapped → new subsystemCode, FORKS_FROM
    - Parallel forks at same parent+iteration →
      append a/b/c suffix, FORKS_FROM

    A prior algorithmic analysis is provided as context.
    You may agree with it or refine it based on the
    artifact descriptions and design intent.

    Respond with valid JSON only:
    {
      versionString: string,
      reasoning: string,
      relationType: 'ITERATES_ON' | 'FORKS_FROM'
    }"

Mode 3 — graph-qa
Triggered by: AI button in editor top bar
Context payload: full ProjectGraph serialized as JSON
System prompt:
"You are an expert on this ArcTrail design project.
Answer questions about its artifacts, evolution,
decisions, and relationships. Be specific — reference
artifact names, version strings, entry dates, and
stage progression where relevant. If asked to
summarize the project, describe the concept, its
prototypes, subsystems, and how they have evolved."

All modes:

- Streaming via Anthropic SDK with stream()
- Message history in useAIStore
- User can type follow-up messages freely
- Mode label shown in panel header
  ("Artifact story" | "Version advisor" | "Project Q&A")
- "Clear conversation" button
- Typing indicator: animated 3-dot pulse during stream
- Error state: "AI unavailable — check ANTHROPIC_API_KEY"

════════════════════════════════════════════════════════ 14. AI ROUTE /app/routes/api.ai.tsx
════════════════════════════════════════════════════════

POST handler only.

Request body:
{
mode: "narrator" | "snapshot-advisor" | "graph-qa"
context: unknown
messages: { role: "user"|"assistant", content: string }[]
userMessage: string
}

- Import Anthropic from "@anthropic-ai/sdk"
- Key: process.env.ANTHROPIC_API_KEY (server-side only,
  NEVER expose to client)
- Model: "claude-sonnet-4-20250514"
- max_tokens: 1024
- Build messages array: system prompt for mode +
  context injected as first user message +
  conversation history + new userMessage
- For snapshot-advisor: parse JSON from response text,
  validate { versionString, reasoning, relationType },
  return as structured JSON response (not streamed)
- For narrator and graph-qa: stream response as
  text/event-stream (SSE):
  return new Response(readable, {
  headers: {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive"
  }
  })

════════════════════════════════════════════════════════ 15. UPLOAD ROUTE /app/routes/api.upload.tsx
════════════════════════════════════════════════════════

POST handler, multipart/form-data, field name: "file"
(supports multiple).

- Parse with unstable_parseMultipartFormData
- Save to /public/uploads/<uuid>-<originalFilename>
- Accept: image/_, video/_
- Reject others with 415 Unsupported Media Type
- Max 10MB per file — reject larger with 413
- Return JSON:
  { items: { type:"img"|"video", src:string, alt:string }[] }
- TODO comment:
  "Swap writeFile to S3/R2 SDK upload here.
  Replace src with CDN URL from upload response."

════════════════════════════════════════════════════════ 16. EMBED SYSTEM
════════════════════════════════════════════════════════

/app/routes/api.embed.$projectSlug.tsx
GET handler.
Fetch Project + Artifacts + Relations by slug.
If project.isPublic false → 401 unless valid
?key= matches active EmbedKey.
Return ProjectGraph as JSON.
Headers:
Access-Control-Allow-Origin: \*
Cache-Control: public, max-age=60
Content-Type: application/json

/app/routes/embed.\_index.tsx
GET handler.
Content-Type: text/javascript
Returns JS loader string that: 1. Finds all

<div data-arctrail-project="SLUG"> on the page 2. Fetches /api/embed/SLUG for each 3. Creates a minimal read-only GraphCanvas
via ReactDOM.createRoot (no React Router) 4. Mounts into the div
Note: embed bundle should be built separately
(esbuild/rollup) for production — this route returns
a dev-friendly version for now.
TODO comment: "Build embed.js as standalone UMD bundle
via separate esbuild script for production CDN hosting."

════════════════════════════════════════════════════════ 17. ROUTES
════════════════════════════════════════════════════════

\_index.tsx
Landing page.
Hero: "ArcTrail" + tagline "Map your creative evolution."
Subhead: "Document your design process as a living
knowledge graph. Every iteration, every decision,
every version — connected."
CTA: "Open App" → /app
Simple, clean. No images needed — just typography.

app.\_index.tsx
Loader: list all Projects
Action intent:"createProject":
validate title (required), auto-generate slug from
title (kebab-case, unique), create Project,
redirect to /app/:slug
UI:
Grid of project cards (title, summary, artifact count,
last updated)
"New Project" button → inline create form
Empty state: "No projects yet. Create your first."

app.$projectSlug.\_index.tsx
Loader:
fetch full ProjectGraph for slug
fetch all ArtifactTypes, RelationTypes, Stages
(for forms/selects)
return { graph, artifactTypes, relationTypes, stages }

Actions:
createArtifact — validate, create, return updated graph
updateArtifact — validate, update, return updated graph
deleteArtifact — cascade delete entries/components,
return updated graph
createRelation — validate fromId≠toId, create
deleteRelation — delete by id
createEntry — validate, create entry on artifact
deleteEntry — delete by id

UI layout:
Top bar (sticky):
Left: project title (editable inline)
Center: view toggle pills
"Graph" | "Prototype" | "Constellation"
Right: "Add Artifact" button, AI chat button

    Main area (full viewport minus top bar):
      view === "graph" → GraphCanvas
      view === "prototype" → link to .prototype route
      view === "constellation" → ConstellationView
        (dynamic import, ssr:false)

    Overlays:
      ArtifactSheet when selectedArtifactId is set
      ArtifactForm modal when creating/editing artifact

app.$projectSlug.prototype.tsx
Loader: fetch ProjectGraph + all Snapshots with members + SnapshotRelations for this project
Actions:
createSnapshot — validate, create Snapshot + members + SnapshotRelation from parent
deleteSnapshot — delete by id (with member cascade)
createSnapshotRelation — create typed relation
UI: PrototypeView component

p.$projectSlug.tsx
Loader: fetch ProjectGraph (public only)
UI:
Read-only GraphCanvas (no edit controls, no add button)
ArtifactSheet in read-only mode (no edit/add buttons)
AI narrator available ("Tell me about this" button)
"Made with ArcTrail" badge bottom-right

════════════════════════════════════════════════════════ 18. ZUSTAND STORE /app/lib/store.ts
════════════════════════════════════════════════════════

useGraphStore:
projectGraph: ProjectGraph | null
selectedArtifactId: string | null
editingArtifactId: string | null // null = create mode
showArtifactForm: boolean
view: "graph" | "prototype" | "constellation"
activeRelationTypes: string[] // RelationType ids
setProjectGraph(g: ProjectGraph): void
setView(v: ViewMode): void
selectArtifact(id: string | null): void
openArtifactForm(id?: string): void
closeArtifactForm(): void
toggleRelationType(id: string): void
initActiveRelationTypes(types: RelationType[]): void
// sets PARENT_OF active by default, others inactive

useAIStore:
mode: "narrator"|"snapshot-advisor"|"graph-qa" | null
context: unknown
messages: { role: "user"|"assistant",
content: string,
timestamp: number }[]
isStreaming: boolean
isOpen: boolean
openWithMode(mode, context): void
close(): void
appendMessage(msg): void
setStreaming(v: boolean): void
clearMessages(): void

════════════════════════════════════════════════════════ 19. TILT EFFECT /app/hooks/useTilt.ts
════════════════════════════════════════════════════════

Implement the CSS 3D tilt effect inspired by the
technique in simeydotme/pokemon-cards-css.

NO holographic effects. NO shimmer. NO glare.
NO reflections. Clean tilt rotation only.

export type TiltOptions = {
factor?: number // rotation degrees (default: 12)
scale?: number // hover lift (default: 1.02)
perspective?: number // CSS perspective px (default: 600)
transitionMs?: number // spring-back ms (default: 150)
disabled?: boolean // skip effect entirely
}

useTilt(options?: TiltOptions): {
ref: RefObject<HTMLDivElement>,
onMouseMove: MouseEventHandler,
onMouseLeave: MouseEventHandler
}

Mechanics:
onMouseMove:
rect = el.getBoundingClientRect()
x = (e.clientX - rect.left) / rect.width - 0.5
y = (e.clientY - rect.top) / rect.height - 0.5
rotateY = x _ factor (left/right)
rotateX = -y _ factor (up/down, inverted)
el.style.transform = `    perspective(${perspective}px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(${scale})
 `

onMouseLeave:
el.style.transform = `    perspective(${perspective}px)
      rotateX(0deg) rotateY(0deg) scale(1)
 `
(transition handles smooth spring-back)

Auto-disable when:
window.matchMedia("(hover: none)").matches
(touch-only devices — no hover capability)
OR window.matchMedia("(prefers-reduced-motion: reduce)")
.matches

Required CSS on tilt-enabled elements (.tilt-card):
transform-style: preserve-3d
will-change: transform
transition: transform {transitionMs}ms ease-out
cursor: pointer

Add to globals.css:
.tilt-card {
transform-style: preserve-3d;
will-change: transform;
cursor: pointer;
}
@media (prefers-reduced-motion: reduce) {
.tilt-card {
transition: none !important;
transform: none !important;
}
}

Apply useTilt with these parameters per component:
ArtifactCardRich: factor:12 scale:1.02
ArtifactCardMedium: factor:8 scale:1.02
ArtifactCardMinimal: NO tilt (too small)
SnapshotCard: factor:10 scale:1.01

The tilt effect must not interfere with:

- Canvas pan (tilt is on card divs, pan is on
  canvas-inner container — no conflict)
- ArtifactSheet open (onClick fires after tilt moves)
- Touch pan on mobile (auto-disabled on touch devices)

TODO comment in useTilt.ts:
"Enhancement: add deviceorientation gyroscope tilt
for mobile — rotate card based on device tilt angle
using window.addEventListener('deviceorientation').
Disabled for now; enable when touch tilt is desired."

════════════════════════════════════════════════════════ 20. ENV + DOCKER
════════════════════════════════════════════════════════

.env.example:
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..."
SESSION_SECRET="change-me-in-production"
NODE_ENV="development"

Dockerfile (multi-stage, portable, no Vercel deps):
FROM node:20-alpine AS build
WORKDIR /app
COPY package\*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]

.dockerignore:
node_modules
.env
dev.db

════════════════════════════════════════════════════════ 21. README.md
════════════════════════════════════════════════════════

Generate a complete README.md covering:

1. Project overview — what ArcTrail is, tagline,
   screenshot placeholder
2. Setup:
   cp .env.example .env
   npm install
   npm run db:push
   npx prisma db seed
   npm run dev
3. Architecture overview:
   - Remix routes map
   - Data flow: loader → ProjectGraph → stores → canvas
   - Canvas rendering approach (React components + SVG)
4. Data model summary — one paragraph per entity
5. Version string grammar — full grammar with examples
   (copy from section 6 comments)
6. Extending the system:
   - Adding new ArtifactTypes (add row to ArtifactType table)
   - Adding new RelationTypes (add row to RelationType table)
   - Adding new Stages (add row to Stage table, set order)
   - Adding new card representations
     (add to REPRESENTATION_REGISTRY, create component)
7. Card tilt effect:
   - How useTilt works
   - Tuning factor/scale per card type
   - Disabling per-instance (pass disabled:true)
   - Mobile: auto-disabled on touch devices
   - Future: gyroscope tilt enhancement (see TODO)
8. AI features:
   - Three modes and when each is used
   - How to set ANTHROPIC_API_KEY
   - Streaming architecture
9. Deploying with Docker:
   docker build -t arctrail .
   docker run -p 3000:3000 --env-file .env arctrail
10. TODO comments index — list all TODO locations
    and what they mark

════════════════════════════════════════════════════════ 22. INLINE DOCUMENTATION REQUIREMENTS
════════════════════════════════════════════════════════

Every file must include:

- JSDoc on all exported functions and types
- Inline comments explaining non-obvious logic:
  version string parsing and grammar validation,
  snapshot diff algorithm,
  elk layout configuration and direction choices,
  SVG bezier curve math for RelationLine,
  CSS transform math in useTilt,
  canvas pan/zoom pointer event handling
- TODO comments at:
  /api/upload: swap local storage for S3/R2
  useTilt.ts: gyroscope enhancement for mobile
  ConstellationView: bloom/glow post-processing
  embed route: standalone UMD bundle build script
  all route actions: add auth middleware here
  when multi-user is implemented

════════════════════════════════════════════════════════ 23. ACCEPTANCE CRITERIA
════════════════════════════════════════════════════════

After generation these commands must succeed
in order:
cp .env.example .env
npm install
npm run db:push
npx prisma db seed
npm run typecheck ← zero errors
npm run build ← clean build
npm run dev ← starts on :3000

Then verify manually:

1. / loads landing page with ArcTrail name + tagline
2. /app shows project list with seeded "VisFrame"
3. /app/visframe loads GraphCanvas with seeded artifacts
   laid out bottom-root-upward, PARENT_OF relations shown
4. Hovering ArtifactCardRich shows 3D tilt effect
5. Clicking an artifact opens ArtifactSheet with all
   sections populated from seed data
6. "Add Artifact" opens ArtifactForm with both tabs
7. Uploading a file calls /api/upload, previews appear
8. RelationLayerToggle shows/hides relation layers
9. View toggle switches Graph → Prototype → Constellation
10. /app/visframe/prototype loads PrototypeView with
    seeded snapshot card showing nested rectangles
11. "Create Snapshot" opens AI-assisted creation panel
    (requires ANTHROPIC_API_KEY)
12. "Tell me about this" in ArtifactSheet opens AI panel
    in narrator mode and streams a response
13. /p/visframe loads public read-only view, no edit UI
14. GET /api/embed/visframe returns valid ProjectGraph JSON
15. npm run typecheck passes with zero errors
16. No console errors on any of the above routes

════════════════════════════════════════════════════════ 24. DEPENDENCY LIST
════════════════════════════════════════════════════════

Generate package.json with exactly these dependencies:

dependencies:
@anthropic-ai/sdk
@prisma/client
@react-three/drei
@react-three/fiber
@uiw/react-md-editor
@uiw/react-markdown-preview
elkjs
react
react-dom
react-markdown
rehype-sanitize
remark-gfm
three
zustand
@remix-run/node
@remix-run/react
@remix-run/serve
isbot

devDependencies:
@remix-run/dev
@types/react
@types/react-dom
@types/three
autoprefixer
postcss
prisma
tailwindcss
typescript
vite
vitest
@testing-library/react
@testing-library/jest-dom
eslint
prettier

════════════════════════════════════════════════════════ 25. FRONTEND ARCHITECTURE
════════════════════════════════════════════════════════

This section defines the frontend data flow, component
architecture, state management, and design system
conventions. Claude Code must propose and implement
the full atomic design folder structure for this
specific app — do not use a generic structure.

────────────────────────────────────────────────────────
25.1 DATA FLOW ARCHITECTURE
────────────────────────────────────────────────────────

The app uses an editor-style architecture with three
distinct layers of truth:

INTERACTION TRUTH
Zustand store — what the user is doing right now.
Immediate, optimistic, drives all UI rendering.
Never waits for server confirmation to update UI.

PERSISTED TRUTH
Remix actions + Prisma — what the server has saved.
Updated asynchronously after Zustand is already
updated. Source of recovery after refresh/crash.

SYNC TRUTH
A dedicated sync layer tracking pending, in-flight,
failed, and retried mutations. Zustand persists to
localStorage as offline durability layer — if the
connection drops, pending mutations queue and retry
when connectivity returns.

ProjectGraph is the base DTO loaded by Remix loaders
on initial page load and hydrated into Zustand. Each
view then derives its own transformed state from the
Zustand graph — the 2D canvas, prototype view, and
constellation view each produce their own derived
representation rather than all consuming ProjectGraph
directly.

Implement this sync architecture:

/app/lib/sync.ts:

type SyncStatus = "idle" | "pending" | "syncing"
| "error" | "offline"

type PendingMutation = {
id: string // uuid
intent: string // "createArtifact" etc
payload: unknown
createdAt: number
retries: number
status: SyncStatus
}

useSyncStore (Zustand, persisted to localStorage):
pending: PendingMutation[]
status: SyncStatus
enqueue(mutation: PendingMutation): void
dequeue(id: string): void
markError(id: string): void
retryAll(): void

syncToServer(mutation: PendingMutation): Promise<void>
POST to the appropriate Remix action endpoint.
On success → dequeue.
On failure → markError, schedule retry with
exponential backoff (1s, 2s, 4s, max 30s).
On offline (navigator.onLine === false) →
leave in queue, retry on "online" event.

Auto-sync trigger:
Every N successful mutations (N=5) or every 30s,
flush the queue. Also flush on: - window "beforeunload" - navigator "online" event - app regaining focus (visibilitychange)

Sync status indicator component (SyncIndicator):
Small floating badge, bottom-left of canvas.
idle → invisible
pending → pulsing dot, "Unsaved changes"
syncing → spinner, "Saving..."
error → red dot, "Sync failed — tap to retry"
offline → cloud-slash icon, "Offline — will sync"

────────────────────────────────────────────────────────
25.2 ZUSTAND STORE ARCHITECTURE
────────────────────────────────────────────────────────

Split Zustand into focused slices, combined into one
store. Each slice is defined in its own file and
composed in /app/lib/store.ts.

/app/lib/store/graphSlice.ts
projectGraph: ProjectGraph | null
positions: Record<string, {x:number, y:number}>
setProjectGraph(g: ProjectGraph): void
upsertArtifact(a: Artifact): void
removeArtifact(id: string): void
upsertRelation(r: Relation): void
removeRelation(id: string): void

Derived selectors (use with useStore):
selectArtifactById(id)
selectArtifactsByKind(kind)
selectRelationsForArtifact(id)
selectSubtree(rootId) ← returns all descendants

/app/lib/store/uiSlice.ts
selectedArtifactId: string | null
editingArtifactId: string | null
showArtifactForm: boolean
view: "graph" | "prototype" | "constellation"
activeRelationTypeIds: string[]
isSheetOpen: boolean
selectArtifact, openForm, closeForm,
setView, toggleRelationType, openSheet, closeSheet

/app/lib/store/snapshotSlice.ts
snapshots: Snapshot[]
selectedSnapshotId: string | null
compareSnapshotId: string | null
setSnapshots, selectSnapshot, setCompareSnapshot

/app/lib/store/aiSlice.ts
(as previously defined in section 18)

/app/lib/store/syncSlice.ts
(as defined in section 25.1)

All slices persist relevant state to localStorage via
Zustand persist middleware:

- graphSlice: persist projectGraph (offline editing)
- uiSlice: persist view, activeRelationTypeIds
- syncSlice: persist pending mutations queue
- Do NOT persist aiSlice (conversations are ephemeral)

────────────────────────────────────────────────────────
25.3 PROJECTGRAPH DERIVATION PER VIEW
────────────────────────────────────────────────────────

Each view transforms ProjectGraph into its own
optimized data shape before rendering. These
transformations live in /app/lib/derived/:

/app/lib/derived/graphView.ts
deriveGraphViewData(graph: ProjectGraph):
GraphViewData

GraphViewData = {
artifacts: Artifact[] // flat list
relations: Relation[] // filtered by active
positions: PositionMap // from elkjs layout
artifactTypeMap: Record<string, ArtifactType>
relationTypeMap: Record<string, RelationType>
}

Memoized — recompute only when graph or active
relation types change.

/app/lib/derived/prototypeView.ts
derivePrototypeViewData(
graph: ProjectGraph,
snapshots: Snapshot[],
prototypeArtifactId: string
): PrototypeViewData

PrototypeViewData = {
snapshots: Snapshot[]
relations: SnapshotRelation[]
positions: SnapshotPositionMap // from elkjs
memberMap: Record<string, Artifact[]>
// snapshotId → member artifacts
}

/app/lib/derived/constellationView.ts
deriveConstellationData(graph: ProjectGraph):
ConstellationData

ConstellationData = {
nodes: {
artifact: Artifact
position: {x:number, y:number, z:number}
radius: number // based on kind
color: string // from artifactType
}[]
edges: {
from: {x:number, y:number, z:number}
to: {x:number, y:number, z:number}
relationType: RelationType
}[]
}
Positions: concentric rings grouped by ArtifactKind.
CONCEPT center, PROTOTYPE ring r=4, SUBSYSTEM r=7,
FEATURE/VARIATION/COMPONENT r=10.

These derived functions are pure — no side effects,
fully testable, imported directly by view components.

────────────────────────────────────────────────────────
25.4 SNAPSHOT DIFF SYSTEM
────────────────────────────────────────────────────────

Diffing is a pure utility function — no hooks, no
side effects. Result flows down as props.

/app/lib/diffSnapshot.ts (extends section 6):

type DiffStatus = "added" | "removed"
| "changed" | "unchanged"

type DiffedArtifact = Artifact & {
diffStatus: DiffStatus
}

type SnapshotDiffResult = {
diffedArtifacts: DiffedArtifact[]
addedCount: number
removedCount: number
changedCount: number
summary: string // e.g. "2 added, 1 removed"
}

computeSnapshotDiff(
graph: ProjectGraph,
snapshot: Snapshot
): SnapshotDiffResult

Logic: - artifact in snapshot.members but not in graph
→ "removed" (deleted since snapshot) - artifact in graph but not in snapshot.members
→ "added" (new since snapshot) - artifact in both, but key fields differ
(title, stageId, representation, categories)
→ "changed" - artifact in both, fields identical → "unchanged"

Diff result is passed to SnapshotCard as a prop.
SnapshotCard wraps its children in DiffContext.Provider
so nested ArtifactCard components (inside nested rects)
can read their own diffStatus without prop drilling.

DiffContext:
/app/contexts/DiffContext.ts

type DiffContextValue = {
getDiffStatus(artifactId: string): DiffStatus
isActive: boolean // false = no diff, no styling
}

const DiffContext = createContext<DiffContextValue>({
getDiffStatus: () => "unchanged",
isActive: false
})

useDiffStatus(artifactId: string): DiffStatus
Consumes DiffContext. Returns "unchanged" when
context is inactive (normal non-diff renders).

ArtifactCard reads useDiffStatus(artifact.id) and
applies diff styling only when context is active.
This keeps every card diff-aware with zero prop
drilling and zero extra renders when not in diff mode.

────────────────────────────────────────────────────────
25.5 OPTIMISTIC MUTATION PATTERN
────────────────────────────────────────────────────────

All mutations follow this exact pattern:

1. User triggers action (form submit, button click)
2. IMMEDIATELY update Zustand (graphSlice.upsertArtifact
   etc.) — UI reflects change instantly
3. Snapshot the pre-mutation state for rollback
4. Enqueue mutation in syncSlice with a uuid
5. syncToServer() fires asynchronously
   6a. On success → dequeue, update artifact with
   server-returned id/timestamps
   6b. On error → rollback Zustand to pre-mutation
   snapshot, markError in syncSlice, show toast

Implement a useOptimisticMutation hook:
/app/hooks/useOptimisticMutation.ts

useOptimisticMutation<T>(options: {
intent: string
optimisticUpdate: (store: GraphStore) => void
rollback: (store: GraphStore) => void
payload: T
})

Returns: { mutate(): void, status: SyncStatus }

Used by all form submissions and direct graph
interactions (drag-to-connect, inline edit, etc.)

Rollback strategy:
Before each mutation, capture a minimal snapshot
of affected slice of Zustand state. If server
returns non-2xx, restore that snapshot. Show
a toast: "Could not save — changes reverted."
with a "Retry" button.

────────────────────────────────────────────────────────
25.6 ATOMIC DESIGN FOLDER STRUCTURE
────────────────────────────────────────────────────────

Claude Code must propose and implement the full
folder structure. The following are requirements
and constraints — Claude Code fills in the full
tree based on atomic design principles applied
specifically to this app.

Requirements:

- Follow atomic design: atoms → molecules →
  organisms → views. Remix routes serve as pages.
- Each level only imports from levels below it.
  Organisms import molecules and atoms.
  Molecules import atoms only. Atoms import nothing
  from this system (only primitives/tokens).
- co-locate styles, types, and tests with components
  (ComponentName.tsx, ComponentName.test.tsx,
  ComponentName.module.css if needed)
- Barrel exports (index.ts) at each level
- No circular imports across levels

Atom examples (smallest, stateless, no business logic):
Badge, Button, Icon, Spinner, Tag, Tooltip,
MediaThumb, MarkdownRenderer, SyncIndicator dot,
StageChip, KindIcon, VersionBadge

Molecule examples (composed atoms, still no graph logic):
ArtifactCardMinimal, ArtifactCardMedium,
ArtifactCardRich, SnapshotVersionLabel,
RelationTypePill, EntryPreview, MediaCarousel,
KnowledgeDimensionBadges, CategoryTagRow

Organism examples (composed molecules, may access
Zustand, own local state, contain business logic):
ArtifactCard (dispatcher to card variants),
ArtifactSheet, ArtifactForm, SnapshotCard,
RelationLayerToggle, AIAssistant, SyncIndicator,
ComponentCatalogPicker

View examples (full view compositions, consume
derived data, wire to Zustand and Remix):
GraphCanvas, ConstellationView, PrototypeView,
LandingView, ProjectListView

Constraint: the connection line renderers live
inside their owning view's folder:
views/GraphCanvas/SVGRelationLine.tsx
views/ConstellationView/ParticleRelationLine.tsx
These are NOT shared — each view owns its renderer.

────────────────────────────────────────────────────────
25.7 CONNECTING LINE RENDERERS
────────────────────────────────────────────────────────

Each view owns its own line renderer. They share
a common data contract (RelationLineData) but
are otherwise fully independent implementations.

/app/lib/types.ts (add):

type RelationLineData = {
id: string
fromPosition: { x: number; y: number; z?: number }
toPosition: { x: number; y: number; z?: number }
relationType: RelationType
isActive: boolean
isHighlighted?: boolean // for selected artifact
}

SVGRelationLine
(lives inside views/GraphCanvas/)

- Cubic bezier <path> between card centers
- Control points: vertical handles for upward tree
  (cp1: fromX, fromY - 60; cp2: toX, toY + 60)
- stroke: relationType.color
- strokeWidth: 1.5px default, 2.5px highlighted
- When relationType.animated: CSS animation of
  stroke-dashoffset at 1.5s linear infinite,
  direction follows edge (dashoffset decreases
  from source to target)
- Glow: filter drop-shadow in relationType.color
  at 30% opacity, blur 4px
- fill: none — always explicit

ParticleRelationLine
(lives inside views/ConstellationView/)
This is a stub with the correct architecture —
full particle implementation is a future enhancement
but structure must be correct now.

Use R3F with a custom ShaderMaterial.
The line is a thin tube (TubeGeometry) along a
CatmullRomCurve3 between fromPosition and toPosition.
The ShaderMaterial receives:
uniform float uTime
uniform vec3 uColor
uniform float uAnimated
Fragment shader: pulses opacity along the tube
using sin(uv.x _ 6.28 - uTime _ 2.0) to create
a flowing energy effect. Color from relationType.color
parsed as vec3.

Stub the shader with a comment block:
// TODO: replace with particle system
// Intended: Points geometry sampled along the
// curve, each point displaced by sin(time + offset)
// to create an emission/energy field appearance.
// Use THREE.Points with custom ShaderMaterial.
// Particle count: ~60 per line segment.
// Size attenuation: true, size 0.04.
// Blend mode: AdditiveBlending for glow effect.

Export ParticleRelationLine as the implementation
even at stub stage — ConstellationView imports
and uses it, it just looks simple for now.

────────────────────────────────────────────────────────
25.8 DESIGN TOKEN SYSTEM
────────────────────────────────────────────────────────

/app/lib/tokens.ts — single source of truth.

Export typed token objects:

export const ARTIFACT_KIND_TOKENS = {
CONCEPT: { color: "#7F77DD", bgOpacity: 0.15 },
PROTOTYPE: { color: "#1D9E75", bgOpacity: 0.15 },
SUBSYSTEM: { color: "#378ADD", bgOpacity: 0.15 },
FEATURE: { color: "#BA7517", bgOpacity: 0.15 },
VARIATION: { color: "#888780", bgOpacity: 0.12 },
COMPONENT: { color: "#D4537E", bgOpacity: 0.12 },
} satisfies Record<ArtifactKind, ArtifactKindToken>

export const RELATION_TYPE_TOKENS = {
ITERATES_ON: { color: "#3DDDF2", animated: true },
FORKS_FROM: { color: "#9B59B6", animated: true },
USES_COMPONENT: { color: "#FFC876", animated: false },
CONTRIBUTED_BY: { color: "#A8E6CF", animated: false },
DISPLAYED_AT: { color: "#FF6DB4", animated: false },
PARENT_OF: { color: "#555555", animated: false },
}

export const STAGE_TOKENS = {
idea: { color: "#7F77DD", order: 0 },
research: { color: "#378ADD", order: 1 },
experiment: { color: "#1D9E75", order: 2 },
prototype: { color: "#BA7517", order: 3 },
validate: { color: "#EF9F27", order: 4 },
tune: { color: "#D85A30", order: 5 },
deploy: { color: "#D4537E", order: 6 },
}

export const DIFF_TOKENS = {
added: { color: "#FFC876", label: "NEW" },
removed: { color: "#D85A30", label: "REMOVED" },
changed: { color: "#3DDDF2", label: "CHANGED" },
unchanged: { color: "transparent", label: "" },
}

export const SPATIAL_TOKENS = {
cardBorderRadius: "1rem",
cardShadow: "0 2px 12px rgba(0,0,0,0.08)",
canvasBg: "var(--canvas-bg)",
minTouchTarget: 44, // px
}

Generate CSS variables from tokens at build time:
/app/lib/generateCssVars.ts
Reads tokens.ts, outputs /app/styles/tokens.css
with variables like:
--color-kind-concept: #7F77DD;
--color-relation-iterates-on: #3DDDF2;
--color-stage-prototype: #BA7517;
--color-diff-added: #FFC876;
This file is imported in root.tsx.

tailwind.config.ts extends theme.colors with all
token values so Tailwind classes like
bg-kind-concept, border-relation-forks-from,
text-stage-deploy are available.

Components use Tailwind classes backed by tokens.
Never hardcode hex values in components — always
reference a token class or CSS variable.

────────────────────────────────────────────────────────
25.9 TILT EFFECT INTEGRATION (update from section 19)
────────────────────────────────────────────────────────

useTilt lives at /app/hooks/useTilt.ts (as before).
It is applied at the molecule level — inside
ArtifactCardRich and ArtifactCardMedium directly.
It is NOT applied at the organism level (ArtifactCard
dispatcher) to keep the organism clean.

This is the correct atomic placement:
Atom: no tilt (too granular)
Molecule: tilt applied here ← correct level
Organism: no tilt (dispatches to molecules)
View: no tilt

────────────────────────────────────────────────────────
25.10 COMPONENT DOCUMENTATION REQUIREMENTS
────────────────────────────────────────────────────────

Every component file must include a JSDoc block
at the top with:

/\*\*

- @layer molecule ← atom|molecule|organism|view
- @description One sentence on what it does
- @consumes What data/context it reads
- @emits What callbacks/events it fires
- @diffAware true|false
- @tiltEnabled true|false
  \*/

This makes the atomic hierarchy self-documenting
and searchable across the codebase.

Example for ArtifactCardRich:
/\*\*

- @layer molecule
- @description Rich card rendering for CONCEPT and
- PROTOTYPE artifacts — includes media thumbnail,
- summary, badges, and 3D tilt effect.
- @consumes artifact: Artifact, DiffContext (via hook)
- @emits onClick(artifactId: string)
- @diffAware true
- @tiltEnabled true
  \*/

────────────────────────────────────────────────────────
25.11 ACCEPTANCE CRITERIA (frontend architecture)
────────────────────────────────────────────────────────

In addition to the criteria in section 23:

17. Zustand store hydrates from Remix loader on
    first page load, localStorage on subsequent loads
18. Creating an artifact updates the canvas
    immediately (optimistic) before server responds
19. Disconnecting network mid-session leaves a
    visible sync error indicator; reconnecting
    triggers auto-retry and clears the indicator
20. Snapshot card in PrototypeView correctly applies
    DiffContext — added artifacts show amber glow,
    removed show coral tint, unchanged are at 0.5
    opacity, without any prop drilling to card level
21. deriveGraphViewData, derivePrototypeViewData,
    deriveConstellationData are all pure functions
    with no side effects — each has at least one
    unit test in /tests/derived/
22. computeSnapshotDiff is a pure function with
    tests covering all four DiffStatus cases
23. tokens.ts changes propagate to both CSS
    variables and Tailwind classes — changing one
    hex value in tokens.ts should be sufficient
    to update all usages
24. Each component file has the JSDoc @layer tag
    and the atomic hierarchy is navigable by
    reading the barrel index.ts at each level
25. ParticleRelationLine renders in ConstellationView
    (even as stub) with the shader TODO comment
    block intact and the TubeGeometry approach
    implemented as the placeholder
