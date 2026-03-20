# ArcTrail color system

This document is the authoritative reference for all colors
used in ArcTrail. Every color in the product flows from
`app/lib/tokens.ts` through CSS variables into Tailwind
classes. No hex value should ever appear in a component file.

---

## Architecture

```
app/lib/tokens.ts          ← single source of truth (hex lives here only)
    ↓
app/lib/generateCssVars.ts ← reads tokens, writes tokens.css
    ↓
app/styles/tokens.css      ← CSS custom properties (:root)
    ↓
tailwind.config.ts         ← extends theme.colors from CSS vars
    ↓
Components                 ← use Tailwind classes (bg-kind-concept etc)
                             or CSS vars (var(--color-stage-deploy))
```

To change any color: edit `tokens.ts` only. Run
`npm run generate-tokens` to propagate changes everywhere.

---

## Brand anchors

Four foundational colors that ground the entire system.

| Token                  | Hex       | Name   | Role                                   |
| ---------------------- | --------- | ------ | -------------------------------------- |
| `--color-brand-ink`    | `#1A1825` | Ink    | Primary dark, logotype, text on light  |
| `--color-brand-arc`    | `#5B4FD9` | Arc    | Brand primary, hierarchy apex          |
| `--color-brand-signal` | `#E8A020` | Signal | Warm anchor, deploy end of stage scale |
| `--color-brand-chalk`  | `#F5F3EE` | Chalk  | Warm off-white, canvas background      |

Arc and Signal are exact complements on the color wheel.
Ink is a blue-violet dark (not pure black) — it ties to the
constellation brand motif without being decorative.

---

## System 1 — Artifact hierarchy

Every `ArtifactKind` maps to one color. The scale is
monochromatic — same hue family as Arc, shifting lighter
as artifacts become more granular.

**Semantic intent:** vivid = foundational and abstract,
pale = leaf-level and concrete.

| Kind        | Token class         | Hex       | Role in hierarchy                          |
| ----------- | ------------------- | --------- | ------------------------------------------ |
| `CONCEPT`   | `bg-kind-concept`   | `#5B4FD9` | Most abstract — the top of the tree        |
| `PROTOTYPE` | `bg-kind-prototype` | `#7065E0` | A buildable version of the concept         |
| `SUBSYSTEM` | `bg-kind-subsystem` | `#8A80E7` | Functional grouping within a prototype     |
| `FEATURE`   | `bg-kind-feature`   | `#A69EED` | Specific implementation within a subsystem |
| `VARIATION` | `bg-kind-variation` | `#C4BFF4` | Lateral sibling / alternative approach     |
| `COMPONENT` | `bg-kind-component` | `#DDD9F9` | Leaf node — real hardware or software part |

Usage rules:

- Use at `bgOpacity` (15% fill) for card backgrounds
- Use at full saturation for border accents and badges
- Never use for buttons, links, or interactive affordances
- Never use more than one hierarchy color in the same UI
  region — hierarchy colors communicate depth, not variety

---

## System 2 — Process stage

Every `Stage` maps to one color on a cool-to-warm temperature
arc. The scale travels from blue-violet (early, uncertain)
through teal-green (midpoint, active) to amber (late, shipped).

**Semantic intent:** temperature encodes maturity.
Cold = nascent thinking. Warm = proven and deployed.
This is NOT a traffic-light system — no red, no "bad" implied.

| Stage        | Token class           | Hex       | Temperature                                    |
| ------------ | --------------------- | --------- | ---------------------------------------------- |
| `idea`       | `bg-stage-idea`       | `#4A6ED4` | Cool — uncertain, exploratory                  |
| `research`   | `bg-stage-research`   | `#4D88C4` | Cool-blue — gathering information              |
| `experiment` | `bg-stage-experiment` | `#4A9EAA` | Teal — testing hypotheses                      |
| `build`      | `bg-stage-build`      | `#4A9E80` | Neutral — making, neither uncertain nor proven |
| `validate`   | `bg-stage-validate`   | `#C8901A` | Warm — proving it works                        |
| `tune`       | `bg-stage-tune`       | `#D88010` | Warmer — refining the proven thing             |
| `deploy`     | `bg-stage-deploy`     | `#E8A020` | Signal amber — shipped, confident              |

Usage rules:

- Use as small badges/pills on artifact cards (top-right)
- Use as a progress indicator in the prototype view
- Never use for hierarchy-level differentiation
- The stage color and hierarchy color on the same card
  are always from different families — they cannot be confused

---

## System 3 — Relation types

Colors for the animated connecting lines between artifacts
in the graph canvas. These colors are **edge-only** —
they must never appear as card fills or button fills.

