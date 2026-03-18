/**
 * ArcTrail Version String Utilities
 *
 * Version string grammar:
 * ─────────────────────────────────────────────────────────────────
 *   version  ::= segment ("-" segment)*
 *   segment  ::= subsystemCode "." featureCode iteration
 *                [forkSuffix] ["." componentMajor "." componentMinor]
 *
 *   subsystemCode   ::= [A-Z]+      e.g. AI, LO, SP
 *   featureCode     ::= [A-Z]+      e.g. RCA, LAP, CI
 *   iteration       ::= [0-9]+      e.g. 1, 2, 3
 *   forkSuffix      ::= [a-z]       e.g. a, b, c  (optional)
 *   componentMajor  ::= [0-9]+      (optional, requires componentMinor)
 *   componentMinor  ::= [0-9]+      (optional, requires componentMajor)
 * ─────────────────────────────────────────────────────────────────
 *
 * Examples:
 *   "AI.RCA1"           single subsystem, no component version
 *   "AI.RCA1a"          with fork suffix
 *   "AI.RCA1.2.0"       with component major.minor
 *   "AI.RCA1a.2.0"      fork + component version
 *   "AI.RCA1-LO.LAP2"   two subsystem segments
 *
 * Semver change rules:
 *   Component/variation changed → componentMinor++, ITERATES_ON
 *   Component swapped           → componentMajor++, ITERATES_ON
 *   Feature iterated (same concept)  → iteration++, ITERATES_ON
 *   Feature replaced (new concept)   → new featureCode, FORKS_FROM
 *   Subsystem added             → append segment, ITERATES_ON
 *   Subsystem swapped           → new subsystemCode, FORKS_FROM
 *   Parallel fork               → append a/b/c forkSuffix, FORKS_FROM
 */

import type {
  VersionSegment,
  ParsedVersionString,
  SnapshotDiff,
  Artifact,
} from "./types.js";
import type { Snapshot } from "./types.js";

// ---------------------------------------------------------------------------
// parseVersionString
// ---------------------------------------------------------------------------

/**
 * Parses a raw version string into a structured `ParsedVersionString`.
 *
 * Splits on "-" to get segments, then parses each segment with
 * `SUBSYSTEM.FEATUREiteration[forkSuffix][.MAJOR.MINOR]` grammar.
 *
 * @throws {Error} if any segment is malformed
 */
export function parseVersionString(raw: string): ParsedVersionString {
  const segmentStrings = raw.split("-");
  const segments = segmentStrings.map((s, i) => {
    try {
      return parseSegment(s);
    } catch (e) {
      throw new Error(
        `Invalid version string "${raw}": segment ${i + 1} ("${s}") is malformed. ${(e as Error).message}`
      );
    }
  });
  return { raw, segments };
}

/**
 * Parses a single version segment string into a `VersionSegment`.
 *
 * Segment format: `SUBSYSTEM.FEATUREiteration[forkSuffix][.MAJOR.MINOR]`
 *
 * Parsing steps:
 * 1. Find the first dot — everything before is the subsystem code.
 * 2. Split the remainder on dots — first part holds featureCode+iteration+fork.
 * 3. Use a regex to extract featureCode ([A-Z]+), iteration (\d+),
 *    optional forkSuffix ([a-z]).
 * 4. If there are two more dot-parts, they are componentMajor / componentMinor.
 */
function parseSegment(segStr: string): VersionSegment {
  const dotIdx = segStr.indexOf(".");
  if (dotIdx === -1 || dotIdx === 0) {
    throw new Error(`Missing subsystem/feature separator dot.`);
  }

  const subsystemCode = segStr.slice(0, dotIdx);
  if (!/^[A-Z]+$/.test(subsystemCode)) {
    throw new Error(`Subsystem code "${subsystemCode}" must be uppercase letters only.`);
  }

  const rest = segStr.slice(dotIdx + 1); // e.g. "RCA1", "RCA1a", "RCA1.2.0"
  const parts = rest.split(".");

  // First part: featureCode + iteration + optional forkSuffix
  const firstPart = parts[0];
  const match = /^([A-Z]+)(\d+)([a-z])?$/.exec(firstPart);
  if (!match) {
    throw new Error(
      `Feature part "${firstPart}" must be UPPERCASE letters followed by digits and optional lowercase fork suffix.`
    );
  }

  const featureCode = match[1];
  const iteration = parseInt(match[2], 10);
  const forkSuffix = match[3] ?? undefined;

  // Optional component version: .MAJOR.MINOR
  let componentMajor: number | undefined;
  let componentMinor: number | undefined;
  if (parts.length === 3) {
    const maj = parseInt(parts[1], 10);
    const min = parseInt(parts[2], 10);
    if (isNaN(maj) || isNaN(min)) {
      throw new Error(`Component version parts must be integers.`);
    }
    componentMajor = maj;
    componentMinor = min;
  } else if (parts.length !== 1) {
    throw new Error(`Expected 1 or 3 dot-separated parts in "${rest}".`);
  }

  return { subsystemCode, featureCode, iteration, forkSuffix, componentMajor, componentMinor };
}

