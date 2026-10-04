import { describe, expect, it } from 'vitest';
import { html, render } from 'lit';
import { DataFactory } from 'rdf-data-factory';
import { renderTextFieldEditor, renderDatePickerEditor, renderTextAreaEditor, renderNumberFieldEditor } from '../lib/presentation/widgets/editors-fields.ts';
import { renderEnumSelectEditor } from '../lib/presentation/widgets/editors-select.ts';
import { renderUIComponent } from '../lib/presentation/widgets/layout.ts';
import { ShaclRenderer } from '../lib/shacl-renderer.ts';
import type { UIComponent, UIComponentValue, TailwindClasses } from '../lib/types.ts';
import type { DetailedValidationReport } from '../lib/core/validation.ts';

const df = new DataFactory();

describe('Field Widget Error Rendering', () => {
  const classes = ShaclRenderer.DEFAULTS;
  const focusNode = df.namedNode('http://example.org/Alice');
  const path = { path: 'http://example.org/name', type: 'predicate' as const };

  function makeMockRenderer(violations: any[] = []): ShaclRenderer {
    const report: DetailedValidationReport = {
      conforms: violations.length === 0,
      violations,
      violationMap: new Map([[
        `${focusNode.value}#${path.path}`,
        violations
      ]]),
      focusNodeViolationCount: new Map([[focusNode.value, violations.length]])
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
      isNestedItemExpanded: () => true,
    } as unknown as ShaclRenderer;
  }

  it('renders TextFieldEditor with error border, aria-invalid, and inline alert message', () => {
    const violation = {
      id: 'v1',
      focusNode: focusNode.value,
      path: path.path,
      pathName: 'Full Name',
      constraintComponent: 'MinCountConstraintComponent',
      severity: 'Violation' as const,
      message: 'Full Name is required (at least 1 value)',
      breadcrumb: ['Full Name']
    };
    const renderer = makeMockRenderer([violation]);

    const uiComponent: UIComponent = {
      uuid: 'c1',
      iri: df.namedNode('http://example.org/shape'),
      focusNode,
      paths: [path],
      values: [{
        value: df.literal(''),
        path
      }]
    };
    const value = uiComponent.values[0];

    const template = renderTextFieldEditor(renderer, uiComponent, value, 0, classes);
    const container = document.createElement('div');
    render(template, container);

    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('class')).toContain('border-red-500');

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Full Name is required (at least 1 value)');
  });

  it('renders without error styling when there are no violations', () => {
    const renderer = makeMockRenderer([]);

    const uiComponent: UIComponent = {
      uuid: 'c2',
      iri: df.namedNode('http://example.org/shape'),
      focusNode,
      paths: [path],
      values: [{
        value: df.literal('Valid Name'),
        path
      }]
    };
    const value = uiComponent.values[0];

    const template = renderTextFieldEditor(renderer, uiComponent, value, 0, classes);
    const container = document.createElement('div');
    render(template, container);

    const input = container.querySelector('input');
    expect(input?.getAttribute('aria-invalid')).toBeNull();
    expect(input?.getAttribute('class')).not.toContain('border-red-500');

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeNull();
  });

  it('renders missing required value alert when minCount > 0 and values array is empty', () => {
    const violation = {
      id: 'v2',
      focusNode: focusNode.value,
      path: path.path,
      pathName: 'Full Name',
      constraintComponent: 'MinCountConstraintComponent',
      severity: 'Violation' as const,
      message: 'Full Name is required (at least 1 value)',
      breadcrumb: ['Full Name']
    };
    const renderer = makeMockRenderer([violation]);

    const uiComponent: UIComponent = {
      uuid: 'c3',
      iri: df.namedNode('http://example.org/shape'),
      label: 'Full Name',
      focusNode,
      paths: [path],
      minCount: 1,
      values: [] // No values entered!
    };

    const template = renderUIComponent(renderer, uiComponent, classes);
    const container = document.createElement('div');
    render(template, container);

    const missingAlert = container.querySelector('[role="alert"]');
    expect(missingAlert).not.toBeNull();
    expect(missingAlert?.textContent).toContain('Full Name is required');
  });
});
