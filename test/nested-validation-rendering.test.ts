import { describe, expect, it } from 'vitest';
import { html, render } from 'lit';
import { DataFactory } from 'rdf-data-factory';
import { renderDetailsEditor } from '../lib/presentation/widgets/editors-rich-nested.ts';
import { ShaclRenderer } from '../lib/shacl-renderer.ts';
import type { UIComponent, UIComponentValue } from '../lib/types.ts';
import type { DetailedValidationReport } from '../lib/core/validation.ts';

const df = new DataFactory();

describe('Nested Structure Error Rendering', () => {
  const classes = ShaclRenderer.DEFAULTS;
  const parentFocusNode = df.namedNode('http://example.org/Alice');
  const path = { path: 'http://example.org/education', type: 'predicate' as const };

  function makeMockRenderer(violationCounts: Map<string, number>): ShaclRenderer {
    const report: DetailedValidationReport = {
      conforms: violationCounts.size === 0,
      violations: [],
      violationMap: new Map(),
      focusNodeViolationCount: violationCounts
    };
    return {
      validationReport: report,
      DEFAULTS: classes,
      renderRoot: document.createElement('div'),
      mode: 'edit',
      removeFromDataStore: () => {},
      addToDataStore: () => {},
      rerender: () => {},
      alternativePathSelectOpen: {},
      isNestedItemExpanded: () => false,
      toggleNestedItemExpanded: () => {},
    } as unknown as ShaclRenderer;
  }

  it('renders error badge and row highlight on multiple nested item summary when it has violations', () => {
    const item1FocusNode = df.blankNode('b1');
    const item2FocusNode = df.blankNode('b2');

    const violationCounts = new Map<string, number>([
      [item2FocusNode.value, 2]
    ]);
    const renderer = makeMockRenderer(violationCounts);

    const uiComponent: UIComponent = {
      uuid: 'c_nested',
      iri: df.namedNode('http://example.org/shape'),
      label: 'Education',
      focusNode: parentFocusNode,
      paths: [path],
      maxCount: 5,
      values: [
        { value: item1FocusNode, path },
        { value: item2FocusNode, path }
      ],
      children: [
        [],
        []
      ]
    };

    // Render item 1 (no errors)
    const container1 = document.createElement('div');
    render(renderDetailsEditor(renderer, uiComponent, uiComponent.values[0], 0, classes), container1);

    expect(container1.textContent).not.toContain('error');
    const badge1 = container1.querySelector('.text-red-700');
    expect(badge1).toBeNull();

    // Render item 2 (2 errors)
    const container2 = document.createElement('div');
    render(renderDetailsEditor(renderer, uiComponent, uiComponent.values[1], 1, classes), container2);

    expect(container2.textContent).toContain('2 errors');
    // Row should include error styling class (bg-red-50/50 or border-red-300)
    const summaryRow2 = container2.querySelector('[class*="bg-red-50"]');
    expect(summaryRow2).not.toBeNull();
  });

  it('renders error badge in single nested section divider when it has violations', () => {
    const singleItemFocusNode = df.blankNode('b_single');
    const violationCounts = new Map<string, number>([
      [singleItemFocusNode.value, 1]
    ]);
    const renderer = makeMockRenderer(violationCounts);

    const uiComponent: UIComponent = {
      uuid: 'c_single_nested',
      iri: df.namedNode('http://example.org/shape'),
      label: 'Address',
      focusNode: parentFocusNode,
      paths: [path],
      maxCount: 1,
      values: [
        { value: singleItemFocusNode, path }
      ],
      children: [
        []
      ]
    };

    const container = document.createElement('div');
    render(renderDetailsEditor(renderer, uiComponent, uiComponent.values[0], 0, classes), container);

    expect(container.textContent).toContain('1 error');
    const badge = container.querySelector('.text-red-700');
    expect(badge).not.toBeNull();
  });
});
