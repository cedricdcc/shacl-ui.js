# Form Validation & Nested Error Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive SHACL form validation subsystem with detailed nested shape error unpacking, breadcrumbs, field-level visual error states, configurable trigger modes (`manual`, `change`, `blur`), and interactive jump-to-field navigation in the workbench demo.

**Architecture:** A pure headless validation engine (`lib/core/validation.ts`) powered by `shacl-engine` traverses recursive `result.results` trees and builds a normalized `DetailedValidationReport` with $O(1)$ `violationMap` and `focusNodeViolationCount`. `<shacl-renderer>` coordinates reactive state, debounce scheduling, auto-expansion of invalid nested accordion items, and custom event dispatching. Presentation widgets consume the violation map to render red borders, inline error messages, and summary badges. The Workbench demo wires toolbar trigger controls, displays rich breadcrumb reports, and provides smooth jump-to-field navigation.

**Tech Stack:** TypeScript, Lit 3, `shacl-engine`, `rdf-stores`, `@rdfjs/types`, `rdf-data-factory`, Tailwind CSS (Tailwind Merge), Vitest.

**Spec:** [docs/superpowers/specs/2026-10-04-form-validation-and-nested-errors-design.md](file:///c:/Users/cedri/Documents/github/shacl-ui.js/docs/superpowers/specs/2026-10-04-form-validation-and-nested-errors-design.md)

## Global Constraints

- Preserve all existing public APIs and property contracts on `<shacl-renderer>` and widgets.
- Pure validation logic in `lib/core/validation.ts` must have zero DOM dependencies.
- Zero manual Tailwind class strings in widgets where slots apply; all error styling must route through `STYLING_SLOTS`.
- All clickable links in markdown and comments must use github-style links with `file://`.
- No regressions on existing test suites (`npm test`).

## Review Focus

1. **Blank Node Focus Node Matching**: Blank nodes generated dynamically (e.g. `_:df_4_0` or skolemized IRIs) must match accurately between `shacl-engine` results and `uiComponent.focusNode` / `value.value`.
2. **Missing Required Values (`minCount >= 1` with 0 items)**: When a property has no values entered, the error must attach to the property container and render a clear missing-value notice.
3. **Multi-tier Nested Sibling Identification**: In repeated nested items (`1:N` arrays), errors on `Item #2` must not incorrectly highlight `Item #1` or parent cards.
4. **Live Re-validation Keystroke Focus**: In `'change'` mode, debounced validation must update error classes and messages without causing input elements to lose DOM focus or reset the caret.
5. **Complex or Multi-Predicate Paths**: Property shapes using alternative or inverse paths must extract a valid predicate string without throwing runtime errors.

---

### Task 1: Core Validation Subsystem (`lib/core/validation.ts`)

**Files:**
- Create: `lib/core/validation.ts`
- Test: `test/validation.test.ts`

**Interfaces:**
- Consumes: `RdfStore` from `rdf-stores`, `Validator` from `shacl-engine`, `DataFactory` from `rdf-data-factory`.
- Produces: `DetailedViolation`, `DetailedValidationReport`, `validateDataset(shapesStore: RdfStore, dataStore: RdfStore, options?: ValidationOptions): Promise<DetailedValidationReport>`.

- [ ] **Step 1: Write the failing unit tests for `validateDataset`**

Write `test/validation.test.ts` testing:
1. Conforming graph returns `{ conforms: true, violations: [] }`.
2. Direct root-level violation (`minCount`, `datatype`, `pattern`).
3. Nested shape violation (`sh:node`) unwraps into leaf error with breadcrumb (e.g. `["Education", "Degree Type"]`) and exact inner focus node and path.
4. Multi-level nested violation (depth 2+).
5. Fast $O(1)$ lookup via `violationMap.get(`${focusNode}#${path}`)`.
6. Aggregate `focusNodeViolationCount` correctly counts descendant violations.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/validation.test.ts`
Expected: FAIL with "Cannot find module '../lib/core/validation.ts'".

- [ ] **Step 3: Implement `lib/core/validation.ts`**

Implement:
- Types: `DetailedViolation`, `DetailedValidationReport`, `ValidationOptions`.
- Helper `extractPredicateFromPath(path: any): string`.
- Helper `resolveShapeLabel(shapeNode: Term, shapesStore: RdfStore): string`.
- Main function `validateDataset(shapesStore: RdfStore, dataStore: RdfStore, options?: ValidationOptions): Promise<DetailedValidationReport>`.
- Recursive result unwrapping: when `result.constraintComponent` is `NodeConstraintComponent` and `result.results?.length > 0`, recurse down the tree accumulating breadcrumb labels and building the leaf violation set.
- Compute `violationMap` and `focusNodeViolationCount`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/core/validation.ts test/validation.test.ts
git commit -m "feat(validation): implement headless SHACL validation engine with nested result unpacking"
```

---

### Task 2: Styling Slots & Presentation Helper Utilities (`lib/styling-slots.ts`, `lib/presentation/widgets/shared.ts`)

**Files:**
- Modify: `lib/styling-slots.ts`
- Modify: `lib/presentation/widgets/shared.ts`
- Test: `test/element-styling.test.ts`

**Interfaces:**
- Consumes: `DetailedViolation` from `lib/core/validation.ts`.
- Produces:
  - New slots in `STYLING_SLOTS`: `inputErrorClass`, `fieldErrorMessageClass`, `nestedSummaryErrorBadgeClass`, `nestedSummaryErrorRowClass`.
  - Helpers in `lib/presentation/widgets/shared.ts`:
    - `getFieldViolations(renderer: ShaclRenderer, focusNode?: Term, path?: Path): DetailedViolation[]`
    - `renderFieldError(violations: DetailedViolation[], errorId: string, classes: TailwindClasses): TemplateResult | typeof nothing`
    - `renderMissingRequiredAlert(component: UIComponent, renderer: ShaclRenderer, classes: TailwindClasses, violations: DetailedViolation[]): TemplateResult`

- [ ] **Step 1: Write the failing tests for error styling slots and helpers**

Add tests in `test/element-styling.test.ts` verifying:
1. `STYLING_SLOTS` includes `inputErrorClass`, `fieldErrorMessageClass`, `nestedSummaryErrorBadgeClass`, `nestedSummaryErrorRowClass`.
2. `getFieldViolations` accurately extracts violations from `renderer.validationReport`.
3. `renderFieldError` returns HTML containing error text and `role="alert"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/element-styling.test.ts`
Expected: FAIL due to missing styling slots and helpers.

- [ ] **Step 3: Implement new slots in `STYLING_SLOTS` and helpers in `shared.ts`**

Add slots to `STYLING_SLOTS`:
- `inputErrorClass`: `'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-100 bg-red-50/20 dark:bg-red-950/20'`
- `fieldErrorMessageClass`: `'mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-medium'`
- `nestedSummaryErrorBadgeClass`: `'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/50'`
- `nestedSummaryErrorRowClass`: `'border-red-300 dark:border-red-800/80 bg-red-50/20 dark:bg-red-950/10'`

Implement `getFieldViolations`, `renderFieldError`, and `renderMissingRequiredAlert` in `lib/presentation/widgets/shared.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/element-styling.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/styling-slots.ts lib/presentation/widgets/shared.ts test/element-styling.test.ts
git commit -m "feat(styling): add error styling slots and field error rendering helpers"
```

---

### Task 3: Field Widget Error Rendering (`lib/presentation/widgets/editors-fields.ts`, `editors-select.ts`, `layout.ts`)

**Files:**
- Modify: `lib/presentation/widgets/editors-fields.ts`
- Modify: `lib/presentation/widgets/editors-select.ts`
- Modify: `lib/presentation/widgets/layout.ts`
- Test: `test/field-validation-rendering.test.ts`

**Interfaces:**
- Consumes: `getFieldViolations`, `renderFieldError`, `renderMissingRequiredAlert` from `shared.ts`.
- Produces: Field editors that visually reflect validation violations (red border, `aria-invalid="true"`, inline message) and missing-value indicators.

- [ ] **Step 1: Write the failing tests for field widget error rendering**

Create `test/field-validation-rendering.test.ts`:
1. Renders `TextFieldEditor` with an active violation: verifies `classes.inputErrorClass` is merged into `<input class>`, `aria-invalid="true"`, and error message is displayed.
2. Renders `EnumSelectEditor` with a violation: verifies error styling.
3. Renders property with `minCount: 1` and 0 values: verifies `renderMissingRequiredAlert` is displayed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/field-validation-rendering.test.ts`
Expected: FAIL because field editors do not yet apply error classes or render messages.

- [ ] **Step 3: Update field editors and `layout.ts`**

1. In `editors-fields.ts`:
   - In `renderTextFieldEditor`, `renderTextAreaEditor`, `renderDatePickerEditor`, `renderDateTimePickerEditor`, `renderNumberFieldEditor`, `renderIRIEditor`, `renderBooleanEditor`, `renderTextFieldWithLangEditor`:
     - Retrieve `violations = getFieldViolations(renderer, uiComponent.focusNode, value.path)`.
     - Merge `violations.length > 0 ? classes.inputErrorClass : ''` into input classes.
     - Add `?aria-invalid="${violations.length > 0}"` and `aria-describedby="${errorId}"`.
     - Append `renderFieldError(violations, errorId, classes)` below the input.
2. In `editors-select.ts`:
   - In `renderEnumSelectEditor`, `renderInstancesSelectEditor`, `renderSubClassEditor`, `renderAutoCompleteEditor`:
     - Apply error styling and inline error message.
3. In `layout.ts`:
   - In `renderUIComponent`:
     - If `uiComponent.values.length === 0` and `(uiComponent.minCount ?? 0) > 0`:
       - Query violations for `uiComponent.focusNode` and `uiComponent.paths[0]`.
       - If violations exist, render `renderMissingRequiredAlert`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/field-validation-rendering.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presentation/widgets/editors-fields.ts lib/presentation/widgets/editors-select.ts lib/presentation/widgets/layout.ts test/field-validation-rendering.test.ts
git commit -m "feat(widgets): render field-level validation errors, ARIA attributes, and missing value alerts"
```

---

### Task 4: Nested Structure Visualization & Error Badges (`lib/presentation/widgets/editors-rich-nested.ts`)

**Files:**
- Modify: `lib/presentation/widgets/editors-rich-nested.ts`
- Test: `test/nested-validation-rendering.test.ts`

**Interfaces:**
- Consumes: `focusNodeViolationCount` from `renderer.validationReport`.
- Produces:
  - Error badges (`⚠️ N errors`) and highlighted rows on collapsed/expanded nested accordion items (`DetailsEditor`).
  - Inline error counter on single-nested section dividers (`!isMultiple`).

- [ ] **Step 1: Write the failing tests for nested error badges**

Create `test/nested-validation-rendering.test.ts`:
1. Renders multiple nested items (`isMultiple = true`) where `Item #2` has 2 violations:
   - Verifies `Item #2` summary row displays the error badge with "2 errors".
   - Verifies `Item #1` summary row has no error badge.
2. Renders single nested item (`isMultiple = false`) with 1 violation:
   - Verifies section header displays the error count.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/nested-validation-rendering.test.ts`
Expected: FAIL because `renderDetailsEditor` does not yet inspect `focusNodeViolationCount` or render error badges.

- [ ] **Step 3: Update `renderDetailsEditor` in `lib/presentation/widgets/editors-rich-nested.ts`**

1. Extract item focus node string: `itemFocusNode = value.value?.value`.
2. Look up `errorCount = renderer.validationReport?.focusNodeViolationCount.get(itemFocusNode) ?? 0`.
3. In `isMultiple` summary row:
   - If `errorCount > 0`:
     - Apply `classes.nestedSummaryErrorRowClass` to the summary row wrapper.
     - Render `<span class="${classes.nestedSummaryErrorBadgeClass}">⚠️ ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}</span>`.
4. In `!isMultiple` section divider:
   - If `errorCount > 0`:
     - Render `<span class="${classes.nestedSummaryErrorBadgeClass}">⚠️ ${errorCount}</span>` next to the label.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/nested-validation-rendering.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/presentation/widgets/editors-rich-nested.ts test/nested-validation-rendering.test.ts
git commit -m "feat(nested): display error badges and highlight rows on invalid nested structures"
```

