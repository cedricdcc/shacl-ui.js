import { describe, it, expect } from "vitest";
import { render } from "lit";
import { ShaclRenderer } from "../lib/shacl-renderer.ts";
import { renderUIComponents } from "../lib/presentation/widgets/layout.ts";
import { renderDetailsEditor } from "../lib/presentation/widgets/editors-rich-nested.ts";
import { renderDetailsViewer } from "../lib/presentation/widgets/viewers-nested.ts";

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

  it("does not render textual breadcrumb trail for nested shapes", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const template = renderUIComponents(renderer, [], classes, 2, ["Project", "WorkPackage 1"]);
    const div = document.createElement("div");
    render(template, div);
    expect(div.innerHTML).not.toContain("Project › WorkPackage 1");
    expect(div.querySelector(`.${classes.nestedBreadcrumbClass.split(' ')[0]}`)).toBeNull();
  });

  it("renders 1:1 nested shape dissolved into parent grid without left guide rail", () => {
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
    expect(div.textContent).toContain("↳ Address");
    expect(div.querySelector(".border-l-2")).toBeNull();
    expect(div.querySelector(".pl-5")).toBeNull();
    expect(div.querySelector(".details-editor-card")).toBeNull();
    expect(div.querySelector(`.${classes.nestedSectionDividerClass.split(' ')[0]}`)).not.toBeNull();
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
    expect(div.querySelector(".col-span-full")).toBeNull();

    // Click to expand
    const summaryRow = div.querySelector(`.${classes.nestedSummaryRowClass.split(' ')[0]}`) as HTMLElement;
    summaryRow.click();

    // Re-render template with new state
    template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[1], 1, classes);
    render(template, div);
    expect(div.querySelector(".col-span-full")).not.toBeNull();
  });

  it("renders read-only nested shapes without guide rails and with unified section divider in view mode", () => {
    const renderer = new ShaclRenderer();
    renderer.mode = "view";
    const classes = ShaclRenderer.DEFAULTS;
    const uiComponent: any = {
      uuid: "addr-1",
      label: "Address",
      maxCount: 1,
      minCount: 1,
      values: [{ path: { path: "ex:address" }, value: { value: "_:b1" } }],
      children: [[]]
    };
    const template = renderDetailsViewer(renderer, uiComponent, uiComponent.values[0], 0, classes);
    const div = document.createElement("div");
    render(template, div);
    expect(div.querySelector(".border-l-2")).toBeNull();
    expect(div.textContent).toContain("↳ Address");
    expect(div.querySelector("input")).toBeNull();
    expect(div.querySelector("button")).toBeNull();
  });

  it("renders read-only repeated nested shapes with summary avatars in view mode", () => {
    const renderer = new ShaclRenderer();
    renderer.mode = "view";
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
    const template = renderDetailsViewer(renderer, uiComponent, uiComponent.values[0], 0, classes);
    const div = document.createElement("div");
    render(template, div);
    const avatar = div.querySelector(`.${classes.nestedSummaryAvatarClass.split(' ')[0]}`);
    expect(avatar).not.toBeNull();
    expect(div.querySelector("button")).toBeNull();
  });

  it("ignores blank node values and extracts meaningful child literal as summary title with subtitle", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const uiComponent: any = {
      uuid: "personnel-1",
      label: "Onboard Personnel",
      maxCount: 5,
      minCount: 0,
      paths: [{ path: "ex:personnel" }],
      values: [
        { path: { path: "ex:personnel" }, value: { termType: "BlankNode", value: "df_9_0" } }
      ],
      children: [
        [
          {
            uuid: "role-1",
            label: "Role",
            paths: [{ path: "schema:role" }],
            values: [{ path: { path: "schema:role" }, value: { termType: "BlankNode", value: "df_9_1" } }],
            children: [
              [
                {
                  uuid: "role-name-1",
                  label: "Science Role",
                  paths: [{ path: "schema:roleName" }],
                  values: [{ path: { path: "schema:roleName" }, value: { termType: "Literal", value: "Chief Scientist" } }]
                }
              ]
            ]
          }
        ]
      ]
    };

    const template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[0], 0, classes);
    const div = document.createElement("div");
    render(template, div);

    expect(div.innerHTML).not.toContain("df_9_0");
    expect(div.innerHTML).not.toContain("df_9_1");
    expect(div.innerHTML).toContain("Chief Scientist");
    expect(div.innerHTML).toContain("Onboard Personnel #1");

    const avatar = div.querySelector(`.${classes.nestedSummaryAvatarClass.split(' ')[0]}`);
    expect(avatar?.textContent?.trim()).toBe("CS");
  });

  it("falls back to friendly component label and index when only blank nodes exist", () => {
    const renderer = new ShaclRenderer();
    const classes = ShaclRenderer.DEFAULTS;
    const uiComponent: any = {
      uuid: "equip-1",
      label: "Deployed Equipment",
      maxCount: 5,
      minCount: 0,
      paths: [{ path: "ex:equipment" }],
      values: [
        { path: { path: "ex:equipment" }, value: { termType: "BlankNode", value: "df_9_5" } }
      ],
      children: [
        [
          {
            uuid: "sensor-spec-1",
            label: "Sensor Specification",
            paths: [{ path: "ex:spec" }],
            values: [{ path: { path: "ex:spec" }, value: { termType: "BlankNode", value: "df_9_6" } }],
            children: [[]]
          }
        ]
      ]
    };

    const template = renderDetailsEditor(renderer, uiComponent, uiComponent.values[0], 0, classes);
    const div = document.createElement("div");
    render(template, div);

    expect(div.innerHTML).not.toContain("df_9_5");
    expect(div.innerHTML).not.toContain("df_9_6");
    expect(div.innerHTML).toContain("Deployed Equipment #1");

    const avatar = div.querySelector(`.${classes.nestedSummaryAvatarClass.split(' ')[0]}`);
    expect(avatar?.textContent?.trim()).toBe("D1");
  });
});

