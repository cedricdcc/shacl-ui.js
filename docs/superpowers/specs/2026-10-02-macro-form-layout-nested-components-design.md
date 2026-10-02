# Design Specification: Macro Form Layout & Nested Component Architecture

## 1. Overview & Design Principles

This specification establishes the macro-layout architecture and design system for `<shacl-renderer>` forms in `shacl-ui.js`. It resolves the "card-in-card" nesting problem and adopts the 6 core UI practices that make dense, component-based user interfaces feel clean, scannable, and robust.

### 1.1 The 6 Core UI Practices
1. **Anchor Elements to Edges**:
   - The form renders onto an **adaptive 2-column edge grid** (`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4`).
   - Labels and atomic inputs lock to common column edges, creating continuous vertical alignment planes across the form.
   - Wide and complex editors (TextAreas, RichText, ValueTables, nested NodeShapes) span full width (`col-span-full`) to ground the layout.
2. **Differentiate Instead of Spacing**:
   - Replaces excessive empty whitespace with visual differentiation:
     - Section indicators with micro accent pips (`w-1 h-3.5 bg-indigo-500 rounded-full mr-2`).
     - Entity badges and initial avatars (e.g. `VL`, `UG`, person/org glyphs) on repeated items.
     - Semantic metadata chips (e.g. `@en`, `Primary`, `IRI`).
3. **Show, Don't Tell**:
   - Replaces redundant helper sentences with immediate visual symbols: status dots, entry counters (`2 entries`), and clear expand/collapse glyphs (`▾` / `▴`).
4. **Design for Scannability**:
   - Uses compact uppercase tracking labels (`text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400`).
   - Ensures an uncluttered left-to-right eye path without visual obstacle courses.
5. **Create Emphasis Through Contrast, Not Addition**:
   - Default states are quiet and muted (`border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-300`).
   - Focused, active, or modified elements pop with clear, intentional contrast (`ring-2 ring-indigo-500/20 border-indigo-500 bg-white dark:bg-zinc-800`).
6. **Dissolve Unnecessary Cards and Containers**:
   - Eliminates `details-editor-card` box-in-box nesting and descendant CSS hacks.
   - Single (1:1) nested shapes dissolve directly into the form plane, anchored solely by a vertical left guide rail (`border-l-2 pl-4`).
   - Multi-instance (1:N) repeated items render as compact, borderless list rows with inline accordion expansion.

---

## 2. Architectural Design

