import { describe, it, expect } from "vitest";
import { render } from "lit";
import { ShaclRenderer } from "../lib/shacl-renderer.ts";
import { renderUIComponents } from "../lib/presentation/widgets/layout.ts";
import { renderDetailsEditor } from "../lib/presentation/widgets/editors-rich-nested.ts";

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

  it("renders 1:1 nested shape with dissolved guide rail and accent pip header", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const uiComponent: any = {
      uuid: "addr-1",
      label: "Address",
      description: "Primary location",
      maxCount: 1,
      minCount: 1,
      values: [{ path: { path: "ex:address" }, value: { value: "_:b1" } }],
      children: [[]]
    };
    const template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[0], 0, classes);
    const div = document.createElement("div");
    render(template, div);
    expect(div.innerHTML).toContain("Address");
    expect(div.querySelector(".details-editor-rail")).not.toBeNull();
    expect(div.querySelector(".details-editor-card")).toBeNull();
  });

  it("renders 1:N repeated shapes as summary rows with avatar chips and expand toggle", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const uiComponent: any = {
      uuid: "affil-1",
      label: "Affiliation",
      maxCount: 5,
      minCount: 0,
      values: [
        { path: { path: "ex:affiliation" }, value: { value: "_:b1" } },
        { path: { path: "ex:affiliation" }, value: { value: "_:b2" } }
      ],
      children: [[], []]
    };
    const template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[1], 1, classes);
    const div = document.createElement("div");
    render(template, div);
    const summaryRow = div.querySelector(`.${classes.nestedSummaryRowClass.split(' ')[0]}`);
    expect(summaryRow).not.toBeNull();
    const avatar = div.querySelector(`.${classes.nestedSummaryAvatarClass.split(' ')[0]}`);
    expect(avatar).not.toBeNull();
  });

  it("toggles repeated item expansion when summary row is clicked", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const uiComponent: any = {
      uuid: "affil-1",
      label: "Affiliation",
      maxCount: 5,
      minCount: 0,
      values: [
        { path: { path: "ex:affiliation" }, value: { value: "_:b1" } },
        { path: { path: "ex:affiliation" }, value: { value: "_:b2" } }
      ],
      children: [[], []]
    };
    // Item 1 is collapsed by default
    let template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[1], 1, classes);
    const div = document.createElement("div");
    render(template, div);
    expect(div.querySelector(".details-editor-rail")).toBeNull();

    // Click to expand
    const summaryRow = div.querySelector(`.${classes.nestedSummaryRowClass.split(' ')[0]}`) as HTMLElement;
    summaryRow.click();

    // Re-render template with new state
    template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[1], 1, classes);
    render(template, div);
    expect(div.querySelector(".details-editor-rail")).not.toBeNull();
  });
});

