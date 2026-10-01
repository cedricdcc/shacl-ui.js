# Extensible Custom Widget System & VocabServer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a first-class custom widget registration architecture in `shacl-ui.js`, integrate the official VLIZ VocabServer Web Component as the reference implementation, and deliver an interactive 3-panel workbench demo.

**Architecture:** A centralized `CustomWidgetRegistry` stores widget definitions providing either a native Lit `render()` template or a DOM `mount()` adapter. `<shacl-renderer>` dispatches to registered widgets in `layout.ts` and merges custom widget scoring rules into its scoring graph. The VocabServer widget wraps `<vocab-search-bar>` from `https://vocab.vliz.be/webcomponent/main.js` and binds to live endpoints. A new interactive 3-panel workbench (`src/workbench.html`) provides real-time shape editing, form rendering, and live Turtle output with validation.

**Tech Stack:** TypeScript, Lit 3, RDF/JS (`@rdfjs/types`, `rdf-data-factory`, `rdf-stores`), `@codemirror` (v6), `shacl-engine`, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-01-vocabserver-widget-integration-design.md`

## Global Constraints
- Must preserve backwards compatibility with all existing built-in SHACL-UI widgets.
- Must not use DOM scraping or MutationObserver hacks inside `shacl-ui.js` core.
- Must support both `http://example.com/ns#VocabServerEditor` and `http://example.org/VocabServerEditor` IRIs.
- All unit and integration tests must run and pass via `npm run test` (Vitest).

## Review Focus
- Unregistered custom widget IRIs must cleanly fall back to the existing unsupported widget label without throwing runtime exceptions.
- Custom widget `onValueChange(newTerm)` must correctly update `renderer.dataStore` (removing previous term and adding new term) and update `value.value`.
- Dynamic CDN loading of `https://vocab.vliz.be/webcomponent/main.js` must be idempotent and must not duplicate script tags if `<vocab-search-bar>` is already registered.
- Custom shape annotations (`ex:searchEndpoint`, `ex:sourceVocabularies`, etc.) must be extracted regardless of whether the predicate is a full URI or prefixed form.
- The 3-panel workbench demo must cleanly serialize and highlight valid Turtle RDF upon form interaction and validate via `shacl-engine`.

---

### Task 1: TypeScript Contracts for Custom Widgets

**Files:**
- Modify: `lib/types.ts`
- Test: `test/widgets/registry.test.ts`

**Interfaces:**
- Consumes: `UIComponent`, `UIComponentValue`, `TailwindClasses` from `lib/types.ts`, `ShaclRenderer` from `lib/shacl-renderer.ts`.
- Produces: `CustomWidgetRenderContext`, `CustomWidgetMountContext`, `CustomWidgetInstance`, `CustomWidgetDefinition`.

- [ ] **Step 1: Write the failing type contract test**
Create `test/widgets/registry.test.ts` importing `CustomWidgetDefinition` and checking its structure.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- test/widgets/registry.test.ts`
Expected: FAIL (types not exported).

- [ ] **Step 3: Define Custom Widget Interfaces in `lib/types.ts`**
Add `CustomWidgetRenderContext`, `CustomWidgetMountContext`, `CustomWidgetInstance`, and `CustomWidgetDefinition` to `lib/types.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- test/widgets/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/types.ts test/widgets/registry.test.ts
git commit -m "feat(widgets): add custom widget TypeScript interfaces"
```

---

### Task 2: Custom Widget Registry Implementation

**Files:**
- Create: `lib/presentation/widgets/registry.ts`
- Modify: `lib/presentation/widgets.ts`
- Modify: `lib/shacl-renderer.ts`
- Test: `test/widgets/registry.test.ts`

**Interfaces:**
- Consumes: `CustomWidgetDefinition` from `lib/types.ts`.
- Produces: `registerCustomWidget`, `unregisterCustomWidget`, `getCustomWidget`, `hasCustomWidget`, `getAllCustomWidgets`, `getCustomScoringTtls`, `clearCustomWidgets`.

- [ ] **Step 1: Write the failing registry unit tests in `test/widgets/registry.test.ts`**
Add tests verifying:
  - Registering and retrieving a widget by IRI.
  - Overwriting an existing registration.
  - Unregistering a widget.
  - Aggregating non-empty `defaultScoringTtl` strings via `getCustomScoringTtls()`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- test/widgets/registry.test.ts`