```
+-----------------------------------------------------------------------------------+
|                           Macro Form Container                                    |
|   - Adaptive 2-Column Edge Grid (md:grid-cols-2 gap-x-6 gap-y-4)                   |
|   - Quiet default backgrounds, sharp focus contrast                                |
+-----------------------------------------------------------------------------------+
          |                                                       |
          v                                                       v
+------------------------------------+  +-------------------------------------------+
|    1:1 Nested NodeShape            |  |    1:N Repeated Nested NodeShape          |
|    (Single instance / maxCount=1)  |  |    (Multiple values / maxCount > 1)       |
|  - Dissolved into page flow        |  |  - Group header with count & "+ Add" btn  |
|  - Left guide rail (border-l-2)    |  |  - Compact Scannable Summary Strips       |
|  - Micro accent pip title          |  |    [Avatar] Title + Chip [Expand ▾] [Del] |
|  - Children inherit 2-col grid     |  |  - In-place accordion expansion via rail  |
+------------------------------------+  +-------------------------------------------+
                                                              |
                                                              v (Level >= 2)
                                        +-------------------------------------------+
                                        |    Breadcrumb Depth Cap (Max 1 Indent)    |
                                        |  - Level 2+ does NOT indent further       |
                                        |  - Inline breadcrumb: WP2 › Deliverable   |
                                        |  - Prevents horizontal staircase squish   |
                                        +-------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1 Single 1:1 Nested NodeShapes
- **Applicability**: When a property has `sh:node` or represents a blank node with `maxCount === 1` or exactly 1 value.
- **Visual Presentation**:
  - No card frame, no background color, no outer borders.
  - Header: Inline section title preceded by an accent pip:
    ```html
    <div class="flex items-center gap-2 mb-2">
      <div class="w-1 h-3.5 bg-indigo-500 dark:bg-indigo-400 rounded-full"></div>
      <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">${uiComponent.label}</h3>
      ${uiComponent.description ? html`<span class="text-xs text-zinc-400">· ${uiComponent.description}</span>` : nothing}
    </div>
    ```
  - Guide Rail Container:
    ```html
    <div class="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80 focus-within:border-indigo-500/80 transition-colors my-2">
      ${renderUIComponents(renderer, childComponents, classes, depth + 1, nextAncestors)}
    </div>
    ```

### 3.2 Repeated 1:N Nested NodeShapes
- **Applicability**: When a nested component has multiple values (`values.length > 1`) or permits multiple values (`maxCount == null || maxCount > 1`).
- **Group Header**:
  - Displays property label on the left with a count pill (`2 entries`).
  - Displays a clean dashed `+ Add [Label]` button aligned to the right edge.
- **Summary Rows**:
  - Compact row (`h-11 px-3 py-2 flex items-center justify-between border border-zinc-200 dark:border-zinc-700/80 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 transition-colors`).
  - **Avatar**: 24x24px rounded square with uppercase initials or entity glyph (e.g. `VL`, `UG`, person/institution icon).
  - **Label & Subtitle**: Derived from `rdfs:label`, `skos:prefLabel`, or the first non-empty text child quad.
  - **Actions**: Expand/collapse toggle (`▾`/`▴`) and delete icon (`Remove`).
- **Expanded State**:
  - Toggles smoothly directly beneath the summary strip.
  - Connected by the left vertical accent rail.
  - Newly added items via `+ Add` auto-expand and set focus to the first child input.

### 3.3 Breadcrumb Depth Cap for Deep Hierarchies ($\ge 2$)
- **Problem**: When shapes nest deeply (e.g. `ProjectProposal → WorkPackage → Deliverable → Task`), subsequent `pl-4` or `pl-6` paddings rapidly cause severe horizontal squishing.
- **Rule**:
  - Depth 0 (Root): Normal page padding.
  - Depth 1: Indented once with guide rail (`pl-4 border-l-2`).
  - Depth $\ge 2$: **Stops indenting further** (`pl-0 border-l-0`). Instead, renders an inline breadcrumb bar at the top of the child section:
    ```html
    <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 py-1 mb-2 border-b border-zinc-200/60 dark:border-zinc-700/60">
      <span>${ancestorLabels.join(' › ')}</span>
    </div>
    ```
  - Fields inside Depth $\ge 2$ lock to the exact same left alignment plane as Depth 1, preserving horizontal screen width.

### 3.4 View Mode Presentation
- **Cardless Key-Value Pairs**:
  - Standard fields render in the 2-column grid without input boxes:
    - Label: `text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400`
    - Value: `text-sm text-zinc-900 dark:text-zinc-100 font-medium`
  - Empty optional fields display a muted dash `—` or are cleanly omitted.
- **Nested Shapes in View Mode**:
  - Render with the matching left guide rail (`detailsViewerClass`), maintaining zero layout shift when toggling between Edit and View modes.
  - Repeated shapes render as clean, read-only item rows without edit or delete buttons.

---

## 4. Styling Slots Specification (`lib/styling-slots.ts`)

### 4.1 Updated Existing Slots
- **`detailsEditorClass`**:
  ```css
  details-editor-rail my-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80 focus-within:border-indigo-500/80 transition-colors relative
  ```
  *(Removes the brittle `[&_.details-editor-card]` descendant overrides and replaces the card box with the dissolved rail).*
- **`detailsViewerClass`**:
  ```css
  my-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80
  ```
- **`labelClass`**:
  ```css
  block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5
  ```
- **`globalInputFieldClass`**:
  ```css
  w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs
  ```

### 4.2 New Styling Slots
- **`nestedRailClass`**:
  ```css
  pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80 focus-within:border-indigo-500/80 transition-colors
  ```
- **`nestedSummaryRowClass`**:
  ```css
  flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-700/40 cursor-pointer transition-colors
  ```
- **`nestedSummaryAvatarClass`**:
  ```css
  w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0
  ```
- **`nestedBreadcrumbClass`**:
  ```css
  flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 py-1 mb-2 border-b border-zinc-200/60 dark:border-zinc-700/60
  ```
- **`nestedHeaderPipClass`**:
  ```css
  w-1 h-3.5 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-2 shrink-0
  ```

---

## 5. State Management & Data Contracts

### 5.1 `<shacl-renderer>` State
```typescript
/** Tracks open/collapsed state of repeated nested items, keyed by `${uiComponent.uuid}-${index}` */
@state()
private expandedNestedItems: Record<string, boolean> = {};