/** Serialises a parsed segment back to its string form. */
function segmentToString(s: VersionSegment): string {
  let str = `${s.subsystemCode}.${s.featureCode}${s.iteration}`;
  if (s.forkSuffix) str += s.forkSuffix;
  if (s.componentMajor !== undefined && s.componentMinor !== undefined) {
    str += `.${s.componentMajor}.${s.componentMinor}`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// generateSubsystemCode
// ---------------------------------------------------------------------------

/**
 * Generates a short uppercase subsystem code from a human-readable name.
 *
 * Resolution order:
 * 1. Initials of each word: "Audio Input" → "AI"
 * 2. On collision: first 3 characters of the first word uppercased
 * 3. Still collides: append digit suffix ("AI2", "AI3", …)
 *
 * The user can always override the generated code after creation.
 */
export function generateSubsystemCode(name: string, existing: string[]): string {
  const words = name.trim().split(/\s+/);

  // Strategy 1: initials
  const initials = words.map((w) => w[0]?.toUpperCase() ?? "").join("");
  if (initials && !existing.includes(initials)) return initials;

  // Strategy 2: first 3 chars of first word
  const firstThree = words[0].slice(0, 3).toUpperCase();
  if (firstThree && !existing.includes(firstThree)) return firstThree;

  // Strategy 3: initials + digit suffix
  for (let i = 2; i < 100; i++) {
    const candidate = `${initials}${i}`;
    if (!existing.includes(candidate)) return candidate;
  }

  throw new Error(`Could not generate a unique subsystem code for "${name}".`);
}

// ---------------------------------------------------------------------------
// diffSnapshots
// ---------------------------------------------------------------------------

/**
 * Computes a set-level diff between two snapshots by comparing their
 * member artifactId lists.
 *
 * - `added`:     artifactIds in snapshot B but not in A
 * - `removed`:   artifactIds in snapshot A but not in B
 * - `unchanged`: artifactIds present in both A and B
 */
export function diffSnapshots(a: Snapshot, b: Snapshot): SnapshotDiff {
  const aIds = new Set((a.members ?? []).map((m) => m.artifactId));
  const bIds = new Set((b.members ?? []).map((m) => m.artifactId));

  const added = [...bIds].filter((id) => !aIds.has(id));
  const removed = [...aIds].filter((id) => !bIds.has(id));
  const unchanged = [...aIds].filter((id) => bIds.has(id));

  return { added, removed, unchanged };
}

// ---------------------------------------------------------------------------
// inferVersionBump
// ---------------------------------------------------------------------------

/**
 * Algorithmically analyses a snapshot diff to suggest a version string
 * and whether the next snapshot is an ITERATES_ON or FORKS_FROM relation.
 *
 * This is pre-analysis context for the AI route — the AI may refine or
 * override the suggestion based on the artifact descriptions and design intent.
 *
 * Rules applied:
 * - Only COMPONENT/VARIATION changed → componentMinor++, ITERATES_ON
 * - FEATURE added but no FEATURE removed → iteration++, ITERATES_ON
 * - FEATURE removed AND FEATURE added (replacement) → new featureCode, FORKS_FROM
 * - SUBSYSTEM added, none removed → append segment, ITERATES_ON
 * - SUBSYSTEM removed AND SUBSYSTEM added (swap) → new subsystemCode, FORKS_FROM
 * - Fallback → feature iteration++, ITERATES_ON
 */
export function inferVersionBump(
  parentSnapshot: Snapshot,
  diff: SnapshotDiff,
  artifacts: Artifact[]
): { suggestion: string; reasoning: string; relationType: "ITERATES_ON" | "FORKS_FROM" } {
  const artifactMap = new Map(artifacts.map((a) => [a.id, a]));

  const kindOf = (id: string) => artifactMap.get(id)?.kind ?? null;

  const addedKinds = diff.added.map(kindOf);
  const removedKinds = diff.removed.map(kindOf);

  const subsystemAdded = diff.added.some((id) => kindOf(id) === "SUBSYSTEM");
  const subsystemRemoved = diff.removed.some((id) => kindOf(id) === "SUBSYSTEM");
  const featureAdded = diff.added.some((id) => kindOf(id) === "FEATURE");
  const featureRemoved = diff.removed.some((id) => kindOf(id) === "FEATURE");

  const allChangedKinds = new Set([...addedKinds, ...removedKinds].filter(Boolean));
  const onlyComponentOrVariation =
    allChangedKinds.size > 0 &&
    [...allChangedKinds].every((k) => k === "COMPONENT" || k === "VARIATION");

  let parentVersion: ParsedVersionString;
  try {
    parentVersion = parseVersionString(parentSnapshot.versionString);
  } catch {
    // Unparseable parent — fall back to a placeholder
    return {
      suggestion: parentSnapshot.versionString + "-v2",
      reasoning: `Could not parse parent version string "${parentSnapshot.versionString}". Manual version entry recommended.`,
      relationType: "ITERATES_ON",
    };
  }

  // --- Rule: only components/variations changed → componentMinor++ ---
  if (onlyComponentOrVariation) {
    const bumped = parentVersion.segments.map((s) => ({
      ...s,
      componentMajor: s.componentMajor ?? 1,
      componentMinor: (s.componentMinor ?? 0) + 1,
    }));
    return {
      suggestion: bumped.map(segmentToString).join("-"),
      reasoning: `Only COMPONENT and/or VARIATION artifacts changed. This is a minor component increment — same feature, different parts.`,
      relationType: "ITERATES_ON",
    };
  }

  // --- Rule: subsystem swapped (removed + added different subsystem) ---
  if (subsystemAdded && subsystemRemoved) {
    const newSub = artifacts.find(
      (a) => diff.added.includes(a.id) && a.kind === "SUBSYSTEM"
    );
    const oldSub = artifacts.find(
      (a) => diff.removed.includes(a.id) && a.kind === "SUBSYSTEM"
    );
    const newCode = newSub?.subsystemCode ?? "XX";
    // Replace the old subsystem segment code
    const bumped = parentVersion.segments.map((s) => {
      if (s.subsystemCode === (oldSub?.subsystemCode ?? s.subsystemCode)) {
        return { ...s, subsystemCode: newCode, iteration: 1, componentMajor: undefined, componentMinor: undefined };
      }
      return s;
    });
    return {
      suggestion: bumped.map(segmentToString).join("-"),
      reasoning: `Subsystem "${oldSub?.title ?? "unknown"}" was swapped out for "${newSub?.title ?? "unknown"}". This is a structural architectural change.`,
      relationType: "FORKS_FROM",
    };
  }

  // --- Rule: subsystem added (no removal) → append segment ---
  if (subsystemAdded && !subsystemRemoved) {
    const newSub = artifacts.find(
      (a) => diff.added.includes(a.id) && a.kind === "SUBSYSTEM"
    );
    const code = newSub?.subsystemCode ?? "XX";
    // Find a feature belonging to this subsystem (first feature in added list)
    const featureForSub = artifacts.find(
      (a) => diff.added.includes(a.id) && a.kind === "FEATURE"
    );
    const featCode = featureForSub
      ? featureForSub.title
          .trim()
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 3)
      : "FT";
    const newSegment: VersionSegment = { subsystemCode: code, featureCode: featCode, iteration: 1 };
    const bumped = [...parentVersion.segments, newSegment];
    return {
      suggestion: bumped.map(segmentToString).join("-"),
      reasoning: `New subsystem "${newSub?.title ?? code}" added to the prototype configuration.`,
      relationType: "ITERATES_ON",
    };
  }

  // --- Rule: feature replaced (removed + added different feature) ---
  if (featureRemoved && featureAdded) {
    const removedFeat = artifacts.find(
      (a) => diff.removed.includes(a.id) && a.kind === "FEATURE"
    );
    const addedFeat = artifacts.find(
      (a) => diff.added.includes(a.id) && a.kind === "FEATURE"
    );
    const newCode = addedFeat
      ? addedFeat.title
          .trim()
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("")
          .slice(0, 3)
      : "NF";
    // Replace the feature code in the first segment (heuristic)
    const bumped = parentVersion.segments.map((s, i) =>
      i === 0 ? { ...s, featureCode: newCode, iteration: 1, componentMajor: undefined, componentMinor: undefined } : s
    );
    return {
      suggestion: bumped.map(segmentToString).join("-"),
      reasoning: `Feature "${removedFeat?.title ?? "unknown"}" was replaced by "${addedFeat?.title ?? "unknown"}". Using a new feature code and resetting to iteration 1.`,
      relationType: "FORKS_FROM",
    };
  }

  // --- Rule: feature iterated (new features, no removals) → iteration++ ---
  if (featureAdded && !featureRemoved) {
    const bumped = parentVersion.segments.map((s) => ({ ...s, iteration: s.iteration + 1 }));
    return {
      suggestion: bumped.map(segmentToString).join("-"),
      reasoning: `Features were added without removing existing ones. Incrementing feature iteration.`,
      relationType: "ITERATES_ON",
    };
  }

  // --- Fallback: general iteration increment ---
  const bumped = parentVersion.segments.map((s) => ({ ...s, iteration: s.iteration + 1 }));
  return {
    suggestion: bumped.map(segmentToString).join("-"),
    reasoning: `Changes detected. Suggesting a feature iteration increment. Please review and adjust the version string manually if needed.`,
    relationType: "ITERATES_ON",
  };
}
