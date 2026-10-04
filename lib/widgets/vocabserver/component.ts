import { html, nothing, type TemplateResult } from 'lit';
import { DataFactory } from 'rdf-data-factory';
import type { CustomWidgetDefinition, CustomWidgetRenderContext, UIComponent } from '../../types.ts';

const df = new DataFactory();

export const VOCABSERVER_WIDGET_IRI = 'http://example.com/ns#VocabServerEditor';
export const VOCABSERVER_WIDGET_IRI_ORG = 'http://example.org/VocabServerEditor';
export const VOCABSERVER_SCRIPT_URL = 'https://vocab.vliz.be/webcomponent/main.js';

export interface VocabServerConfig {
  searchEndpoint: string;
  sourceVocabularies: string | null;
  sourceDatasets: string | null;
  languagesString: string | null;
  singleSelect: boolean;
}

/**
 * Dynamically loads the official VLIZ VocabServer web component if not already registered.
 */
export function ensureVocabSearchBarLoaded(): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (typeof process !== 'undefined' && process.env?.VITEST) return;
  if (customElements.get('vocab-search-bar')) return;

  const existingScript = document.querySelector(`script[src="${VOCABSERVER_SCRIPT_URL}"]`);
  if (!existingScript) {
    try {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = VOCABSERVER_SCRIPT_URL;
      document.head?.appendChild(script);
    } catch {
      // Remote script loading may be disabled in headless/test environments
    }
  }
}

/**
 * Parses SHACL property shape annotations into VocabServer configuration.
 */
export function parseVocabServerConfig(
  annotations: Record<string, string> = {},
  propertyShape?: Partial<UIComponent>
): VocabServerConfig {
  const getAnnotation = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      if (annotations[key] !== undefined) return annotations[key];
      for (const [k, v] of Object.entries(annotations)) {
        if (k === key || k.endsWith(key) || k.split('#').pop() === key || k.split('/').pop() === key) {
          return v;
        }
      }
    }
    return undefined;
  };

  const searchEndpoint = getAnnotation(
    'searchEndpoint',
    'http://example.org/searchEndpoint',
    'http://example.com/ns#searchEndpoint',
    'search-endpoint'
  ) || 'https://vocab.vliz.be';

  const sourceVocabularies = getAnnotation(
    'sourceVocabularies',
    'http://example.org/sourceVocabularies',
    'http://example.com/ns#sourceVocabularies',
    'source-vocabularies'
  ) || 'https://my-application.com/vocabulary-alias/vliz-dams-crs';

  const sourceDatasets = getAnnotation(
    'sourceDatasets',
    'http://example.org/sourceDatasets',
    'http://example.com/ns#sourceDatasets',
    'source-datasets'
  ) || null;

  const rawLanguages = getAnnotation('languages', 'languages-string');
  const languagesString = rawLanguages && rawLanguages.trim() !== '*' && rawLanguages.trim().length > 0
    ? rawLanguages.trim()
    : null;
  const singleSelect = propertyShape?.maxCount === 1;

  return {
    searchEndpoint,
    sourceVocabularies,
    sourceDatasets,
    languagesString,
    singleSelect
  };
}

/**
 * VocabServer SHACL-UI Reference Custom Widget Definition
 */
export const VocabServerWidgetDefinition: CustomWidgetDefinition = {
  iri: VOCABSERVER_WIDGET_IRI,
  label: 'VocabServer Controlled Vocabulary Lookup',
  description: 'Search and select controlled vocabulary terms from external VocabServer endpoints',
  render(context: CustomWidgetRenderContext): TemplateResult {
    const { uiComponent, value, mode, annotations, onValueChange, hasError } = context;
    const currentVal = value.value?.value ?? '';

    // View Mode: Render read-only badge
    if (mode === 'view') {
      if (!currentVal) {
        return hasError
          ? html`<span class="text-xs text-red-500 dark:text-red-400 italic">Missing required value</span>`
          : html`<span class="text-xs text-zinc-400 italic">—</span>`;
      }

      return html`
        <div class="py-1">
          <a
            href="${currentVal}"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-mono text-indigo-700 dark:text-indigo-300 hover:underline"
          >
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span class="truncate max-w-sm">${currentVal}</span>
          </a>
        </div>
      `;
    }

    // Edit Mode: Ensure script loaded and render <vocab-search-bar>
    ensureVocabSearchBarLoaded();
    const config = parseVocabServerConfig(annotations, uiComponent);

    return html`
      <div class="w-full relative">
        <vocab-search-bar
          search-endpoint="${config.searchEndpoint}"
          source-vocabularies="${config.sourceVocabularies ?? ''}"
          source-datasets="${config.sourceDatasets ?? nothing}"
          languages-string="${config.languagesString ?? nothing}"
          ?single-select="${config.singleSelect}"
          selections="${currentVal || nothing}"
          ?invalid="${hasError}"
          aria-invalid="${hasError ? 'true' : 'false'}"
          @selection-changed="${(e: CustomEvent) => {
            const detail = e.detail;
            if (Array.isArray(detail) && detail.length > 0 && detail[0]?.uri) {
              onValueChange(df.namedNode(detail[0].uri));
            } else if (typeof detail === 'string' && detail.length > 0) {
              onValueChange(df.namedNode(detail));
            } else {
              onValueChange(null);
            }
          }}"
        ></vocab-search-bar>
      </div>
    `;
  }
};
