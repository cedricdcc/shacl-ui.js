import { describe, it, expect, beforeEach } from 'vitest';
import type {
  CustomWidgetDefinition,
  CustomWidgetRenderContext,
  CustomWidgetMountContext,
  CustomWidgetInstance
} from '../../lib/types.ts';
import {
  registerCustomWidget,
  unregisterCustomWidget,
  getCustomWidget,
  hasCustomWidget,
  getAllCustomWidgets,
  getCustomScoringTtls,
  clearCustomWidgets
} from '../../lib/presentation/widgets/registry.ts';

describe('CustomWidgetRegistry', () => {
  beforeEach(() => {
    clearCustomWidgets();
  });

  it('registers and retrieves a custom widget definition', () => {
    const def: CustomWidgetDefinition = {
      iri: 'http://example.org/TestWidget',
      label: 'Test Widget',
      description: 'A widget for testing'
    };

    registerCustomWidget(def);

    expect(hasCustomWidget('http://example.org/TestWidget')).toBe(true);
    expect(getCustomWidget('http://example.org/TestWidget')).toEqual(def);
  });

  it('unregisters a widget correctly', () => {
    const def: CustomWidgetDefinition = {
      iri: 'http://example.org/TestWidget'
    };

    registerCustomWidget(def);
    expect(hasCustomWidget(def.iri)).toBe(true);

    unregisterCustomWidget(def.iri);
    expect(hasCustomWidget(def.iri)).toBe(false);
    expect(getCustomWidget(def.iri)).toBeUndefined();
  });

  it('overwrites a previously registered widget with the same IRI', () => {
    const def1: CustomWidgetDefinition = {
      iri: 'http://example.org/TestWidget',
      label: 'Version 1'
    };
    const def2: CustomWidgetDefinition = {
      iri: 'http://example.org/TestWidget',
      label: 'Version 2'
    };

    registerCustomWidget(def1);
    registerCustomWidget(def2);

    expect(getCustomWidget('http://example.org/TestWidget')?.label).toBe('Version 2');
    expect(getAllCustomWidgets()).toHaveLength(1);
  });

  it('aggregates non-empty default scoring TTL strings', () => {
    registerCustomWidget({
      iri: 'http://example.org/Widget1',
      defaultScoringTtl: 'ex:score1 a shui:WidgetScore .'
    });
    registerCustomWidget({
      iri: 'http://example.org/Widget2',
      defaultScoringTtl: 'ex:score2 a shui:WidgetScore .'
    });
    registerCustomWidget({
      iri: 'http://example.org/Widget3' // No scoring TTL
    });

    const ttls = getCustomScoringTtls();
    expect(ttls).toHaveLength(2);
    expect(ttls).toContain('ex:score1 a shui:WidgetScore .');
    expect(ttls).toContain('ex:score2 a shui:WidgetScore .');
  });
});