/** Checks whether a repeated nested item is expanded. */
isNestedItemExpanded(uuid: string, index: number, defaultOpen: boolean): boolean {
  const key = `${uuid}-${index}`;
  return this.expandedNestedItems[key] ?? defaultOpen;
}

/** Toggles expansion of a repeated nested item. */
toggleNestedItemExpanded(uuid: string, index: number, defaultOpen: boolean): void {
  const key = `${uuid}-${index}`;
  const current = this.isNestedItemExpanded(uuid, index, defaultOpen);
  this.expandedNestedItems = {
    ...this.expandedNestedItems,
    [key]: !current
  };
}
```

### 5.2 Ancestry Propagation in `renderUIComponents`
```typescript
export function renderUIComponents(
  renderer: ShaclRenderer,
  uiComponents: UIComponent[],
  classes: TailwindClasses,
  depth: number = 0,
  ancestors: string[] = []
): TemplateResult
```
- `depth`: current nesting depth (0 = root shape, 1 = first nested shape, 2+ = deep hierarchy).
- `ancestors`: array of human-readable labels of parent shapes (e.g. `['Project Proposal', 'Work Package 2']`).

---

## 6. Verification & Test Plan

### 6.1 Automated Vitest Tests (`test/macro-layout.test.ts`)
1. **1:1 Nested Shape Dissolution**:
   - Verify that `<shacl-renderer>` renders a single nested shape with `nestedRailClass`.
   - Verify that no `details-editor-card` box borders or nested background styles are emitted.
2. **1:N Repeated Summary Strips**:
   - Verify that repeated blank nodes render as summary strips with avatar initial chips.
   - Verify that clicking the expand button toggles the expanded fields in the DOM.
3. **Breadcrumb Depth Cap**:
   - Provide a 3-level SHACL schema (`A -> B -> C`).
   - Verify that Level 2 renders the breadcrumb header (`A › B › C`).
   - Verify that Level 2 container has `pl-0 border-l-0`, preventing horizontal margin inflation.
4. **Styling Slot Overrides**:
   - Provide custom `nestedRailClass` and `nestedSummaryRowClass` on `<shacl-renderer>`.
   - Verify that custom classes are merged correctly via `twMerge`.
5. **View Mode Parity**:
   - Verify that in `mode="view"`, guide rails are present and no edit/delete buttons or expand dropdowns are rendered.

### 6.2 Manual Workbench Verification (`src/workbench.html`)
- Load multi-level nested templates (e.g. `ex:Person` with nested `ex:Address` and repeated `ex:Affiliation`).
- Verify visual aesthetics in both Dark and Light themes.
- Confirm that adding a new item via `+ Add Affiliation` auto-expands the new item and syncs live RDF Turtle quads to the output panel.
