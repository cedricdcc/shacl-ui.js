# Custom Widget Missing Value and Fault Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide universal missing-value and validation fault visualization for all custom widgets (including black-box web components) via a framework error shell and inline alerts, enriched context properties, and VocabServer reference widget integration.

**Architecture:** The framework (`lib/presentation/widgets/layout.ts`) wraps any custom widget output in a standardized error container (`customWidgetErrorClass`) and renders the standard `renderFieldError(violations, classes)` alert underneath when violations exist. `CustomWidgetRenderContext` is enriched with `violations`, `hasError`, and `isEmpty` so cooperative widgets can also bind internal attributes (`aria-invalid="true"`, `?invalid`).

**Tech Stack:** TypeScript, Lit, RDF/JS DataModel, Vitest, Tailwind CSS utilities.

**Spec:** [`docs/superpowers/specs/2026-10-04-custom-widget-missing-value-visualization-design.md`](file:///c:/Users/cedri/Documents/github/shacl-ui.js/docs/superpowers/specs/2026-10-04-custom-widget-missing-value-visualization-design.md)

## Global Constraints
- Preserve non-breaking backwards compatibility for existing custom widget definitions.
- All file links must use markdown `file://` scheme.
- All existing 163 tests must pass without regressions.
- No changes to existing SHACL validation algorithms in `lib/core/validation.ts`.

## Review Focus
1. Custom widget with no violations: Must NOT render red error border or inline alert.
2. Custom widget with missing value (`minCount > 0`): Must render red container ring and inline alert explaining missing/invalid value.
3. Custom widget value clearing: When cleared to `null`, must trigger live validation and display error wrapper.
4. Mount-based custom widget (`mount` API): Must receive the same error wrapper and inline alert as `render`-based widgets.
5. VocabServer view mode: When empty and invalid, must display "Missing required value" indicator.

---

### Task 1: Enrich `CustomWidgetRenderContext` & Add `customWidgetErrorClass` Styling Slot

**Files:**
- Modify: `lib/types.ts:273-285`
- Modify: `lib/styling-slots.ts:1-70`
- Test: `test/element-styling.test.ts`

**Interfaces:**
- Produces:
  - `CustomWidgetRenderContext.violations: DetailedViolation[]`
  - `CustomWidgetRenderContext.hasError: boolean`
  - `CustomWidgetRenderContext.isEmpty: boolean`
  - Styling slot `customWidgetErrorClass` in `TailwindClasses`

- [x] **Step 1: Write the failing test for `customWidgetErrorClass` styling slot**

In `test/element-styling.test.ts`, add test verifying that `customWidgetErrorClass` exists in default styling and can be customized on `<shacl-renderer>`:

```typescript
it('supports customWidgetErrorClass styling slot override', () => {
  const el = new ShaclRenderer();
  expect(el.customWidgetErrorClass).toBeDefined();
  el.customWidgetErrorClass = 'custom-error-ring';
  expect(el.customWidgetErrorClass).toBe('custom-error-ring');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/element-styling.test.ts`
Expected: FAIL (property `customWidgetErrorClass` not defined on `ShaclRenderer`)

- [x] **Step 3: Update `lib/types.ts` and `lib/styling-slots.ts`**

1. In `lib/types.ts`, add to `CustomWidgetRenderContext`:
   ```typescript
   violations: DetailedViolation[];
   hasError: boolean;
   isEmpty: boolean;
   ```
2. In `lib/styling-slots.ts`:
   - Add `'customWidgetErrorClass'` to `STYLING_SLOT_NAMES`.
   - Add `customWidgetErrorClass: 'ring-1 ring-red-500/80 dark:ring-red-500/80 rounded-md p-0.5 transition-shadow'` to `DEFAULTS`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/element-styling.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add lib/types.ts lib/styling-slots.ts test/element-styling.test.ts
git commit -m "feat(types): add validation context to CustomWidgetRenderContext and customWidgetErrorClass slot"
```

---

### Task 2: Implement Universal Error Wrapper & Inline Alert in `lib/presentation/widgets/layout.ts`

**Files:**
- Modify: `lib/presentation/widgets/layout.ts:447-495`
- Test: `test/custom-widget-validation.test.ts`

**Interfaces:**
- Consumes: `getFieldViolations`, `renderFieldError`, `CustomWidgetRenderContext`, `classes.customWidgetErrorClass`
- Produces: Error-wrapped custom widget rendering in `renderEditor`

- [x] **Step 1: Write the failing integration test in `test/custom-widget-validation.test.ts`**

Create `test/custom-widget-validation.test.ts` registering a custom widget against a shape requiring `sh:minCount 1`. Verify that without data, the rendered DOM contains:
1. An outer container with `classes.customWidgetErrorClass` (e.g. `ring-red-500`).
2. An inline `role="alert"` element containing the SHACL violation reason.
3. When `onValueChange` is called with a valid IRI, the error ring and alert are cleared.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/custom-widget-validation.test.ts`
Expected: FAIL (custom widget is rendered without error wrapper or role="alert")

- [x] **Step 3: Update `renderEditor` in `lib/presentation/widgets/layout.ts`**

In `lib/presentation/widgets/layout.ts`:
1. When `hasCustomWidget(value.selectedWidget)` is matched:
   - Compute `violations = getFieldViolations(renderer, uiComponent.focusNode, value.path)`.
   - Compute `hasError = violations.length > 0`.
   - Compute `isEmpty = !value.value?.value || value.value.value.trim() === ''`.
   - Pass `violations`, `hasError`, `isEmpty` to `context`.
   - Render widget content (`customWidget.render(context)` or `renderCustomWidgetMount(customWidget, context)`).
   - Wrap in `<div class="custom-widget-field w-full relative">` with `<div class="${hasError ? twMerge('rounded-md ring-1 ring-red-500/80 dark:ring-red-500/80 p-0.5 transition-shadow', classes.customWidgetErrorClass) : ''}">` and `${hasError ? renderFieldError(violations, classes) : nothing}`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/custom-widget-validation.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add lib/presentation/widgets/layout.ts test/custom-widget-validation.test.ts
git commit -m "feat(layout): wrap custom widgets in error container and render inline violation alert"
```

---

### Task 3: Update `VocabServer` Reference Widget to Consume Enriched Validation Context

**Files:**
- Modify: `lib/widgets/vocabserver/component.ts:102-156`
- Test: `test/widgets/vocabserver.test.ts`

**Interfaces:**
- Consumes: `CustomWidgetRenderContext.hasError`, `CustomWidgetRenderContext.violations`
- Produces: `<vocab-search-bar ?invalid="${hasError}" aria-invalid="${hasError ? 'true' : 'false'}">` and view-mode missing value indicator

- [x] **Step 1: Write unit tests in `test/widgets/vocabserver.test.ts`**

Add tests to `test/widgets/vocabserver.test.ts`:
1. Edit mode: When `hasError: true`, the template includes `?invalid` and `aria-invalid="true"`.
2. View mode: When `hasError: true` and `value` is empty, renders `"Missing required value"` text.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/widgets/vocabserver.test.ts`
Expected: FAIL (missing `invalid` attribute or error text)

- [x] **Step 3: Update `VocabServerWidgetDefinition.render` in `lib/widgets/vocabserver/component.ts`**

1. In view mode:
   ```typescript
   if (mode === 'view') {
     if (!currentVal) {
       return hasError
         ? html`<span class="text-xs text-red-500 dark:text-red-400 italic">Missing required value</span>`
         : html`<span class="text-xs text-zinc-400 italic">—</span>`;
     }
     ...
   ```
2. In edit mode, add attributes to `<vocab-search-bar>`:
   ```typescript
   ?invalid="${hasError}"
   aria-invalid="${hasError ? 'true' : 'false'}"
   ```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/widgets/vocabserver.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add lib/widgets/vocabserver/component.ts test/widgets/vocabserver.test.ts
git commit -m "feat(vocabserver): forward invalid attributes and support view mode missing value indicator"
```

---

### Task 4: End-to-End Suite Verification & Visual Browser Check

**Files:**
- Verify: Full test suite across project
- Verify: Workbench browser behavior

- [x] **Step 1: Run full test suite**

Run: `npm test`
Expected: All test suites PASS (29+ suites, 166+ tests).

- [x] **Step 2: Run production bundle build**

Run: `npm run build`
Expected: Clean build with 0 TypeScript/bundler errors.

- [x] **Step 3: Run browser subagent verification**

Launch browser subagent to `http://localhost:5173/src/workbench.html`.
Verify that on initial load of Oceanographic Cruise:
- VocabServer fields (*Open Data License*, *Navigation CRS*, *MarineInfo Person*, *MarineInfo Institute*) visibly render the red container outline and inline violation alert.
- Capture screenshot as evidence.

- [x] **Step 4: Commit any documentation / final integration updates**

```bash
git add -A
git commit -m "chore: complete custom widget fault and missing value visualization"
```
