# Design Specification: Nested Components Edge-Grid Architecture

## 1. Overview & Problem Statement

In complex SHACL forms featuring multi-tier nested shapes (e.g. `OceanographicCruise → EquipmentDeployment → InSituSensor → SensorPayload`), the previous implementation suffered from two major visual flaws:

1. **The Compounding Left Rail ("Thickening Line / Staircase")**:
   Every nested sub-shape blindly injected `border-l-2 pl-5`. At depth 1, a rail appeared; at depth 2, an indented second rail appeared; at depth 3, a third rail appeared. This created a stepped staircase of parallel vertical borders on the left margin, pushing content horizontally inward and breaking the vertical alignment of the form fields.

2. **Severe Header and Breadcrumb Redundancy**:
   Each nested shape rendered up to 4 separate vertical elements before displaying a single input field:
   - Uppercase property label (e.g. `INSTRUMENT TYPE SPECIFICATION`)
   - `sh:or` dropdown selector (e.g. `In Situ Sensor Shape ⌵`)
   - Sub-shape title with a blue pip (e.g. `| Instrument Type Specification`)
   - Long textual breadcrumb trail (e.g. `Deployed Equipment › Instrument Type Specification`)

This specification re-architects nested component presentation by strictly adhering to the **6 Core UI Practices** of "Weirdly Perfect" component-based interfaces.

---

## 2. The 6 Core UI Practices Applied

1. **Anchor Elements to Edges**:
   - Every input field—regardless of whether it sits at the root, Level 1, or Level 3—locks onto the **exact same 2-column CSS grid** (`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7`).
   - Zero horizontal indentation drift: eliminate `pl-5` compounding indents on sub-shapes.

2. **Differentiate Instead of Spacing**:
   - Replace arbitrary blank padding with clear structural anchors: a single, subtle section divider line with an inline hierarchy indicator (`↳`) and compact variant controls.

3. **Show, Don't Tell**:
   - Eliminate verbose textual breadcrumb strings (`Parent › Child › Grandchild`).
   - The hierarchy is self-evident by its placement inside the parent container and clean section headers.

4. **Design for Scannability**:
   - The user's eye path scans down straight vertical columns without dodging cascading left rails, indented margins, or paragraphs of breadcrumbs.

5. **Create Emphasis Through Contrast, Not Addition**:
   - Keep default boundaries muted (`border-zinc-200/60 dark:border-zinc-700/60`).
   - Active variant pickers and focused inputs provide crisp, intentional contrast.

6. **Dissolve Unnecessary Cards and Containers**:
   - 1:1 nested shapes (single instances / `maxCount === 1`) dissolve completely into the parent flow. No card-within-card boxes, no background tints, and no guide rail borders.
   - The outer repeated item (1:N) remains the sole boundary card.

---

## 3. Detailed Component Architecture

### 3.1 Outer Container: Repeated Items (1:N)
- **Scope**: Nested components where `maxCount > 1` or multiple instances exist (e.g. `Deployed Equipment and Instrumentation #1`).
- **Visual Presentation**:
  - Compact summary row (`nestedSummaryRowClass`) with entity avatar, title, remove button, and accordion chevron (`⌃` / `⌄`).
  - Expanded container establishes the clean card boundary:
    `border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-5 bg-white dark:bg-zinc-800/40 my-3`
  - All direct and indirect children render within this container onto the common 2-column grid.

### 3.2 Single Nested Sub-Shapes (1:1): Complete Dissolution
- **Scope**: Nested components where `maxCount === 1` (e.g. `Instrument Type Specification` and `Sensor Measurement Specification`).
- **Visual Presentation**:
  - Completely borderless and unindented.
  - No `border-l-2`, no `pl-5`, no nested background box.
  - Spans full width (`col-span-full`) and flows its child fields directly onto the parent's 2-column grid.

### 3.3 Unified Single-Row Header
Rather than stacking 4 separate vertical elements, the header collapses into a single horizontal row spanning `col-span-full`:

```html
<div class="col-span-full pt-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between mb-4">
  <div class="flex items-center gap-2 min-w-0">
    <span class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
      ↳ ${headerTitle}
    </span>
    ${hasOrVariants ? renderInlineVariantBadge() : nothing}
  </div>
  ${canRemove ? renderRemoveButton() : nothing}
</div>
```

- **Label Deduplication**: If the property label and the nested shape's label are identical (case-insensitive), render only one title.
- **Embedded Variant Selector**: The `sh:or` switcher renders as an inline badge button (`bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 text-xs font-medium px-2 py-0.5 rounded`) directly adjacent to the label.
- **Removal of Breadcrumbs**: The `nestedBreadcrumbClass` bar (`ancestors.join(' › ')`) is completely removed from the layout.

---

## 4. Styling Slots Specification (`lib/styling-slots.ts`)

| Slot Name | Default Tailwind Classes | Purpose |
| :--- | :--- | :--- |
| `detailsEditorClass` | `col-span-full my-3 relative` | Outer wrapper for nested shapes, dissolved into full grid span |
| `nestedRailClass` | `w-full` | Neutral container class; removes default `border-l-2 pl-5` |
| `nestedSectionDividerClass` | `col-span-full pt-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between mb-4` | Unified single-row sub-section header and hairline divider |
| `nestedVariantBadgeClass` | `inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer` | Compact pill button for inline `sh:or` variant selection |

Existing slots (`nestedSummaryRowClass`, `nestedSummaryAvatarClass`, etc.) are preserved for 100% backwards compatibility.

---

## 5. View Mode Parity (`mode="view"`)

- In View mode:
  - 1:1 nested sub-shapes render the exact same unified section dividers (`↳ Section Title`).
  - Read-only key-value pairs lock to the 2-column grid planes identically to Edit mode, guaranteeing zero layout shift.
  - Interactive controls (variant selector dropdown, remove button) are cleanly omitted.

---

## 6. Verification and Testing Plan

1. **Unit Testing (`test/macro-layout.test.ts`)**:
   - Assert that 1:1 nested shape containers do not include `border-l-2` or `pl-5` classes.
   - Assert that nested inputs are laid out with `col-span-1` and `col-span-full` inside the common 2-column grid.
   - Assert that duplicate labels are deduplicated.
   - Assert that textual breadcrumb sentences (`ancestor › ancestor`) are absent from rendered DOM.
   - Assert that `sh:or` variant options can be toggled via the inline badge button.

2. **Styling Slots Testing (`test/element-styling.test.ts`)**:
   - Assert that `STYLING_SLOTS` exports `nestedSectionDividerClass` and `nestedVariantBadgeClass`.
   - Assert that default `detailsEditorClass` does not contain `border-l-2`.

3. **Visual Verification in Workbench (`http://localhost:5173/src/workbench.html`)**:
   - Inspect the "Oceanographic Cruise" preset with multiple nested levels (`Deployed Equipment → Instrument Type → Sensor Measurement`).
   - Confirm that all input fields align along the same vertical column edges.
   - Confirm that the stepped "thickening line" staircase is completely gone.