Expected: FAIL (`registerCustomWidget` not found).

- [ ] **Step 3: Implement `CustomWidgetRegistry` in `lib/presentation/widgets/registry.ts`**
Implement the global registry map and exported functions. Re-export in `lib/presentation/widgets.ts` and `lib/shacl-renderer.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- test/widgets/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/presentation/widgets/registry.ts lib/presentation/widgets.ts lib/shacl-renderer.ts test/widgets/registry.test.ts
git commit -m "feat(widgets): implement CustomWidgetRegistry"
```

---

### Task 3: Native Widget Dispatch & Annotation Extraction in Layout Layer

**Files:**
- Modify: `lib/presentation/widgets/layout.ts`
- Create: `test/widgets/dispatch.test.ts`

**Interfaces:**
- Consumes: `hasCustomWidget`, `getCustomWidget` from `lib/presentation/widgets/registry.ts`.
- Produces: Native rendering of registered custom widgets in `renderEditor` and `renderViewer`, annotation extraction from `renderer.shapesStore`.

- [ ] **Step 1: Write failing dispatch tests in `test/widgets/dispatch.test.ts`**
Add tests verifying:
  - When `value.selectedWidget` matches a registered custom widget with `render()`, `renderEditor` calls `customWidget.render()` with correct context.
  - Value updates via `onValueChange` invoke `renderer.removeFromDataStore` and `renderer.addToDataStore`.
  - When `value.selectedWidget` is unregistered, it falls back to `<label>...Unsupported widget...`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- test/widgets/dispatch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement dispatch and annotation extraction in `lib/presentation/widgets/layout.ts`**
Add `extractShapeAnnotations(shapeNode, shapesStore)` helper.
In `renderEditor`, dispatch to `getCustomWidget(value.selectedWidget)` before the default unsupported widget case. Wire `onValueChange` to data store updates and `renderer.rerender()`.
Support both `customWidget.render(context)` and `customWidget.mount(context)`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- test/widgets/dispatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/presentation/widgets/layout.ts test/widgets/dispatch.test.ts
git commit -m "feat(widgets): support native custom widget dispatch in layout layer"
```

---

### Task 4: Dynamic Custom Widget Scoring Rules Integration

**Files:**
- Modify: `lib/shacl-renderer.ts`
- Test: `test/widgets/scoring-integration.test.ts`

**Interfaces:**
- Consumes: `getCustomScoringTtls` from `lib/presentation/widgets/registry.ts`.
- Produces: Automatic inclusion of registered custom widget scoring rules when building the scoring dataset in `<shacl-renderer>`.

- [ ] **Step 1: Write failing test in `test/widgets/scoring-integration.test.ts`**
Register a custom widget with `defaultScoringTtl`.
Initialize `<shacl-renderer>` and verify that the scoring store parses and scores the custom widget rule.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- test/widgets/scoring-integration.test.ts`
Expected: FAIL.

