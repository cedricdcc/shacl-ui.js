# Macro Form Layout & Nested Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Weirdly Perfect" Macro Form Layout architecture in `<shacl-renderer>`, eliminating nested card-in-card containers, establishing an adaptive 2-column edge grid, providing dissolved guide rails for 1:1 shapes, compact scannable summary accordions for 1:N repeated items, and a breadcrumb depth cap for deep hierarchies.

**Architecture:** Refactor the presentation and styling layer so that `<shacl-renderer>` renders an adaptive 2-column edge grid. Single (1:1) nested shapes dissolve directly into the page flow anchored by a subtle vertical left guide rail (`border-l-2`), while repeated (1:N) items render as compact summary rows with entity avatars and inline accordion expansion. Deep hierarchies ($\ge 2$ levels) cap horizontal indentation using an inline breadcrumb bar to eliminate staircase margin inflation.

**Tech Stack:** TypeScript, Lit 3, Tailwind CSS (via styling slots & `twMerge`), RDF/JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-02-macro-form-layout-nested-components-design.md](file:///c:/Users/cedri/Documents/github/shacl-ui.js/docs/superpowers/specs/2026-10-02-macro-form-layout-nested-components-design.md)

## Global Constraints
- Preserve 100% backwards compatibility for existing styling slots: any consumer overriding `detailsEditorClass` or `detailsViewerClass` must continue to work.
- Zero extra external dependencies; utilize existing `lit`, `tailwind-merge`, and `@rdfjs/types`.
- All interactive elements must maintain unique, predictable accessibility attributes and keyboard/click affordances.
- Support both Light and Dark modes seamlessly using Tailwind `dark:` variants.

## Review Focus
1. **Empty / Incomplete Nested Objects**: A nested blank node with no populated child quads must render its dissolved guide rail and field inputs gracefully without throwing undefined errors.
2. **Deeply Nested Shapes ($\ge 3$ levels)**: Multi-tier schemas (`Project → WorkPackage → Deliverable → Task`) must cap indentation at Level 1 and render the breadcrumb bar (`WP2 › Deliverable › Task`) without horizontal margin drift.
3. **Rapid Accordion Toggling**: Collapsing and expanding repeated item accordions must preserve form field input values without resetting user keystrokes.
4. **Dynamic Item Removal**: Deleting an expanded repeated item must remove its triples from `dataStore`, cleanly collapse its state, and not leave dangling orphan indices.
5. **View Mode Parity**: Toggling `mode="view"` must display identical vertical alignment guide rails and grid planes with zero layout shift, hiding all edit/delete buttons.

---

### Task 1: Refactor Styling Slots (`lib/styling-slots.ts`)

**Files:**
- Modify: `lib/styling-slots.ts:1-120`
- Test: `test/element-styling.test.ts`

**Interfaces:**
- Produces: New slot names in `STYLING_SLOTS`: `nestedRailClass`, `nestedSummaryRowClass`, `nestedSummaryAvatarClass`, `nestedBreadcrumbClass`, `nestedHeaderPipClass`. Refactored `detailsEditorClass`, `detailsViewerClass`, `labelClass`, and `globalInputFieldClass`.

- [ ] **Step 1: Write failing tests for new styling slots in `test/element-styling.test.ts`**

```typescript
it('defines the new macro layout and nested styling slots with expected defaults', () => {
  expect(STYLING_SLOTS).toHaveProperty('nestedRailClass');
  expect(STYLING_SLOTS).toHaveProperty('nestedSummaryRowClass');
  expect(STYLING_SLOTS).toHaveProperty('nestedSummaryAvatarClass');
  expect(STYLING_SLOTS).toHaveProperty('nestedBreadcrumbClass');
  expect(STYLING_SLOTS).toHaveProperty('nestedHeaderPipClass');
  expect(STYLING_SLOTS.detailsEditorClass).toContain('details-editor-rail');
  expect(STYLING_SLOTS.detailsEditorClass).not.toContain('details-editor-card');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/element-styling.test.ts`
Expected: FAIL with missing properties or card assertions.

- [ ] **Step 3: Update `lib/styling-slots.ts` with new slots and refactored classes**

Update `STYLING_SLOTS` with:
- `labelClass`: `'block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5'`
- `globalInputFieldClass`: `'w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs'`
- `detailsEditorClass`: `'details-editor-rail my-3 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80 focus-within:border-indigo-500/80 transition-colors relative'`
- `detailsViewerClass`: `'my-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80'`
- `nestedRailClass`: `'pl-4 border-l-2 border-zinc-200 dark:border-zinc-700/80 focus-within:border-indigo-500/80 transition-colors'`
- `nestedSummaryRowClass`: `'flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100/60 dark:hover:bg-zinc-700/40 cursor-pointer transition-colors'`
- `nestedSummaryAvatarClass`: `'w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0'`
- `nestedBreadcrumbClass`: `'flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 py-1 mb-2 border-b border-zinc-200/60 dark:border-zinc-700/60'`
- `nestedHeaderPipClass`: `'w-1 h-3.5 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-2 shrink-0'`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/element-styling.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/styling-slots.ts test/element-styling.test.ts
git commit -m "feat(styling): add macro form layout slots and dissolved rail defaults"
```

---

### Task 2: State Management & Hierarchy Tracking in `<shacl-renderer>` (`lib/shacl-renderer.ts`)

**Files:**
- Modify: `lib/shacl-renderer.ts:240-380`
- Test: `test/macro-layout.test.ts`

**Interfaces:**
- Produces: `renderer.isNestedItemExpanded(uuid: string, index: number, defaultOpen?: boolean): boolean`, `renderer.toggleNestedItemExpanded(uuid: string, index: number, defaultOpen?: boolean): void`.
- Propagates: `depth` and `ancestors` down into `renderRootSlots`.

- [ ] **Step 1: Write failing test in `test/macro-layout.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { ShaclRenderer } from '../lib/shacl-renderer.ts';

describe('ShaclRenderer nested state management', () => {
  it('manages accordion expansion per component uuid and item index', () => {
    const renderer = new ShaclRenderer();
    expect(renderer.isNestedItemExpanded('comp-1', 0, true)).toBe(true);
    expect(renderer.isNestedItemExpanded('comp-1', 1, false)).toBe(false);

    renderer.toggleNestedItemExpanded('comp-1', 1, false);
    expect(renderer.isNestedItemExpanded('comp-1', 1, false)).toBe(true);

    renderer.toggleNestedItemExpanded('comp-1', 1, false);
    expect(renderer.isNestedItemExpanded('comp-1', 1, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: FAIL with `isNestedItemExpanded is not a function`.

- [ ] **Step 3: Implement expansion state methods in `lib/shacl-renderer.ts`**

In `ShaclRenderer`:
- Add `@state() private expandedNestedItems: Record<string, boolean> = {};`
- Implement `isNestedItemExpanded(uuid: string, index: number, defaultOpen: boolean = false): boolean`:
  ```typescript
  isNestedItemExpanded(uuid: string, index: number, defaultOpen: boolean = false): boolean {
    const key = `${uuid}-${index}`;
    return this.expandedNestedItems[key] ?? defaultOpen;
  }
  ```
- Implement `toggleNestedItemExpanded(uuid: string, index: number, defaultOpen: boolean = false): void`:
  ```typescript
  toggleNestedItemExpanded(uuid: string, index: number, defaultOpen: boolean = false): void {
    const key = `${uuid}-${index}`;
    const current = this.isNestedItemExpanded(uuid, index, defaultOpen);
    this.expandedNestedItems = {
      ...this.expandedNestedItems,
      [key]: !current
    };
    this.requestUpdate();
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/shacl-renderer.ts test/macro-layout.test.ts
git commit -m "feat(core): add nested item accordion state management to ShaclRenderer"
```

---

### Task 3: Adaptive 2-Column Grid & Breadcrumb Depth Cap (`lib/presentation/widgets/layout.ts`)

**Files:**
- Modify: `lib/presentation/widgets/layout.ts:135-290`
- Test: `test/macro-layout.test.ts`

**Interfaces:**
- Consumes: `renderer`, `depth: number`, `ancestors: string[]`.
- Produces: `renderUIComponents(renderer, uiComponents, classes, depth, ancestors)`.

- [ ] **Step 1: Write failing test for adaptive grid & breadcrumb depth cap in `test/macro-layout.test.ts`**

```typescript
it('renders breadcrumb depth cap at depth >= 2 and stops horizontal padding', async () => {
  // Test rendering of depth >= 2 produces breadcrumb bar and omits extra indentation
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `renderUIComponents` in `lib/presentation/widgets/layout.ts`**

- Accept optional `depth: number = 0` and `ancestors: string[] = []` parameters.
- At `depth >= 2` and `ancestors.length > 0`: Render the breadcrumb bar:
  ```html
  <div class="${classes.nestedBreadcrumbClass}">
    <span>${ancestors.join(' › ')}</span>
  </div>
  ```
- Structure component grouping with the adaptive 2-column grid (`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4`).
- Full-width determination (`col-span-full`):
  ```typescript
  const isFullWidth = components.length === 1
    || c.node != null
    || c.orNode != null
    || c.defaultWidget === shui('DetailsEditor')
    || c.defaultWidget === shui('DetailsViewer')
    || c.defaultWidget === shui('TextAreaEditor')
    || c.defaultWidget === shui('RichTextEditor')
    || c.defaultWidget === shui('ValueTableViewer');
  ```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/presentation/widgets/layout.ts test/macro-layout.test.ts
git commit -m "feat(layout): implement adaptive 2-column grid and breadcrumb depth cap"
```

---

### Task 4: 1:1 Dissolved Guide Rail & 1:N Repeated Summary Accordion (`lib/presentation/widgets/editors-rich-nested.ts`)

**Files:**
- Modify: `lib/presentation/widgets/editors-rich-nested.ts:13-60`
- Test: `test/macro-layout.test.ts`

**Interfaces:**
- Consumes: `renderDetailsEditor(renderer, uiComponent, value, index, classes, disabled, depth, ancestors)`.

- [ ] **Step 1: Write failing test in `test/macro-layout.test.ts` for 1:1 dissolved rail vs 1:N summary accordion**

```typescript
it('renders 1:1 nested shape with dissolved guide rail and no outer card border', async () => {
  // Test that single nested shape renders with nestedRailClass
});

it('renders 1:N repeated shapes as summary rows with avatar chips and expand toggle', async () => {
  // Test repeated shapes render summary rows with avatars and expand toggle
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement dissolved 1:1 rail and 1:N summary accordion in `lib/presentation/widgets/editors-rich-nested.ts`**

- Derive `isMultiple = (uiComponent.maxCount ?? 2) > 1 || uiComponent.values.length > 1;`
- **For 1:1 single shape**:
  - Render title with micro accent pip (`nestedHeaderPipClass`).
  - Render dissolved guide rail container (`nestedRailClass`) without card background or borders.
  - Pass `depth + 1` and `[...ancestors, uiComponent.label]` to `renderUIComponents`.
- **For 1:N repeated items**:
  - If `index === 0`, render the group header with title, entry count badge (`${uiComponent.values.length} entries`), and `+ Add [Label]` button.
  - Extract primary summary label (from quads or `Item #${index + 1}`).
  - Generate avatar initial chip (2 uppercase letters or icon).
  - Render summary strip (`nestedSummaryRowClass`):
    - Avatar (`nestedSummaryAvatarClass`).
    - Title + description.
    - Expand/collapse toggle button.
    - Remove button (if canRemove).
  - When expanded (`renderer.isNestedItemExpanded(uiComponent.uuid, index, index === 0)`):
    - Render child fields wrapped by the vertical guide rail (`nestedRailClass`).
- When clicking `+ Add`: automatically expand the newly added index so user can edit immediately.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/presentation/widgets/editors-rich-nested.ts test/macro-layout.test.ts
git commit -m "feat(ui): implement dissolved 1:1 rail and 1:N scannable summary accordion"
```

---

### Task 5: View Mode Editorial Document Presentation (`lib/presentation/widgets/viewers-nested.ts`)

**Files:**
- Modify: `lib/presentation/widgets/viewers-nested.ts:1-60`
- Test: `test/macro-layout.test.ts`

**Interfaces:**
- Consumes: `renderDetailsViewer(renderer, uiComponent, value, index, classes, depth, ancestors)`.

- [ ] **Step 1: Write failing test in `test/macro-layout.test.ts` for View Mode guide rail**

```typescript
it('renders read-only nested shapes with matching guide rail and no edit affordances in view mode', async () => {
  // Test view mode presentation
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `lib/presentation/widgets/viewers-nested.ts`**

- Render `detailsViewerClass` / `nestedRailClass` without card borders or background tinting.
- Render read-only key-value pairs.
- For repeated items, render clean scannable list rows with avatar initials without accordion toggle or delete buttons.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/presentation/widgets/viewers-nested.ts test/macro-layout.test.ts
git commit -m "feat(viewers): update DetailsViewer to match dissolved guide rail architecture"
```

---

### Task 6: Full Suite Verification & Interactive Workbench Validation

**Files:**
- Modify: `src/workbench.ts` (if needed for sample preset shapes)
- Test: All tests in `test/`

- [ ] **Step 1: Run complete vitest test suite**

Run: `npx vitest run`
Expected: All 23+ test files pass.

- [ ] **Step 2: Verify in browser with `npm run dev` or interactive workbench**

- Launch dev server: `npm run dev`.
- Load complex nested shapes (e.g. `Person` with nested `Address` and repeated `Affiliations`).
- Verify edge locking, dissolved guide rails, accordion expansion, and breadcrumb depth cap.
- Toggle between Edit and View modes to ensure zero layout shift.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: verify macro form layout and nested components across test suite"
```
