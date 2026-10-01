# Design Specification: Extensible Custom Widget System & VocabServer Integration

## 1. Overview

This specification defines:
1. **A First-Class Extensible Custom Widget System** within `shacl-ui.js` that allows custom Web Components, Lit templates, or third-party UI controls to be registered and rendered natively by `<shacl-renderer>` without external DOM scraping or mutation observer hacks.
2. **The VocabServer Widget Reference Implementation** (`ex:VocabServerEditor`), which wraps the official [VLIZ VocabServer Web Component](https://github.com/vlizBE/vocabserver-webcomponent) (`<vocab-search-bar>`) using live endpoints (`https://vocab.vliz.be`).
3. **An Interactive 3-Panel Workbench Demo** (`src/workbench.html` & `src/workbench.ts`) matching the interactive environment of the playground project, enabling real-time SHACL shape authoring, live `<shacl-renderer>` form interaction with VocabServer, and live RDF Turtle serialization with SHACL validation.

---

## 2. Architectural Design

```
+---------------------------------------------------------------------------------+
|                                 SHACL Shapes                                    |
|      (sh:PropertyShape + ex:searchEndpoint / ex:sourceVocabularies / shui:editor)|
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                           <shacl-renderer> Core                                 |
|  - Evaluates shui:WidgetScore rules across shapes and data graphs               |
|  - Queries CustomWidgetRegistry for registered custom widget definitions        |
|  - Passes CustomWidgetRenderContext to widget render/mount handler              |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                       Custom Widget Registration Layer                          |
|                       (lib/presentation/widgets/registry.ts)                    |
|  - registerCustomWidget(definition)                                             |
|  - Dispatches to Lit template render() or DOM mount() adapter                   |
+---------------------------------------------------------------------------------+
                    |                                         |
                    v                                         v
+---------------------------------------+ +---------------------------------------+
|      VocabServer Widget (Official)    | |        Future Custom Widgets          |
|  - Loads https://vocab.vliz.be CDN    | |  (e.g., GeoPicker, MediaUpload, etc.) |
|  - Mounts/renders <vocab-search-bar>  | +---------------------------------------+
|  - Listens to @selection-changed      |
|  - Syncs NamedNode terms to store     |
+---------------------------------------+
                    |
                    v
+---------------------------------------------------------------------------------+
|                             Reactive RDF Store                                  |
|  - Updates renderer.dataStore via addToDataStore & removeFromDataStore          |
|  - Serializes to live Turtle output and validates via shacl-engine              |
+---------------------------------------------------------------------------------+
```

---

## 3. Data Contracts & Interfaces (`lib/types.ts`)

```typescript
import type { Term } from '@rdfjs/types';
import type { TemplateResult } from 'lit';
import type { UIComponent, UIComponentValue, TailwindClasses } from './types.ts';
import type { ShaclRenderer } from './shacl-renderer.ts';

/**
 * Context provided to custom widget render/mount implementations.
 */
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
}

export interface CustomWidgetMountContext extends CustomWidgetRenderContext {
  container: HTMLElement;
}

export interface CustomWidgetInstance {
  update?: (context: CustomWidgetMountContext) => void;
  unmount?: () => void;
}

export interface CustomWidgetDefinition {
  iri: string;
  label?: string;
  description?: string;
  defaultScoringTtl?: string;
  render?: (context: CustomWidgetRenderContext) => TemplateResult;
  mount?: (context: CustomWidgetMountContext) => CustomWidgetInstance;
}
```

---

## 4. Custom Widget Registry (`lib/presentation/widgets/registry.ts`)

The registry maintains custom widget definitions in a global map:
- `registerCustomWidget(definition: CustomWidgetDefinition): void`: Registers a widget under `definition.iri`. If already registered, it replaces the definition.
- `unregisterCustomWidget(iri: string): void`: Removes registration.
- `getCustomWidget(iri: string): CustomWidgetDefinition | undefined`: Retrieves definition by IRI.
- `hasCustomWidget(iri: string): boolean`: Checks if an IRI is registered.
- `getAllCustomWidgets(): CustomWidgetDefinition[]`: Returns all registered widgets.
- `getCustomScoringTtls(): string[]`: Returns all non-empty `defaultScoringTtl` strings.

---

## 5. Renderer Integration & Dispatch

### 5.1 Native Dispatch in `lib/presentation/widgets/layout.ts`
In `renderEditor(...)`:
1. Check `hasCustomWidget(value.selectedWidget)`.
2. If registered:
   - Extract property shape annotations from `renderer.shapesStore`.
   - Construct `onValueChange(newTerm: Term | null)`:
     - Calls `renderer.removeFromDataStore(uiComponent.focusNode, value.path, prevTerm)`.
     - Calls `renderer.addToDataStore(uiComponent.focusNode, value.path, newTerm)`.
     - Updates `value.value = newTerm ?? ({} as any)`.
     - Calls `renderer.rerender()`.
   - If `customWidget.render` is provided, call `customWidget.render(context)`.
   - If `customWidget.mount` is provided, instantiate a lightweight host element `<custom-widget-host>` that delegates lifecycle to `mount()` and `unmount()`.
3. If not registered, fall back to the default unsupported widget label.

### 5.2 Automatic Scoring Rules Integration
When `<shacl-renderer>` initializes its scoring graph:
- In `lib/shacl-renderer.ts`, retrieve `getCustomScoringTtls()`.
- Append and parse any custom widget scoring rules into the internal scoring store alongside built-in scoring rules, ensuring custom widgets participate in the SHACL-UI scoring algorithm.

---

## 6. VocabServer Widget Implementation (`lib/widgets/vocabserver/`)

### 6.1 Web Component Integration
- Uses official script `https://vocab.vliz.be/webcomponent/main.js` which defines `<vocab-search-bar>`.
- Automatically injects the script into the document `<head>` if `customElements.get('vocab-search-bar')` is not already defined.

### 6.2 Property Shape Annotations Parsing
Parses configuration from the property shape annotations:
- `ex:searchEndpoint` or `search-endpoint`: defaults to `https://vocab.vliz.be`
- `ex:sourceVocabularies` or `source-vocabularies`: defaults to `https://my-application.com/vocabulary-alias/vliz-dams-crs`
- `ex:sourceDatasets` or `source-datasets`: optional dataset URI
- `languages-string`: optional language code (default `'*'`)
- `single-select`: `true` if `sh:maxCount === 1`

### 6.3 Modes
- **Edit Mode:**
  Renders `<vocab-search-bar>` with initial `selections="${currentValueIri}"`.
  Binds `@selection-changed`:
  ```typescript
  (e: CustomEvent) => {
    const detail = e.detail;
    if (Array.isArray(detail) && detail.length > 0 && detail[0].uri) {
      context.onValueChange(DataFactory.namedNode(detail[0].uri));
    } else {
      context.onValueChange(null);
    }
  }
  ```
- **View Mode:**
  Renders a styled hyperlink badge showing the selected IRI with external link icon, opening the concept in a new tab.

### 6.4 Scoring Rules (`lib/widgets/vocabserver/scoring.ttl`)
Registers scoring rules for:
1. `ex:searchEndpoint` presence (heuristic score 35).
2. Explicit `shui:editor ex:VocabServerEditor` (score 50).
3. Explicit `shui:widget ex:VocabServerEditor` (score 50).
4. Both `http://example.com/ns#VocabServerEditor` and `http://example.org/VocabServerEditor` namespaces.

---

## 7. Interactive 3-Panel Workbench Demo (`src/workbench.html` & `src/workbench.ts`)

A dedicated developer workbench hosted at `src/workbench.html` (accessible via `npm run dev`):
- **Panel 1 — SHACL Shape Editor**:
  - CodeMirror editor with Turtle syntax highlighting.
  - Shape Presets dropdown:
    - *Marine Observation (VocabServer)*: Demonstrates live VocabServer search with parameter attributes.
    - *Person Profile*: Demonstrates built-in editors.
    - *Custom Blank Shape*: Boilerplate shape with standard prefixes.
  - "Generate Form" action with keyboard shortcut (`Ctrl+Enter`).
- **Panel 2 — Live `<shacl-renderer>` Preview**:
  - Live interactive form with the registered VocabServer widget.
  - Mode toggles (Edit vs View) and Theme toggles (Dark vs Light).
- **Panel 3 — Real-Time Turtle Output**:
  - Live serialization of the edited RDF data graph.
  - "Copy to Clipboard" and "Download .ttl" buttons.
  - SHACL validation badge powered by `shacl-engine`.

---

## 8. Testing Strategy

1. **Unit Tests (`test/widgets/registry.test.ts`)**:
   - Widget registration, retrieval, overwrite, and unregistration.
   - Dynamic scoring TTL aggregation.
2. **Unit Tests (`test/widgets/vocabserver.test.ts`)**:
   - Configuration extraction from property shapes.
   - Dynamic script injection and custom element mounting.
   - Value change handling and NamedNode quad generation.
3. **Integration Tests (`test/widgets/renderer-custom-widgets.test.ts`)**:
   - `<shacl-renderer>` rendering custom widgets when matched by scoring graph.
   - Data updates reflected in `renderer.data('text/turtle')`.
4. **End-to-End Verification**:
   - Browser verification of `src/workbench.html` with active VocabServer searches and Turtle serialization.
