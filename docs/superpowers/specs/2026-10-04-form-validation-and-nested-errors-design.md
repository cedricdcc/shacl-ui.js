# Design Specification: SHACL Form Validation & Nested Error Visualization

## 1. Overview & Problem Statement

In `shacl-ui.js`, form validation and error reporting currently suffer from several critical limitations:

1. **Lack of In-Form Error Visualization**:
   - Validation occurs only externally in `src/workbench.ts` as a separate script.
   - Form fields and components inside `<shacl-renderer>` have no visual error indicators (no red borders, no inline error messages, and no accessibility attributes like `aria-invalid`).

2. **Opaque Nested Shape Validation**:
   - When a nested shape (via `sh:node`) contains violations (e.g. an education entry missing a degree type or date), standard top-level validation reports only a generic `sh:NodeConstraintComponent` error: `"Value does not have shape <...>"`.
   - The user receives no indication of which nested property failed, which child instance has the error, or what constraint was violated.
   - In collapsed accordion structures (`DetailsEditor`), errors inside collapsed cards are completely invisible to the user.

3. **Missing Trigger & Configuration Controls**:
   - Validation cannot be triggered programmatically or configured on `<shacl-renderer>`.
   - Users cannot configure whether validation runs manually, on field blur, or live on value changes.

This specification defines a comprehensive validation architecture that:
- Embeds a headless SHACL validation engine (`lib/core/validation.ts`) powered by `shacl-engine`.
- Unpacks recursive validation trees down multi-tier nested shapes into human-readable breadcrumbs and leaf violations.
- Adds declarative trigger modes (`validate-on="manual | change | blur"`) and programmatic methods (`validate()`, `clearValidation()`) to `<shacl-renderer>`.
- Displays visual error states, missing-value placeholders, and nested accordion badges.
- Provides interactive jump-to-field navigation from the validation report drawer.

---

## 2. Architecture & Data Structures

### 2.1 Core Validation Types (`lib/core/validation.ts`)

```typescript
export interface DetailedViolation {
  /** Unique identifier for DOM keys and jump-to-field targeting */
  id: string;
  /** Focus node IRI or BlankNode identifier (e.g. "http://example.org/Alice" or "_:b1") */
  focusNode: string;
  /** Predicate path IRI (e.g. "http://example.org/city") */
  path: string;
  /** Human-readable field name or path local name (e.g. "City") */
  pathName: string;
  /** SHACL constraint component name (e.g. "MinCountConstraintComponent", "PatternConstraintComponent") */
  constraintComponent: string;
  /** Severity level: Violation, Warning, or Info */
  severity: 'Violation' | 'Warning' | 'Info';
  /** Human-readable explanation of the validation failure */
  message: string;
  /** Source shape identifier (IRI or BlankNode) */
  sourceShape?: string;
  /** Breadcrumb hierarchy for nested fields (e.g. ["Education", "Item #1", "Degree Type"]) */
  breadcrumb: string[];
  /** Parent focus node if nested */
  parentFocusNode?: string;
}

export interface DetailedValidationReport {
  /** True if all shapes and constraints conform with zero violations */
  conforms: boolean;
  /** Flat list of all leaf violations with full breadcrumbs and details */
  violations: DetailedViolation[];
  /** O(1) lookup map keyed by `${focusNode}#${path}` */
  violationMap: Map<string, DetailedViolation[]>;
  /** Total count of violations belonging to a focus node and all its descendants */
  focusNodeViolationCount: Map<string, number>;
}
```

### 2.2 Recursive Traversal & Nested Normalization

`shacl-engine`'s `Validator` internally records nested child violations in `result.results` when evaluating `sh:node` (`sh:NodeConstraintComponent`).

The normalization algorithm in `validateDataset(shapesStore: RdfStore, dataStore: RdfStore, ...)` executes:
1. `validator.validate({ dataset: dataStore.asDataset() })`.
2. Inspects each `Result` in `report.results`:
   - If `result.constraintComponent` is `sh:NodeConstraintComponent` and contains non-empty `result.results`:
     - Recurses into `result.results`, appending the parent shape's label or item index to the breadcrumb trail.
     - Resolves the child focus node (BlankNode or NamedNode) and target property path from the inner result.
   - If it is a leaf violation (e.g. `MinCountConstraintComponent`, `PatternConstraintComponent`, `DatatypeConstraintComponent`, `MaxInclusiveConstraintComponent`):
     - Extracts the predicate IRI from `result.path` (extracting predicate term from `quantifier`/`predicates` array or direct term).
     - Resolves human-readable labels from `sh:name` or IRI fragments.
     - Formats clean, friendly error messages (e.g., `"City is required (at least 1 value)"`, `"Must match pattern ^CRUISE-[0-9]{4}-[A-Z0-9]+$"`).
     - Populates `violations`, `violationMap`, and increments `focusNodeViolationCount` for the current focus node and all its ancestor focus nodes up the tree.

---

## 3. `<shacl-renderer>` Component Integration

### 3.1 Properties & Attributes

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `validateOn` | `validate-on` | `'manual' \| 'change' \| 'blur'` | `'manual'` | Trigger strategy for form validation. |
| `debounceMs` | `debounce-ms` | `number` | `300` | Delay in ms for debouncing in `'change'` mode. |
| `autoExpandInvalid` | `auto-expand-invalid` | `boolean` | `true` | Automatically expand collapsed nested cards containing errors when validation runs. |

### 3.2 Reactive State & Methods

```typescript
@state()
validationReport: DetailedValidationReport | null = null;

