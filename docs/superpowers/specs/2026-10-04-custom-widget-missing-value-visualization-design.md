# Custom Widget Missing Value and Fault Visualization Design Spec

## Overview
In `shacl-ui.js`, custom widgets (such as the reference `VocabServer` widget or arbitrary third-party web components) encapsulate their markup, often inside Shadow DOM or third-party frameworks. Because the core library cannot inspect or style internal `<input>` elements within encapsulated widgets, missing required values and SHACL validation errors were previously not visualised on custom widgets.

This specification defines a universal, two-tier solution:
1. **Tier 1 (Universal Outer Shell & Inline Alert)**: The framework takes full ownership of the custom widget container boundaries in [`lib/presentation/widgets/layout.ts`](file:///c:/Users/cedri/Documents/github/shacl-ui.js/lib/presentation/widgets/layout.ts). When violations exist for the property path, the framework wraps the widget in an error container with red ring styling and renders the standard SHACL inline violation alert (`role="alert"`) underneath. This guarantees 100% out-of-the-box fault and missing-value visibility for any black-box widget.
2. **Tier 2 (Enriched Context Contract)**: The framework enriches [`CustomWidgetRenderContext`](file:///c:/Users/cedri/Documents/github/shacl-ui.js/lib/types.ts) with `violations`, `hasError`, and `isEmpty`. Cooperative widgets (such as `VocabServer`) use these properties to set standard accessibility attributes (`aria-invalid="true"`, `?invalid`) on their custom elements.

---

## 1. Data Contracts & Types

### 1.1 `CustomWidgetRenderContext` Updates
In [`lib/types.ts`](file:///c:/Users/cedri/Documents/github/shacl-ui.js/lib/types.ts):

```typescript
export interface CustomWidgetRenderContext {
   renderer: ShaclRenderer;
   uiComponent: UIComponent;
   value: UIComponentValue;
   index: number;
   classes: TailwindClasses;
   disabled: boolean;
   mode: 'edit' | 'view';
   annotations: Record<string, string>;
   onValueChange: (newTerm: Term | null) => void;

   // ── Validation & Fault Properties ──
   /** Active SHACL violations matching this specific value / property path */
   violations: DetailedViolation[];
   /** Convenience flag indicating whether any violations exist on this field */
   hasError: boolean;
   /** Indicates if the current value is empty/unselected (null, undefined, or empty string) */
   isEmpty: boolean;
}
```

### 1.2 Styling Slots Updates
In [`lib/styling-slots.ts`](file:///c:/Users/cedri/Documents/github/shacl-ui.js/lib/styling-slots.ts):

Add a new styling slot:
- Slot Name: `customWidgetErrorClass`
- Default Value: `'ring-1 ring-red-500/80 dark:ring-red-500/80 rounded-md p-0.5 transition-shadow'`
- Purpose: Applied to the outer wrapper container around any custom widget that has active SHACL violations or missing required values.

---

## 2. Layout & Framework Wrapper Architecture

### 2.1 `renderEditor()` in `lib/presentation/widgets/layout.ts`
When dispatching to a custom widget in `renderEditor()`:
1. Query violations for the current focus node and path via `getFieldViolations(renderer, uiComponent.focusNode, value.path)`.
2. Compute `hasError = violations.length > 0`.
3. Compute `isEmpty = !value.value?.value || value.value.value.trim() === ''`.
4. Pass `violations`, `hasError`, and `isEmpty` into `CustomWidgetRenderContext`.
5. Execute `customWidget.render(context)` or `renderCustomWidgetMount(customWidget, context)`.
6. Return a wrapped container:
   - Outer wrapper: `<div class="custom-widget-field w-full relative">`
   - Child wrapper with error ring: `<div class="${hasError ? twMerge('rounded-md ring-1 ring-red-500/80 dark:ring-red-500/80 p-0.5 transition-shadow', classes.customWidgetErrorClass) : ''}">`
   - Standard inline violation alert below: `${hasError ? renderFieldError(violations, classes) : nothing}`.

This ensures that whether a custom widget is an unmodifiable Web Component, a React/Vue tree mounted in a div, or a canvas, the user immediately sees:
- The red highlight container around the widget.
- The exact SHACL reason (e.g., *"Value does not have nodeKind <http://www.w3.org/ns/shacl#IRI>"* or *"Missing required value"*).

---

## 3. Reference Custom Widget Integration: `VocabServer`

### 3.1 Edit Mode Updates
In [`lib/widgets/vocabserver/component.ts`](file:///c:/Users/cedri/Documents/github/shacl-ui.js/lib/widgets/vocabserver/component.ts):
- Forward `?invalid="${hasError}"` and `aria-invalid="${hasError ? 'true' : 'false'}"` to `<vocab-search-bar>`.
- Maintain clean value deletion: clearing selections invokes `onValueChange(null)`, clearing the triple in `dataStore` and allowing SHACL's `sh:minCount` constraint to trigger live validation.

### 3.2 View Mode Updates
In view mode:
- If `!currentVal` and `hasError`: render `<span class="text-xs text-red-500 dark:text-red-400 italic">Missing required value</span>`.
- If `!currentVal` and `!hasError`: render `<span class="text-xs text-zinc-400 italic">—</span>`.

---

## 4. Testing & Verification

1. **Unit Testing (`test/widgets/vocabserver.test.ts`)**:
   - Verify `VocabServerWidgetDefinition.render` passes `?invalid` and `aria-invalid="true"` when `hasError: true`.
   - Verify view mode displays `"Missing required value"` when invalid and empty.
2. **Integration Testing (`test/custom-widget-validation.test.ts`)**:
   - Test a custom widget rendered in `<shacl-renderer>` against a shape with `sh:minCount 1`.
   - Verify the error wrapper and `role="alert"` element are present when unselected.
   - Verify that calling `onValueChange` with a valid IRI removes the error wrapper and alert.
3. **Regression Testing**:
   - Run the complete test suite (`npm test`, all 163+ tests).
   - Run `npm run build` to verify clean compilation.
4. **Browser Subagent Visual Verification**:
   - Load `http://localhost:5173/src/workbench.html`.
   - Verify that VocabServer fields (*Open Data License*, *Navigation CRS*, *MarineInfo Person*, *MarineInfo Institute*) visibly render red error outlines and inline error alerts out of the box on default load.
