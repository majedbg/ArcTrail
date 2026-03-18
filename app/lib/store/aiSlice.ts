/**
 * AI slice — tracks the AIAssistant panel state.
 *
 * Three modes:
 *   "narrator"         — artifact story, triggered by ArtifactSheet
 *   "snapshot-advisor" — version string suggestion, triggered by snapshot creation
 *   "graph-qa"         — free-form Q&A, triggered by top bar AI button
 *
 * Conversations are ephemeral — this slice is NOT persisted to localStorage.
 * Opening a new mode replaces the context but preserves the panel open state.
 */

import type { StateCreator } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AIMode = "narrator" | "snapshot-advisor" | "graph-qa";

export type AIMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

// ---------------------------------------------------------------------------
// Slice type
// ---------------------------------------------------------------------------

export type AISlice = {
  mode: AIMode | null;
  /** The data object passed as context to the AI route for this conversation. */
  context: unknown;
  messages: AIMessage[];
  isStreaming: boolean;
  isOpen: boolean;

  /** Opens the panel in the given mode, replacing any prior context. */
  openWithMode(mode: AIMode, context: unknown): void;
  close(): void;
  appendMessage(msg: AIMessage): void;
  setStreaming(v: boolean): void;
  clearMessages(): void;
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createAISlice: StateCreator<AISlice, [], [], AISlice> = (
  set
) => ({
  mode: null,
  context: null,
  messages: [],
  isStreaming: false,
  isOpen: false,

  openWithMode: (mode, context) =>
    set({
      mode,
      context,
      isOpen: true,
      // Clear messages when switching mode/context so the new conversation
      // starts clean. The user can dismiss the panel to return to prior chat.
      messages: [],
    }),

  close: () => set({ isOpen: false }),

  appendMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setStreaming: (v) => set({ isStreaming: v }),

  clearMessages: () => set({ messages: [] }),
});