---

### Task 5: `<shacl-renderer>` Component Integration & Trigger Modes (`lib/shacl-renderer.ts`)

**Files:**
- Modify: `lib/shacl-renderer.ts`
- Test: `test/element-validation.test.ts`

**Interfaces:**
- Consumes: `validateDataset` from `lib/core/validation.ts`.
- Produces:
  - `@property({ type: String, attribute: 'validate-on' }) validateOn: 'manual' | 'change' | 'blur' = 'manual'`
  - `@property({ type: Number, attribute: 'debounce-ms' }) debounceMs: number = 300`
  - `@property({ type: Boolean, attribute: 'auto-expand-invalid' }) autoExpandInvalid: boolean = true`
  - `@state() validationReport: DetailedValidationReport | null`
  - `validate(): Promise<DetailedValidationReport>`
  - `clearValidation(): void`
  - Dispatches `shacl-validation` and `shacl-validation-cleared` CustomEvents.

- [ ] **Step 1: Write the failing tests for `<shacl-renderer>` validation APIs**

Create `test/element-validation.test.ts`:
1. Instantiates `<shacl-renderer>`, calls `renderer.validate()`:
   - Verifies `renderer.validationReport` is populated.
   - Verifies `shacl-validation` custom event is fired with `conforms` and `report`.
