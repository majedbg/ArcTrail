/**
 * @layer organism
 * @description Floating AI assistant panel with three modes (narrator, snapshot-advisor, graph-qa).
 *   Streams responses via SSE, maintains message history in aiSlice.
 * @consumes aiSlice from Zustand (mode, context, messages, isStreaming, isOpen)
 * @emits appendMessage, setStreaming, clearMessages, close
 * @diffAware false
 * @tiltEnabled false
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "~/lib/store.js";
import { MarkdownRenderer } from "../atoms/MarkdownRenderer.js";
import { Button } from "../atoms/Button.js";
import { Spinner } from "../atoms/Spinner.js";
import type { AIMode } from "~/lib/store/aiSlice.js";

// ---------------------------------------------------------------------------
// Mode labels
// ---------------------------------------------------------------------------

const MODE_LABELS: Record<AIMode, string> = {
  narrator: "Artifact Story",
  "snapshot-advisor": "Version Advisor",
  "graph-qa": "Project Q&A",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAssistant() {
  const isOpen = useStore((s) => s.isOpen);
  const mode = useStore((s) => s.mode);
  const context = useStore((s) => s.context);
  const messages = useStore((s) => s.messages);
  const isStreaming = useStore((s) => s.isStreaming);
  const appendMessage = useStore((s) => s.appendMessage);
  const setStreaming = useStore((s) => s.setStreaming);
  const clearMessages = useStore((s) => s.clearMessages);
  const close = useStore((s) => s.close);

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message and handle streaming
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!mode || isStreaming || !userMessage.trim()) return;

      setError(null);
      appendMessage({
        role: "user",
        content: userMessage.trim(),
        timestamp: Date.now(),
      });
      setStreaming(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            context,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userMessage: userMessage.trim(),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `HTTP ${response.status}`,
          );
        }

        // snapshot-advisor: non-streaming JSON
        if (mode === "snapshot-advisor") {
          const data = await response.json();
          appendMessage({
            role: "assistant",
            content: JSON.stringify(data, null, 2),
            timestamp: Date.now(),
          });
          setStreaming(false);
          return;
        }

        // narrator / graph-qa: streaming SSE
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let assistantText = "";

        // Append initial empty assistant message that we'll update
        appendMessage({
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();

            if (payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                setError(parsed.error);
                break;
              }
              if (parsed.text) {
                assistantText += parsed.text;
                // Update the last assistant message in-place
                const store = useStore.getState();
                const msgs = [...store.messages];
                const lastIdx = msgs.length - 1;
                if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
                  msgs[lastIdx] = {
                    ...msgs[lastIdx],
                    content: assistantText,
                  };
                  // Direct set to avoid appending
                  useStore.setState({ messages: msgs });
                }
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(
            (err as Error).message ||
              "AI unavailable — check ANTHROPIC_API_KEY",
          );
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [mode, context, messages, isStreaming, appendMessage, setStreaming],
  );

  // Auto-send initial message for narrator mode
  useEffect(() => {
    if (isOpen && mode === "narrator" && messages.length === 0) {
      sendMessage("Tell me about this artifact.");
    }
    if (isOpen && mode === "graph-qa" && messages.length === 0) {
      sendMessage("Give me an overview of this project.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  if (!isOpen || !mode) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 flex h-full w-full flex-col bg-zinc-900 shadow-2xl md:bottom-4 md:right-4 md:h-[520px] md:w-[380px] md:rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">
            {MODE_LABELS[mode]}
          </span>
          {isStreaming && <Spinner size={14} className="text-zinc-400" />}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              clearMessages();
              setError(null);
            }}
            className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              abortRef.current?.abort();
              close();
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error && (
          <div className="mb-3 rounded bg-diff-removed/20 px-3 py-2 text-xs text-diff-removed">
            {error}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 ${msg.role === "user" ? "text-right" : ""}`}
          >
            <div
              className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-800/50 text-zinc-300"
              }`}
            >
              {msg.role === "assistant" ? (
                <MarkdownRenderer content={msg.content || "…"} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.content === "" && (
          <div className="mb-3 flex gap-1 px-3 py-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-zinc-800 px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isStreaming ? "Waiting for response…" : "Ask a question…"
          }
          disabled={isStreaming}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isStreaming || !input.trim()}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