/**
 * Runs SHACL validation against the active dataStore and shapesStore.
 * Auto-expands invalid nested accordion items if autoExpandInvalid is true.
 * Dispatches 'shacl-validation' CustomEvent.
 */
async validate(): Promise<DetailedValidationReport>;

/**
 * Clears current validation report and resets field error states.
 * Dispatches 'shacl-validation-cleared' CustomEvent.
 */
clearValidation(): void;
```

### 3.3 Custom Events

1. **`shacl-validation`**:
   - `detail`: `{ conforms: boolean, report: DetailedValidationReport, violations: DetailedViolation[] }`
   - Bubbles: `true`, Composed: `true`.
2. **`shacl-validation-cleared`**:
   - `detail`: `{}`
   - Bubbles: `true`, Composed: `true`.

### 3.4 Auto-Trigger Orchestration

- **`'change'` Mode**: Every addition, removal, or update in `addToDataStore` / `removeFromDataStore` schedules a debounced execution of `this.validate()`. If errors are already displayed, correcting a field immediately updates and removes resolved error notices.
- **`'blur'` Mode**: Focus-out events on input elements trigger validation for the blurred field.
- **`'manual'` Mode**: Validation only runs upon calling `renderer.validate()`. The displayed errors remain until modified or explicitly cleared.

---

## 4. UI Presentation & Component Visualization

### 4.1 Styling Slots (`lib/styling-slots.ts`)

Four new styling slots are added to the single source of truth:

```typescript
export const STYLING_SLOTS = {
  // ... existing slots ...
  inputErrorClass: 'border-red-500 dark:border-red-500 focus:border-red-500 focus:ring-red-500/20 text-red-900 dark:text-red-100 bg-red-50/20 dark:bg-red-950/20',
  fieldErrorMessageClass: 'mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-medium',
  nestedSummaryErrorBadgeClass: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/50',
  nestedSummaryErrorRowClass: 'border-red-300 dark:border-red-800/80 bg-red-50/20 dark:bg-red-950/10',
};
```

### 4.2 Field-Level Presentation (`editors-fields.ts`, `editors-select.ts`, `layout.ts`)

- **Field Resolution**: During widget rendering, the field queries `renderer.validationReport?.violationMap.get(`${uiComponent.focusNode?.value}#${path.path}`)`.
- **Input Elements**:
  - Class merge: `twMerge(defaultFieldClasses, violations.length > 0 ? classes.inputErrorClass : '')`.
  - ARIA attributes: `?aria-invalid="${violations.length > 0}"`, `aria-describedby="${violations.length > 0 ? errorElementId : nothing}"`.
- **Inline Error Alert**:
  - Rendered directly underneath the input element:
    ```html
    <div class="${classes.fieldErrorMessageClass}" id="${errorElementId}" role="alert">
      <svg class="size-3.5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      <span>${violations.map(v => v.message).join(' · ')}</span>
    </div>
    ```
- **Missing Required Values (`minCount >= 1` with 0 items)**:
  - If a required property has no values entered, an inline alert box appears below the label:
    `"Missing required value (at least 1 required)"` with an attached `+ Add value` button.

### 4.3 Nested Structure Presentation (`editors-rich-nested.ts`)

- **Accordion Summary Row (1:N Repeated Items)**:
  - Queries `renderer.validationReport?.focusNodeViolationCount.get(itemFocusNode)`.
  - When `count > 0`:
    - Summary row displays a red badge: `⚠️ ${count} ${count === 1 ? 'error' : 'errors'}`.
    - Container applies `nestedSummaryErrorRowClass`.
- **Single Nested (1:1 Dissolved Sub-shapes)**:
  - Section divider displays an inline indicator: `↳ ${itemLabel} · ${count} issues`.
- **Auto-Expansion on Validation**:
  - When `validate()` executes and `autoExpandInvalid` is true, all nested accordion items that contain violations are automatically expanded in `renderer.nestedItemExpanded` state.

---

## 5. Workbench Demo Integration & Jump-to-Field Navigation

### 5.1 Controls in `src/workbench.ts`

- **Toolbar Buttons**:
  - "Validate Form" button (`#btn-validate-form`) that invokes `renderer.validate()`.
  - Trigger Mode selector (`#select-validate-on`) switching between `Manual`, `Live on change`, and `On blur`.
