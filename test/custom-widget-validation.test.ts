import { describe, expect, it } from 'vitest';
import { html } from 'lit';
import { ShaclRenderer } from '../lib/shacl-renderer.ts';
import { registerCustomWidget, clearCustomWidgets } from '../lib/presentation/widgets/registry.ts';
import type { CustomWidgetDefinition, CustomWidgetRenderContext } from '../lib/types.ts';
import { DataFactory } from 'rdf-data-factory';

const df = new DataFactory();

describe('Custom Widget Validation & Error Wrapper', () => {
  const MOCK_WIDGET_IRI = 'http://example.org/widgets/MockEditor';

  let lastContext: CustomWidgetRenderContext | null = null;

  const MockEditorDefinition: CustomWidgetDefinition = {
    iri: MOCK_WIDGET_IRI,
    label: 'Mock Editor',
    render(context: CustomWidgetRenderContext) {
      lastContext = context;
      return html`
        <div class="mock-editor-inner" data-has-error="${context.hasError}">
          <input
            id="mock-inner-input"
            type="text"
            .value="${context.value.value?.value ?? ''}"
            @change="${(e: Event) => {
              const val = (e.target as HTMLInputElement).value;
              context.onValueChange(val ? df.namedNode(val) : null);
            }}"
          />
        </div>
      `;
    }
  };

  const shapesGraph = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix shui: <http://www.w3.org/ns/shacl-ui/> .
    @prefix ex: <http://example.org/> .

    ex:TestShape a sh:NodeShape ;
      sh:targetClass ex:Item ;
      sh:property [
        sh:path ex:customProp ;
        sh:name "Custom Property" ;
        sh:minCount 1 ;
        sh:nodeKind sh:IRI ;
        shui:editor <${MOCK_WIDGET_IRI}> ;
      ] .
  `;

  const scoringGraph = `
    @prefix shui: <http://www.w3.org/ns/shacl-ui/> .
    @prefix ex: <http://example.org/> .
    ex:mockScore a shui:WidgetScore ;
      shui:widget <${MOCK_WIDGET_IRI}> ;
      shui:score 100 .
  `;

  async function waitForReady(el: ShaclRenderer, timeoutMs = 3000) {
    const start = Date.now();
    while (el.loading && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 10));
    }
    await el.updateComplete;
  }

  it('passes validation properties in context and renders error wrapper and inline alert when invalid', async () => {
    registerCustomWidget(MockEditorDefinition);

    const el = new ShaclRenderer();
    el.shapesGraph = shapesGraph;
    el.shapesGraphContentType = 'text/turtle';
    el.dataGraph = `<http://example.org/item/1> a <http://example.org/Item> .\n`;
    el.dataGraphContentType = 'text/turtle';
    el.widgetScoringGraph = scoringGraph;
    el.widgetScoringGraphContentType = 'text/turtle';
    el.focusNode = 'http://example.org/item/1';
    el.constraintShape = 'http://example.org/TestShape';

    document.body.appendChild(el);
    await waitForReady(el);

    // Initial validate
    const report = await el.validate();
    expect(report.conforms).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);

    await el.updateComplete;

    // Check context enriched with validation data
    expect(lastContext).not.toBeNull();
    expect(lastContext?.hasError).toBe(true);
    expect(lastContext?.violations.length).toBeGreaterThan(0);
    expect(lastContext?.isEmpty).toBe(true);

    const root = el.renderRoot || el;

    // Check that outer container received error styling ring
    const wrapper = root.querySelector('.custom-widget-field');
    expect(wrapper).not.toBeNull();
    const errorContainer = wrapper?.querySelector('.ring-red-500\\/80, [class*="ring-red-500"]');
    expect(errorContainer).not.toBeNull();

    // Check that inline violation alert is rendered
    const alert = wrapper?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('node kind');

    // Now satisfy the constraint
    lastContext?.onValueChange(df.namedNode('http://example.org/valid-iri'));
    const report2 = await el.validate();
    expect(report2.conforms).toBe(true);

    await el.updateComplete;

    // Check error styling and alert removed
    expect(lastContext?.hasError).toBe(false);
    const alertAfter = wrapper?.querySelector('[role="alert"]');
    expect(alertAfter).toBeNull();

    el.remove();
    clearCustomWidgets();
  });
});