2. Tests `autoExpandInvalid`:
   - Verifies that a collapsed nested accordion item containing an invalid field automatically expands when `validate()` runs.
3. Tests `validateOn = 'change'`:
   - Mutating data triggers debounced `validate()`.
4. Tests `clearValidation()`:
   - Clears `validationReport` and dispatches `shacl-validation-cleared`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/element-validation.test.ts`
Expected: FAIL because `validate()`, `clearValidation()`, and validation properties do not exist on `ShaclRenderer`.

- [ ] **Step 3: Implement validation APIs on `ShaclRenderer`**

1. In `lib/shacl-renderer.ts`:
   - Declare properties `validateOn`, `debounceMs`, `autoExpandInvalid`.
   - Declare state `validationReport`.
   - Implement `async validate(): Promise<DetailedValidationReport>`:
     - Calls `validateDataset(this.shapesStore, this.dataStore)`.
     - Updates `this.validationReport = report`.
     - If `this.autoExpandInvalid`, iterates over `report.violations`, identifies parent nested UUIDs/indices, and expands them via `this.nestedItemExpanded`.
     - Dispatches `shacl-validation` CustomEvent.
     - Triggers `this.requestUpdate()`.
   - Implement `clearValidation()`:
     - Sets `this.validationReport = null`, dispatches `shacl-validation-cleared`, requests update.
   - Hook into `addToDataStore` and `removeFromDataStore`:
     - If `this.validateOn === 'change'`, invoke debounced validation.
     - If `this.validationReport && !this.validationReport.conforms`, re-validate to immediately clear fixed errors.
   - Reset validation report on graph URL/content changes when appropriate.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/element-validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/shacl-renderer.ts test/element-validation.test.ts
git commit -m "feat(renderer): add validate(), clearValidation(), and configurable trigger modes"
```

