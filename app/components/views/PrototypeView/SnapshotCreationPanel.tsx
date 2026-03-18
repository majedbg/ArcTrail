/**
 * @layer view
 * @description Snapshot creation panel with 2-step flow:
 *   Step 1: Manifest checklist of artifacts (pre-ticked from graph)
 *   Step 2: AI version advisor + editable versionString with grammar validation
 * @consumes graph, parentSnapshot, prototype artifact
 * @emits onClose, onCreate
 * @diffAware false
 * @tiltEnabled false
 */

import { useState, useCallback, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { parseVersionString } from "~/lib/version.js";
import { diffSnapshots, inferVersionBump } from "~/lib/version.js";
import { Button } from "../../atoms/Button.js";
import { VersionBadge } from "../../atoms/VersionBadge.js";
import { MarkdownRenderer } from "../../atoms/MarkdownRenderer.js";
import type { Artifact, ProjectGraph, Snapshot } from "~/lib/types.js";

export type SnapshotCreationPanelProps = {
  graph: ProjectGraph;
  prototypeArtifactId: string;
  parentSnapshot: Snapshot | null;
  onClose: () => void;
};

export function SnapshotCreationPanel({
  graph,
  prototypeArtifactId,
  parentSnapshot,
  onClose,
}: SnapshotCreationPanelProps) {
  const fetcher = useFetcher();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: manifest
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Pre-tick all non-CONCEPT artifacts
    return new Set(
      graph.artifacts.filter((a) => a.kind !== "CONCEPT").map((a) => a.id),
    );
  });

  // Step 2: version info
  const [versionString, setVersionString] = useState("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [dateISO, setDateISO] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [aiRelationType, setAiRelationType] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  // Validate version string in real-time
  useEffect(() => {
    if (!versionString.trim()) {
      setParseError(null);
      return;
    }
    try {
      parseVersionString(versionString.trim());
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }, [versionString]);

  // Call AI version advisor on step 2 entry
  const callAdvisor = useCallback(
    async (userMessage?: string) => {
      setAiLoading(true);
      try {
        // Build diff context
        const parentMemberIds = (parentSnapshot?.members ?? []).map(
          (m) => m.artifactId,
        );
        const newMemberIds = [...selectedIds];
        const diff = diffSnapshots(
          { ...parentSnapshot!, members: parentSnapshot?.members ?? [] } as Snapshot,
          {
            ...parentSnapshot!,
            members: newMemberIds.map((id) => ({
              id: "",
              snapshotId: "",
              artifactId: id,
              role: null,
              notes: null,
            })),
          } as Snapshot,
        );

        // Pre-analysis from inferVersionBump
        const priorAnalysis = parentSnapshot
          ? inferVersionBump(parentSnapshot, diff, graph.artifacts)
          : null;

        const messages = userMessage
          ? [...chatMessages, { role: "user" as const, content: userMessage }]
          : chatMessages;

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "snapshot-advisor",
            context: {
              parentSnapshot: parentSnapshot
                ? {
                    versionString: parentSnapshot.versionString,
                    memberIds: parentMemberIds,
                  }
                : null,
              newMemberIds,
              diff,
              artifacts: graph.artifacts.map((a) => ({
                id: a.id,
                title: a.title,
                kind: a.kind,
                subsystemCode: a.subsystemCode,
              })),
              priorAnalysis,
            },
            messages,
            userMessage:
              userMessage ??
              "Suggest a version string for this new snapshot based on the diff.",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.versionString) {
            setVersionString(data.versionString);
            setAiReasoning(data.reasoning);
            setAiRelationType(data.relationType);
            if (userMessage) {
              setChatMessages([
                ...messages,
                { role: "assistant", content: data.reasoning },
              ]);
            }
          }
        }
      } catch {
        // AI unavailable — user can type manually
      } finally {
        setAiLoading(false);
      }
    },
    [parentSnapshot, selectedIds, graph, chatMessages],
  );

  // Auto-call advisor on step 2 enter
  useEffect(() => {
    if (step === 2 && !versionString && !aiLoading) {
      callAdvisor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      callAdvisor(chatInput.trim());
      setChatInput("");
    }
  };

  const handleCreate = () => {
    if (!versionString.trim() || parseError) return;

    const formData = new FormData();
    formData.set("intent", "createSnapshot");
    formData.set("prototypeArtifactId", prototypeArtifactId);
    formData.set("versionString", versionString.trim());
    formData.set("displayLabel", displayLabel);
    formData.set("memberIds", JSON.stringify([...selectedIds]));
    if (parentSnapshot) {
      formData.set("parentSnapshotId", parentSnapshot.id);
      // Find relation type for ITERATES_ON or FORKS_FROM
      const relType = graph.relations.find(
        (r) =>
          r.relationType?.name === (aiRelationType ?? "ITERATES_ON"),
      );
      if (relType) {
        formData.set("relationTypeId", relType.relationTypeId);
      }
    }

    fetcher.submit(formData, { method: "post" });
    onClose();
  };

  const toggleArtifact = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl bg-zinc-900 p-5 shadow-2xl md:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {step === 1 ? "Step 1: Select Members" : "Step 2: Version"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {step === 1 && (
          <>
            <p className="mb-3 text-xs text-zinc-500">
              Select artifacts to include in this snapshot.
            </p>
            <div className="flex flex-col gap-1 max-h-[50vh] overflow-y-auto">
              {graph.artifacts
                .filter((a) => a.kind !== "CONCEPT")
                .map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleArtifact(a.id)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                    />
                    <span className="text-sm text-zinc-200">{a.title}</span>
                    <span className="text-[10px] text-zinc-500">{a.kind}</span>
                  </label>
                ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(2)}
                disabled={selectedIds.size === 0}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* AI reasoning */}
            {aiLoading && (
              <div className="mb-3 flex items-center gap-2 text-xs text-zinc-400">
                <span className="animate-pulse">Asking AI...</span>
              </div>
            )}
            {aiReasoning && (
              <div className="mb-3 rounded-lg bg-zinc-800/50 p-3">
                <MarkdownRenderer content={aiReasoning} />
              </div>
            )}

            {/* Version string input */}
            <label className="mb-3 flex flex-col gap-1">
              <span className="text-xs text-zinc-400">Version String</span>
              <input
                value={versionString}
                onChange={(e) => setVersionString(e.target.value)}
                className="rounded bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500"
                placeholder="e.g. AI.RCA1-LO.LAP1"
              />
              {parseError && (
                <span className="text-[10px] text-diff-removed">
                  {parseError}
                </span>
              )}
              {!parseError && versionString.trim() && (
                <VersionBadge
                  versionString={versionString.trim()}
                  className="self-start mt-1"
                />
              )}
            </label>

            {/* Display label + date */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Display Label</span>
                <input
                  value={displayLabel}
                  onChange={(e) => setDisplayLabel(e.target.value)}
                  className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                  placeholder="e.g. Initial build"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-400">Date</span>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>

            {/* Chat follow-up */}
            {chatMessages.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 max-h-32 overflow-y-auto">
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs ${m.role === "user" ? "text-right text-zinc-300" : "text-zinc-400"}`}
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleChatSubmit} className="mb-4 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500"
                placeholder="Ask AI to reconsider..."
                disabled={aiLoading}
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={aiLoading || !chatInput.trim()}
              >
                Ask
              </Button>
            </form>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={!versionString.trim() || !!parseError}
              >
                Confirm &amp; Create
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
