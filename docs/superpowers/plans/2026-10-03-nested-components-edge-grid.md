# Nested Components Edge-Grid Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate nested container borders and the cascading left guide rail staircase in `<shacl-renderer>`, locking all nested inputs into an edge-aligned 2-column grid with clean, single-row sub-section headers and inline variant controls.

**Architecture:** Refactor the presentation layer in `lib/presentation/widgets/editors-rich-nested.ts` and `layout.ts` so 1:1 nested sub-shapes dissolve directly onto the common 2-column grid without compounding padding or left guide rails. Replace the 4-line redundant header stack (property label + dropdown + pip subhead + breadcrumb) with a unified, full-width section header containing an embedded inline variant selector and subtle tree glyph (`↳`).

**Tech Stack:** TypeScript, Lit 3, Tailwind CSS (via styling slots & `twMerge`), RDF/JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-03-nested-components-edge-grid-design.md](file:///c:/Users/cedri/Documents/github/shacl-ui.js/docs/superpowers/specs/2026-10-03-nested-components-edge-grid-design.md)

## Global Constraints

- Preserve 100% backwards compatibility for existing styling slots: any consumer overriding `detailsEditorClass` or `detailsViewerClass` must continue to work.
- Zero extra external dependencies; utilize existing `lit`, `tailwind-merge`, and `@rdfjs/types`.
- All interactive elements must maintain unique, predictable accessibility attributes and keyboard/click affordances.
- Support both Light and Dark modes seamlessly using Tailwind `dark:` variants.
- Form inputs, RDF serialization, and dataStore mutations must retain 100% fidelity.

## Review Focus

1. **Multi-tier Hierarchies ($\ge 3$ levels)**: Multi-level schemas (`Cruise → DeployedEquipment → InSituSensor → SensorPayload`) must keep all input fields locked to the exact same vertical left and middle grid lines with zero horizontal indentation drift.
2. **Variant (`sh:or`) Switching**: Clicking the inline variant pill in the sub-section header must properly toggle the shape options and update the underlying quads in `dataStore` without resetting peer fields.
3. **Repeated Shape (1:N) Integrity**: Repeated parent items must retain their outer card summary row (`[D1] Title [⌃]`) and clean card boundary when expanded.
4. **View Mode Parity**: Switching to `mode="view"` must render the same unified section dividers and 2-column read-only key-value pairs with zero layout shift.
5. **Dynamic Removal**: Clicking `[Remove]` on removable nested items must cleanly remove their triples and update the UI.

---

### Task 1: Update Styling Slots Contract (`lib/styling-slots.ts` & `lib/types.ts`)

**Files:**
- Modify: `lib/styling-slots.ts:35-45`
- Modify: `lib/types.ts:180-210`
- Test: `test/element-styling.test.ts`

**Interfaces:**
- Produces: `nestedSectionDividerClass`, `nestedVariantBadgeClass` in `STYLING_SLOTS`. Updates `detailsEditorClass` to `col-span-full my-3 relative` and `nestedRailClass` to `w-full`.

- [ ] **Step 1: Write failing test in `test/element-styling.test.ts`**

```typescript
it('defines edge-grid nested styling slots without border-l-2 staircase', () => {
  expect(STYLING_SLOTS).toHaveProperty('nestedSectionDividerClass');
  expect(STYLING_SLOTS).toHaveProperty('nestedVariantBadgeClass');
  expect(STYLING_SLOTS.detailsEditorClass).not.toContain('border-l-2');
  expect(STYLING_SLOTS.detailsEditorClass).toContain('col-span-full');
  expect(STYLING_SLOTS.nestedRailClass).not.toContain('border-l-2');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/element-styling.test.ts`
Expected: FAIL due to missing slot properties or existing `border-l-2` assertions.

- [ ] **Step 3: Update `lib/types.ts` and `lib/styling-slots.ts`**

In `lib/types.ts`:
Add `nestedSectionDividerClass?: string;` and `nestedVariantBadgeClass?: string;` to `TailwindClasses`.

In `lib/styling-slots.ts`:
- `detailsEditorClass`: `'col-span-full my-3 relative'`
- `nestedRailClass`: `'w-full'`
- `nestedSectionDividerClass`: `'col-span-full pt-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between mb-4'`
- `nestedVariantBadgeClass`: `'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer'`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/element-styling.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/types.ts lib/styling-slots.ts test/element-styling.test.ts
git commit -m "feat(styling): add edge-grid nested styling slots and remove rail defaults"
```

---

### Task 2: Refactor 1:1 Nested Shape Presentation & Headers (`lib/presentation/widgets/editors-rich-nested.ts`)

**Files:**
- Modify: `lib/presentation/widgets/editors-rich-nested.ts:13-65`
- Test: `test/macro-layout.test.ts`

**Interfaces:**
- Consumes: `classes.nestedSectionDividerClass`, `classes.nestedVariantBadgeClass`, `classes.detailsEditorClass`.
- Produces: Clean, unindented 1:1 sub-shapes with single-row section header, embedded variant controls, and child fields flowing in the 2-column grid.

- [ ] **Step 1: Write failing test in `test/macro-layout.test.ts`**

```typescript
it('renders 1:1 nested shape dissolved into parent grid without left guide rail', () => {
  // Test rendering a single nested shape and assert container classes do not contain border-l-2 or pl-5
  // and assert header has tree glyph ↳ and unified divider
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `renderDetailsEditor` in `lib/presentation/widgets/editors-rich-nested.ts`**

For `!isMultiple`:
1. Remove `pl-5` and `border-l-2` containers. Wrap in `<div class="${twMerge(classes.detailsEditorClass, classes.nestedRailClass)}">`.
2. Deduplicate header: check if `uiComponent.label` matches child shape label.
3. Render unified header row using `classes.nestedSectionDividerClass`:
   - Title prefixed with `↳ `.
   - If `uiComponent.orNode` exists or multiple `classes` exist, embed the variant selector button using `classes.nestedVariantBadgeClass`.
   - Render `[Remove]` button if `canRemove`.
4. Render children via `renderUIComponents(renderer, childComponents, classes, depth + 1, nextAncestors)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/presentation/widgets/editors-rich-nested.ts test/macro-layout.test.ts
git commit -m "feat(nested): dissolve 1:1 shapes and unify section header"
```

---

### Task 3: Streamline Layout Dispatch & Eliminate Breadcrumbs (`lib/presentation/widgets/layout.ts`)

**Files:**
- Modify: `lib/presentation/widgets/layout.ts:300-330`
- Modify: `lib/presentation/widgets/viewers-nested.ts:1-60`
- Test: `test/macro-layout.test.ts`

**Interfaces:**
- Consumes: `renderUIComponents`, `renderUIComponentViewMode`.
- Produces: Elimination of verbose textual breadcrumb strings; child components cleanly nested in edge-aligned 2-column grid across Edit and View modes.

- [ ] **Step 1: Write failing test in `test/macro-layout.test.ts`**

```typescript
it('does not render textual breadcrumb trail for deeply nested shapes', () => {
  // Render nested shape at depth >= 2
  // Assert nestedBreadcrumbClass / '›' text is not present in DOM
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `lib/presentation/widgets/layout.ts` and `viewers-nested.ts`**

1. In `renderUIComponents`:
   Remove the breadcrumb bar rendering block:
   ```typescript
   // Remove: ${depth >= 2 && ancestors.length > 0 ? html`<div class="${twMerge(classes.nestedBreadcrumbClass)}">...</div>` : nothing}
   ```
2. Ensure child components in `renderUIComponents` render directly in `<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">`.
3. In `lib/presentation/widgets/viewers-nested.ts`:
   Update `renderDetailsViewer` to use the unified section divider without `border-l-2 pl-4`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/macro-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add lib/presentation/widgets/layout.ts lib/presentation/widgets/viewers-nested.ts test/macro-layout.test.ts
git commit -m "feat(layout): eliminate text breadcrumbs and ensure view mode grid parity"
```

---

### Task 4: Full Suite Validation & Visual Verification on Workbench

**Files:**
- Test: All tests (`npm run test`)
- Browser: `http://localhost:5173/src/workbench.html`

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS with zero regressions.

- [ ] **Step 2: Run visual verification on Workbench in browser**

Using browser automation or subagent:
1. Open `http://localhost:5173/src/workbench.html`.
2. Load the "Oceanographic Cruise" preset.
3. Verify that `Equipment Deployment`, `Instrument Type Specification`, and `Sensor Measurement Specification` are displayed with clean hairline dividers, embedded variant switchers, zero stacked left borders, and inputs perfectly aligned to the 2-column grid.
4. Capture a screenshot for confirmation.

- [ ] **Step 3: Final branch commit**

```bash
git commit --allow-empty -m "chore: verify nested components edge-grid architecture"
```
