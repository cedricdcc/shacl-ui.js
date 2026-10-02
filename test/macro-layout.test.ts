import { describe, it, expect } from "vitest";
import { ShaclRenderer } from "../lib/shacl-renderer.ts";

describe("Macro layout & nested state management", () => {
  it("manages accordion expansion per component uuid and item index", () => {
    const renderer = new ShaclRenderer();
    expect(renderer.isNestedItemExpanded("comp-1", 0, true)).toBe(true);
    expect(renderer.isNestedItemExpanded("comp-1", 1, false)).toBe(false);

    renderer.toggleNestedItemExpanded("comp-1", 1, false);
    expect(renderer.isNestedItemExpanded("comp-1", 1, false)).toBe(true);

    renderer.toggleNestedItemExpanded("comp-1", 1, false);
    expect(renderer.isNestedItemExpanded("comp-1", 1, false)).toBe(false);
  });
});
