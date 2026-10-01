import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html } from 'lit';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { renderEditor, extractShapeAnnotations } from '../../lib/presentation/widgets/layout.ts';
import { registerCustomWidget, clearCustomWidgets } from '../../lib/presentation/widgets/registry.ts';
import type { CustomWidgetDefinition, UIComponent, UIComponentValue, TailwindClasses } from '../../lib/types.ts';
import { STYLING_SLOTS } from '../../lib/styling-slots.ts';

const df = new DataFactory();

describe('Custom Widget Dispatch in layout.ts', () => {
  beforeEach(() => {
    clearCustomWidgets();
  });

  describe('extractShapeAnnotations', () => {
    it('extracts non-standard property annotations from shapesStore', () => {
      const store = RdfStore.createDefault();
      const shapeNode = df.namedNode('http://example.org/MyShape');
      const searchEndpointPred = df.namedNode('http://example.org/searchEndpoint');
      const endpointVal = df.literal('https://vocab.vliz.be');

      store.addQuad(df.quad(shapeNode, searchEndpointPred, endpointVal));

      const annotations = extractShapeAnnotations(shapeNode, store);
      expect(annotations['http://example.org/searchEndpoint']).toBe('https://vocab.vliz.be');
      expect(annotations['searchEndpoint']).toBe('https://vocab.vliz.be');
    });

    it('returns empty object if shapesStore is missing or shapeNode is null', () => {
      expect(extractShapeAnnotations(null, null)).toEqual({});
    });
  });

  describe('renderEditor custom widget dispatch', () => {
    it('renders custom widget template when widget is registered', () => {
      let capturedContext: any = null;

      const widgetDef: CustomWidgetDefinition = {
        iri: 'http://example.org/CustomEditor',
        render: (context) => {
          capturedContext = context;
          return html`<div id="custom-rendered">Custom Content</div>`;
        }
      };

      registerCustomWidget(widgetDef);

      const mockRenderer: any = {
        mode: 'edit',
        shapesStore: RdfStore.createDefault(),
        removeFromDataStore: vi.fn(),
        addToDataStore: vi.fn(),
        rerender: vi.fn()
      };

      const mockComponent: UIComponent = {
        uuid: 'comp-1',
        iri: df.namedNode('http://example.org/prop'),
        focusNode: df.namedNode('http://example.org/subject'),
        paths: [{ path: 'http://example.org/prop' }],
        values: []
      };

      const mockValue: UIComponentValue = {
        uuid: 'val-1',
        value: df.literal('initial-val'),
        selectedWidget: 'http://example.org/CustomEditor',
        path: { path: 'http://example.org/prop' }
      };

      const template = renderEditor(
        mockRenderer,
        mockComponent,
        mockValue,
        0,
        STYLING_SLOTS as Required<TailwindClasses>,
        false
      );

      expect(template).toBeDefined();
      expect(capturedContext).toBeDefined();
      expect(capturedContext.value.value.value).toBe('initial-val');

      // Test onValueChange callback
      const newTerm = df.namedNode('http://vocab.vliz.be/concept/123');
      capturedContext.onValueChange(newTerm);

      expect(mockRenderer.removeFromDataStore).toHaveBeenCalledWith(
        mockComponent.focusNode,
        mockValue.path,
        df.literal('initial-val')
      );
      expect(mockRenderer.addToDataStore).toHaveBeenCalledWith(
        mockComponent.focusNode,
        mockValue.path,
        newTerm
      );
      expect(mockValue.value).toEqual(newTerm);
      expect(mockRenderer.rerender).toHaveBeenCalled();
    });

    it('falls back to unsupported widget placeholder when widget is not registered', () => {
      const mockRenderer: any = {
        mode: 'edit',
        shapesStore: RdfStore.createDefault()
      };

      const mockComponent: UIComponent = {
        uuid: 'comp-1',
        iri: df.namedNode('http://example.org/prop'),
        paths: [{ path: 'http://example.org/prop' }],
        values: [],
        label: 'My Field'
      };

      const mockValue: UIComponentValue = {
        uuid: 'val-1',
        value: df.literal('val'),
        selectedWidget: 'http://example.org/UnregisteredEditor',
        path: { path: 'http://example.org/prop' }
      };

      const template: any = renderEditor(
        mockRenderer,
        mockComponent,
        mockValue,
        0,
        STYLING_SLOTS as Required<TailwindClasses>,
        false
      );

      // Verify template strings include "Unsupported widget:"
      const str = JSON.stringify(template);
      expect(str).toContain('Unsupported widget:');
    });
  });
});
