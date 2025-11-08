import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NodeCard } from "~/components/NodeCard";
import type { IterationNode } from "~/lib/types";

describe("Smoke tests", () => {
  it("renders NodeCard component", () => {
    const testNode: IterationNode = {
      id: "1",
      title: "Test Node",
      dateISO: "2024-01-01",
      categories: ["digital"],
      summary: "Test summary",
    };

    render(<NodeCard node={testNode} />);
    expect(screen.getByText("Test Node")).toBeInTheDocument();
    expect(screen.getByText("Test summary")).toBeInTheDocument();
  });
});