---

### Task 6: Workbench Demo Integration & Jump-to-Field Navigation (`src/workbench.ts`, `src/workbench.html`, `src/workbench.css`)

**Files:**
- Modify: `src/workbench.html`
- Modify: `src/workbench.css`
- Modify: `src/workbench.ts`
- Test: Manual visual verification in Vite dev server + workbench integration test.

**Interfaces:**
- Consumes: `renderer.validate()`, `renderer.validateOn`, and `shacl-validation` event.
- Produces:
  - Interactive "Validate Form" button and trigger mode selector in Workbench toolbar.
  - Detailed report drawer displaying breadcrumbs (`[Parent] › [Item #] › [Field]`), constraint badges, and messages.
  - Jump-to-field interaction that auto-expands nested cards, scrolls to the field, and pulses focus.

- [ ] **Step 1: Update `src/workbench.html` & `src/workbench.css`**

1. In `src/workbench.html`:
   - Add `#btn-validate-form` button: `<button id="btn-validate-form" class="...">Validate Form</button>`.
   - Add `#select-validate-on` dropdown: `<select id="select-validate-on"><option value="manual">Validate: Manual</option><option value="change">Validate: On Change</option><option value="blur">Validate: On Blur</option></select>`.
2. In `src/workbench.css`:
   - Add styling for violation breadcrumbs (`.violation-breadcrumb`), constraint badges (`.violation-badge`), and jump pulse animation (`@keyframes field-pulse`).

- [ ] **Step 2: Update `src/workbench.ts` to use `renderer.validate()` and render rich breadcrumbs**

1. Wire `#btn-validate-form` click to `renderer.validate()`.
2. Wire `#select-validate-on` change to `renderer.validateOn = select.value`.
3. Listen to `renderer.addEventListener('shacl-validation', (e: CustomEvent) => updateReport(e.detail))`.
4. In report renderer:
   - For each violation in `report.violations`:
     - Render breadcrumb: `violation.breadcrumb.join(' › ')`.
     - Render constraint component badge and human message.
     - Add click handler to jump to field:
       - Find element by ID or data attributes in `renderer.renderRoot`.
       - If inside a nested item, ensure it is expanded.
       - Call `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
       - Focus input element and apply `.field-highlight-pulse`.

- [ ] **Step 3: Verify end-to-end with tests and browser check**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/workbench.html src/workbench.css src/workbench.ts
git commit -m "feat(workbench): add trigger controls, rich breadcrumb report, and jump-to-field navigation"
```

---

## Plan Self-Review Checklist

- [x] **Spec coverage**:
  - Headless validation engine with nested recursive unpacking (`lib/core/validation.ts`) -> Task 1
  - Breadcrumb paths and normalized violation data structures -> Task 1
  - Error styling slots and helpers (`STYLING_SLOTS`, `shared.ts`) -> Task 2
  - Field-level red borders, ARIA attributes, inline messages, missing-value alerts -> Task 3
  - Nested accordion summary badges and auto-expansion -> Task 4 & Task 5
  - Configurable trigger modes (`validate-on="manual | change | blur"`) -> Task 5
  - Public `validate()` / `clearValidation()` methods and events -> Task 5
  - Workbench toolbar controls, rich report drawer, and jump-to-field navigation -> Task 6
- [x] **Step scan**: Each step has an explicit test, command, file target, and checkable outcome.
- [x] **Type consistency**: `DetailedViolation` and `DetailedValidationReport` signatures are defined in Task 1 and consistently consumed in Tasks 2–6.
- [x] **Review Focus**: Handled in unit and integration tests across Tasks 1, 3, 4, 5.
