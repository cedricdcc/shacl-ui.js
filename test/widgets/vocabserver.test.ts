import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataFactory } from 'rdf-data-factory';
import {
  parseVocabServerConfig,
  VocabServerWidgetDefinition,
  VOCABSERVER_WIDGET_IRI,
  VOCABSERVER_WIDGET_IRI_ORG
} from '../../lib/widgets/vocabserver/component.ts';
import {
  registerVocabServerWidget,
  VOCABSERVER_SCORING_TTL
} from '../../lib/widgets/vocabserver/index.ts';
import {
  getCustomWidget,
  hasCustomWidget,
  clearCustomWidgets
} from '../../lib/presentation/widgets/registry.ts';
import type { CustomWidgetRenderContext, UIComponent, UIComponentValue, TailwindClasses } from '../../lib/types.ts';
import { STYLING_SLOTS } from '../../lib/styling-slots.ts';

const df = new DataFactory();

describe('VocabServer Reference Widget', () => {
  beforeEach(() => {
    clearCustomWidgets();
  });

  describe('parseVocabServerConfig', () => {
    it('uses standard defaults when no custom annotations are supplied', () => {
      const config = parseVocabServerConfig({});
      expect(config.searchEndpoint).toBe('https://vocab.vliz.be');
      expect(config.sourceVocabularies).toBe('https://my-application.com/vocabulary-alias/vliz-dams-crs');
      expect(config.sourceDatasets).toBeNull();
      expect(config.languagesString).toBeNull();
      expect(config.singleSelect).toBe(false);
    });

    it('treats wildcard languages as null (no filter)', () => {
      const config = parseVocabServerConfig({ languages: '*' });
      expect(config.languagesString).toBeNull();
    });

    it('extracts custom annotations and honors maxCount=1', () => {
      const annotations = {
        searchEndpoint: 'https://custom.vocab.org',
        sourceVocabularies: 'https://custom.vocab.org/vocabs/test',
        sourceDatasets: 'https://custom.vocab.org/datasets/marine',
        languages: 'en,nl'
      };

      const config = parseVocabServerConfig(annotations, { maxCount: 1 } as any);
      expect(config.searchEndpoint).toBe('https://custom.vocab.org');
      expect(config.sourceVocabularies).toBe('https://custom.vocab.org/vocabs/test');
      expect(config.sourceDatasets).toBe('https://custom.vocab.org/datasets/marine');
      expect(config.languagesString).toBe('en,nl');
      expect(config.singleSelect).toBe(true);
    });
  });

  describe('VocabServerWidgetDefinition render', () => {
    it('renders view mode with a link badge when value exists', () => {
      const mockContext: CustomWidgetRenderContext = {
        renderer: {} as any,
        uiComponent: { uuid: 'c1', iri: df.namedNode('http://ex.org/p'), paths: [], values: [] },
        value: { uuid: 'v1', value: df.namedNode('http://vocab.vliz.be/concept/456'), path: { path: 'http://ex.org/p' } },
        index: 0,
        classes: STYLING_SLOTS as Required<TailwindClasses>,
        disabled: true,
        mode: 'view',
        annotations: {},
        onValueChange: vi.fn()
      };

      const template = VocabServerWidgetDefinition.render!(mockContext);
      expect(template).toBeDefined();
      const str = JSON.stringify(template);
      expect(str).toContain('http://vocab.vliz.be/concept/456');
    });

    it('renders edit mode with vocab-search-bar element attributes', () => {
      const onValueChange = vi.fn();
      const mockContext: CustomWidgetRenderContext = {
        renderer: {} as any,
        uiComponent: { uuid: 'c1', iri: df.namedNode('http://ex.org/p'), paths: [], values: [] },
        value: { uuid: 'v1', value: df.namedNode('http://vocab.vliz.be/concept/789'), path: { path: 'http://ex.org/p' } },
        index: 0,
        classes: STYLING_SLOTS as Required<TailwindClasses>,
        disabled: false,
        mode: 'edit',
        annotations: {
          searchEndpoint: 'https://vocab.vliz.be'
        },
        onValueChange
      };

      const template = VocabServerWidgetDefinition.render!(mockContext);
      expect(template).toBeDefined();
      const str = JSON.stringify(template);
      expect(str).toContain('vocab-search-bar');
      expect(str).toContain('https://vocab.vliz.be');
    });
  });

  describe('registerVocabServerWidget', () => {
    it('registers both VOCABSERVER_WIDGET_IRI and VOCABSERVER_WIDGET_IRI_ORG', () => {
      registerVocabServerWidget();

      expect(hasCustomWidget(VOCABSERVER_WIDGET_IRI)).toBe(true);
      expect(hasCustomWidget(VOCABSERVER_WIDGET_IRI_ORG)).toBe(true);

      const def = getCustomWidget(VOCABSERVER_WIDGET_IRI);
      expect(def?.defaultScoringTtl).toContain('shui:WidgetScore');
    });
  });
});