- [ ] **Step 3: Augment scoring graph loading in `lib/shacl-renderer.ts`**
When `loadWidgetScoringGraph` runs, retrieve `getCustomScoringTtls()`, parse any custom TTL snippets into RDF quads, and add them to `this.scoringStore`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- test/widgets/scoring-integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/shacl-renderer.ts test/widgets/scoring-integration.test.ts
git commit -m "feat(scoring): automatically merge custom widget scoring rules into scoring store"
```

---

### Task 5: VocabServer Reference Widget Implementation

**Files:**
- Create: `lib/widgets/vocabserver/scoring.ttl`
- Create: `lib/widgets/vocabserver/component.ts`
- Create: `lib/widgets/vocabserver/index.ts`
- Modify: `lib/shacl-renderer.ts` (export VocabServer module / registration)
- Test: `test/widgets/vocabserver.test.ts`

**Interfaces:**
- Consumes: `CustomWidgetDefinition`, `CustomWidgetRenderContext` from `lib/types.ts`, `registerCustomWidget` from `lib/presentation/widgets/registry.ts`.
- Produces: `registerVocabServerWidget()`, `VocabServerWidgetDefinition`, `VOCABSERVER_WIDGET_IRI`, `VOCABSERVER_WIDGET_IRI_ORG`.

- [ ] **Step 1: Write failing unit tests in `test/widgets/vocabserver.test.ts`**
Add tests verifying:
  - Configuration extraction from property shapes (`searchEndpoint`, `sourceVocabularies`, `sourceDatasets`, `singleSelect`, `languagesString`).
  - Rendering in view mode (hyperlink badge with term URI).
  - Rendering in edit mode (`<vocab-search-bar>` custom element with attributes and `@selection-changed` listener).
  - Quad emission upon `@selection-changed`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- test/widgets/vocabserver.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement VocabServer Widget**
Create `lib/widgets/vocabserver/scoring.ttl` with scoring rules for both `http://example.com/ns#VocabServerEditor` and `http://example.org/VocabServerEditor`.
Create `lib/widgets/vocabserver/component.ts` implementing `parseVocabServerConfig`, `ensureVocabSearchBarLoaded()`, edit mode Lit template, and view mode template.
Create `lib/widgets/vocabserver/index.ts` with `registerVocabServerWidget()`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- test/widgets/vocabserver.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/widgets/vocabserver/ test/widgets/vocabserver.test.ts lib/shacl-renderer.ts
git commit -m "feat(vocabserver): add VocabServer reference custom widget"
```

---

### Task 6: 3-Panel Interactive Workbench Demo

**Files:**
- Create: `src/workbench.html`
- Create: `src/workbench.ts`
- Modify: `src/index.html` (add navigation link to workbench)
- Create: `public/assets/marine-observation.ttl` (or shapes preset)
- Test: Manual browser test & Vite build test

**Interfaces:**
- Consumes: `<shacl-renderer>`, `registerVocabServerWidget()`, `@codemirror/view`, `@codemirror/state`, `shacl-engine`.
- Produces: Interactive 3-panel workbench environment at `http://localhost:5173/workbench.html`.

- [ ] **Step 1: Create Marine Observation preset shape in `public/assets/marine-observation.ttl`**
Define a real oceanographic observation shape using `ex:VocabServerEditor` and `ex:searchEndpoint "https://vocab.vliz.be"`, `ex:sourceVocabularies "https://my-application.com/vocabulary-alias/vliz-dams-crs"`.

- [ ] **Step 2: Create `src/workbench.html`**
Build a 3-panel split layout:
  - Panel 1: CodeMirror editor with Turtle highlighting, presets dropdown, "Generate Form" button (`Ctrl+Enter`).
  - Panel 2: `<shacl-renderer>` live form host with Dark/Light and Edit/View controls.
  - Panel 3: Real-time Turtle syntax-highlighted output with Copy, Download, and SHACL validation status.

- [ ] **Step 3: Create `src/workbench.ts`**
Initialize CodeMirror editor with Turtle syntax, preset switching, `<shacl-renderer>` lifecycle, live Turtle serialization upon data change, and live `shacl-engine` validation. Call `registerVocabServerWidget()`.

- [ ] **Step 4: Verify Vite build and dev server**
Run: `npm run build`
Ensure TypeScript compiles cleanly and bundle builds without errors.

- [ ] **Step 5: Commit**
```bash
git add src/workbench.html src/workbench.ts public/assets/marine-observation.ttl src/index.html
git commit -m "feat(demo): add interactive 3-panel workbench with VocabServer demo"
```

---

### Task 7: Full Verification & Documentation

**Files:**
- Modify: `README.md`
- Run: `npm run test`
- Run: `npm run build`

- [ ] **Step 1: Update `README.md`**
Add a dedicated "Custom Widgets & VocabServer Integration" section documenting `registerCustomWidget`, `CustomWidgetDefinition`, and the VocabServer widget with a screenshot or link to the workbench demo.

- [ ] **Step 2: Run all unit and integration tests**
Run: `npm run test`
Expected: All tests PASS.

- [ ] **Step 3: Browser Subagent Verification**
Launch browser subagent to visit `http://localhost:5173/workbench.html`, select the Marine Observation preset, verify `<vocab-search-bar>` renders, perform a search, select a term, and verify the Turtle output panel updates with the selected IRI quad.

- [ ] **Step 4: Commit**
```bash
git add README.md
git commit -m "docs: document custom widget registration and VocabServer integration"
```