| Relation         | Token                             | Hex       | Animated |
| ---------------- | --------------------------------- | --------- | -------- |
| `ITERATES_ON`    | `--color-relation-iterates-on`    | `#3DDDF2` | Yes      |
| `FORKS_FROM`     | `--color-relation-forks-from`     | `#9B59B6` | Yes      |
| `USES_COMPONENT` | `--color-relation-uses-component` | `#FFC876` | No       |
| `CONTRIBUTED_BY` | `--color-relation-contributed-by` | `#A8E6CF` | No       |
| `DISPLAYED_AT`   | `--color-relation-displayed-at`   | `#FF6DB4` | No       |
| `PARENT_OF`      | `--color-relation-parent-of`      | `#555555` | No       |

Usage rules:

- Applied only to SVG `stroke` on `<path>` elements
- Never applied to `fill` of any shape
- Never used as a button color or badge background
- Animated relations use CSS `stroke-dashoffset` animation

---

## System 4 — UI accent (semantic affordance)

Two colors that communicate **action type**, not aesthetics.
Applied consistently so users learn the pattern:
calm ink = safe/informational, teal = consequential/mutating.

### Information — `#4A4760` (ink lifted)

Applied to interactions that **reveal or fetch** without
changing any data. Should feel calm, precise, unobtrusive.

```
--color-ui-info         #4A4760   button fills, active nav
--color-ui-info-surface #EEEDF3   subtle background tint
--color-ui-info-text    #4A4760   links, icon labels
```

**Use for:** navigation links, expand/collapse toggles,
"view details," "load more," "open in full," filter controls,
loading spinners, any GET request trigger.

**Tailwind classes:** `bg-ui-info`, `text-ui-info`,
`border-ui-info`, `bg-ui-info-surface`

### Consequential — `#0FA8BE` (iterates-on teal, deepened)

Applied to interactions that **mutate data** — write to the
database, create artifacts, update records, publish.
Should feel intentional and distinct.

```
--color-ui-action         #0FA8BE   primary action buttons
--color-ui-action-surface #E0F5F8   success/saving state bg
--color-ui-action-text    #0A7D8F   darker for text-only use
```

**Use for:** "Save artifact," "Create snapshot," "Add entry,"
"Publish," "Connect," any POST/PUT/PATCH/DELETE trigger.

**Tailwind classes:** `bg-ui-action`, `text-ui-action`,
`border-ui-action`, `bg-ui-action-surface`

**Why teal for consequential actions?**
The deepened teal shares its hue with the `ITERATES_ON`
relation line — which means "progress along a path."
Every time a user saves or creates, they are, literally,
iterating on their work. The color makes that connection
subconscious but coherent.

### Destructive confirmation — `#D85A30`

Used **only** inside confirmation dialogs after a user
has already triggered a destructive action. Never as the
default color for delete buttons — those use the
consequential teal with a warning label. Red appears
only at the moment of irreversibility.

```
--color-ui-destroy         #D85A30   confirmation button fill
--color-ui-destroy-surface #FAECE7   confirmation dialog bg tint
--color-ui-destroy-text    #993C1D   text in confirmation context
```

---

## System 5 — Diff states

Used in the prototype view when comparing two snapshots.
Applied as border glow overlays on artifact blocks inside
`SnapshotCard`. Never used as primary fill colors.

| Status      | Token                    | Hex           | Label   |
| ----------- | ------------------------ | ------------- | ------- |
| `added`     | `--color-diff-added`     | `#FFC876`     | NEW     |
| `removed`   | `--color-diff-removed`   | `#D85A30`     | REMOVED |
| `changed`   | `--color-diff-changed`   | `#3DDDF2`     | CHANGED |
| `unchanged` | `--color-diff-unchanged` | `transparent` | —       |

`unchanged` artifacts render at 50% opacity. All others
render at full opacity with a colored border glow.

---

## Perceptual separation — the non-collision guarantee

Each system lives in a distinct perceptual region:

| System           | Hue family                             | Used on            |
| ---------------- | -------------------------------------- | ------------------ |
| Hierarchy        | Violet (Arc monochromatic)             | Card fills, badges |
| Stage            | Blue → teal → amber                    | Stage pills        |
| Relation         | Cyan, purple, pink, amber, green, grey | SVG edges only     |
| UI information   | Violet-grey (ink lifted)               | Buttons, links     |
| UI consequential | Cyan-teal (deepened)                   | Action buttons     |
| Diff             | Amber, coral, cyan                     | Snapshot overlays  |

A user cannot confuse any system for another because:

1. Each occupies a distinct hue or lightness region
2. Each is applied to a distinct UI element type
3. Context separates any remaining ambiguity

The only intentional resonance: UI consequential teal
shares a hue family with the `ITERATES_ON` relation line.
This is deliberate — both mean "moving forward."

---

## Adding a new color

Before adding any new color to the system, ask:

- Does an existing token already communicate this meaning?
- If not, which system does this new color belong to?
- Does it collide with any existing system perceptually?

New colors are added to `tokens.ts` only. They receive
a CSS variable name following the existing convention and
a Tailwind class. No hex values in components, ever.
