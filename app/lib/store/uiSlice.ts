/**
 * UI slice — tracks selection, modal visibility, active view, and
 * which relation types are visible on the canvas.
 *
 * `initActiveRelationTypes` is called once after the registry is loaded.
 * It sets PARENT_OF as the only active type by default, matching the spec.
 */

import type { StateCreator } from "zustand";
import type { ArtifactKind } from "../tokens.js";
import type { RelationType } from "../types.js";

// ---------------------------------------------------------------------------
// Slice types
// ---------------------------------------------------------------------------

export type ViewMode = "graph" | "prototype" | "constellation";

export type UISlice = {
  /** The artifact whose ArtifactSheet is currently open. null = closed. */
  selectedArtifactId: string | null;
  /** The artifact being edited in ArtifactForm. null = create mode. */
  editingArtifactId: string | null;
  showArtifactForm: boolean;
  /** Pre-selected kind when opening the form for a new sibling. */
  formDefaultKind: ArtifactKind | null;
  /** Parent artifact id to auto-create a PARENT_OF relation on submit. */
  formParentId: string | null;
  view: ViewMode;
  /** RelationType ids whose lines are shown on the canvas. */
  activeRelationTypeIds: string[];
  isSheetOpen: boolean;

  selectArtifact(id: string | null): void;
  /** Opens ArtifactForm. Pass an id to edit; omit to create. */
  openForm(id?: string): void;
  /** Opens ArtifactForm pre-configured for creating a sibling of the given kind under parentId. */
  openFormForSibling(kind: ArtifactKind, parentId: string): void;
  closeForm(): void;
  setView(v: ViewMode): void;
  /** Toggles a RelationType in/out of the active set. */
  toggleRelationType(id: string): void;
  openSheet(): void;
  closeSheet(): void;
  /**
   * Seeds the active relation type list from the registry.
   * PARENT_OF is active by default; all others start inactive.
   */
  initActiveRelationTypes(types: RelationType[]): void;
};

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (
  set
) => ({
  selectedArtifactId: null,
  editingArtifactId: null,
  showArtifactForm: false,
  formDefaultKind: null,
  formParentId: null,
  view: "graph",
  activeRelationTypeIds: [],
  isSheetOpen: false,

  selectArtifact: (id) =>
    set({
      selectedArtifactId: id,
      isSheetOpen: id !== null,
    }),

  openForm: (id) =>
    set({
      editingArtifactId: id ?? null,
      showArtifactForm: true,
      formDefaultKind: null,
      formParentId: null,
    }),

  openFormForSibling: (kind, parentId) =>
    set({
      editingArtifactId: null,
      showArtifactForm: true,
      formDefaultKind: kind,
      formParentId: parentId,
    }),

  closeForm: () =>
    set({
      editingArtifactId: null,
      showArtifactForm: false,
      formDefaultKind: null,
      formParentId: null,
    }),

  setView: (v) => set({ view: v }),

  toggleRelationType: (id) =>
    set((state) => ({
      activeRelationTypeIds: state.activeRelationTypeIds.includes(id)
        ? state.activeRelationTypeIds.filter((t) => t !== id)
        : [...state.activeRelationTypeIds, id],
    })),

  openSheet: () => set({ isSheetOpen: true }),

  closeSheet: () =>
    set({
      isSheetOpen: false,
      selectedArtifactId: null,
    }),

  initActiveRelationTypes: (types) => {
    // PARENT_OF is active by default; all others inactive
    const parentOf = types.find((t) => t.name === "PARENT_OF");
    set({
      activeRelationTypeIds: parentOf ? [parentOf.id] : [],
    });
  },
});
