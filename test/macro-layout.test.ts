import { describe, it, expect } from "vitest";
import { render } from "lit";
import { ShaclRenderer } from "../lib/shacl-renderer.ts";
import { renderUIComponents } from "../lib/presentation/widgets/layout.ts";

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

  it("renders breadcrumb depth cap at depth >= 2 with ancestor path", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const template = renderUIComponents(renderer, [], classes, 2, ["Project", "WorkPackage 1"]);
    const div = document.createElement("div");
    render(template, div);
    expect(div.innerHTML).toContain("Project › WorkPackage 1");
  });
});