- **Conformance Banner**:
  - Conforming: Green banner (`SHACL Conformance: Valid`).
  - Violations: Red banner (`SHACL Conformance: N Violation(s)`).

### 5.2 Interactive Report Drawer & Jump-to-Field Navigation

- **Drawer Items**:
  - Breadcrumb trail: `Education › Item #1 › Degree Type`.
  - Badge with constraint: `sh:MinCountConstraintComponent`.
  - Target node: `ex:Alice` or `_:b1`.
  - Message: `Less than 1 values`.
- **Click-to-Focus Interaction**:
  - Clicking any violation in the drawer:
    1. Locates the DOM element via unique ID or `[data-field-key]`.
    2. If nested within a collapsed accordion, calls `renderer.toggleNestedItemExpanded` to expand the card.
    3. Calls `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
    4. Focuses the input element and triggers a CSS pulse/glow animation.

---

## 6. Testing Strategy

1. **Unit Tests (`test/validation.test.ts`)**:
   - `validateDataset`:
     - Conforming graph returns `conforms: true` and empty violations.
     - Root-level violations (`minCount`, `datatype`, `pattern`, `minInclusive`).
     - Nested shape violations (`sh:node`) unpacked into leaf errors with breadcrumbs.
     - Multi-level nested shapes (depth 2+).
     - Fast $O(1)$ `violationMap` indexing and `focusNodeViolationCount`.
2. **Component Integration Tests (`test/element-validation.test.ts`)**:
   - Renders `<shacl-renderer>` and calls `.validate()`.
   - Verifies input elements receive `inputErrorClass` and `aria-invalid="true"`.
   - Verifies nested accordion summary rows display the error badge.
   - Verifies `validate-on="change"` auto-validates on data mutations.
   - Verifies `clearValidation()` restores clean styling.
