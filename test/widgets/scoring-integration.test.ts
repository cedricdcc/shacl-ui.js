import { describe, it, expect, beforeEach } from 'vitest';
import { ShaclRenderer } from '../../lib/shacl-renderer.ts';
import { registerCustomWidget, clearCustomWidgets } from '../../lib/presentation/widgets/registry.ts';
import type { CustomWidgetDefinition } from '../../lib/types.ts';
import { DataFactory } from 'rdf-data-factory';

const df = new DataFactory();

describe('Custom Widget Scoring Rules Integration in ShaclRenderer', () => {
  beforeEach(() => {
    clearCustomWidgets();
  });

  it('automatically merges registered custom widget scoring TTLs into widgetScoringStore', async () => {
    const customScoringTtl = `
      @prefix ex: <http://example.org/> .
      @prefix shui: <http://www.w3.org/ns/shacl-ui/> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .

      ex:customScore a shui:WidgetScore ;
        shui:widget ex:CustomScoredEditor ;
        shui:score 99 ;
        shui:shapesGraphShape [
          a sh:NodeShape ;
          sh:property [
            sh:path ex:specialProp ;
            sh:minCount 1 ;
          ]
        ] .
    `;

    const customWidget: CustomWidgetDefinition = {
      iri: 'http://example.org/CustomScoredEditor',
      defaultScoringTtl: customScoringTtl
    };

    registerCustomWidget(customWidget);

    const renderer = new ShaclRenderer();
    renderer.dataGraph = `
      @prefix ex: <http://example.org/> .
      ex:item1 ex:specialProp "Test" .
    `;
    renderer.dataGraphContentType = 'text/turtle';

    renderer.shapesGraph = `
      @prefix ex: <http://example.org/> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .

      ex:MyShape a sh:NodeShape ;
        sh:targetClass ex:Item ;
        sh:property [
          sh:path ex:specialProp ;
          sh:minCount 1 ;
        ] .
    `;
    renderer.shapesGraphContentType = 'text/turtle';

    renderer.widgetScoringGraph = `
      @prefix ex: <http://example.org/> .
      @prefix shui: <http://www.w3.org/ns/shacl-ui/> .

      ex:baseScore a shui:WidgetScore ;
        shui:widget <http://www.w3.org/ns/shacl-ui/TextFieldEditor> ;
        shui:score 10 .
    `;
    renderer.widgetScoringGraphContentType = 'text/turtle';
    renderer.focusNode = 'http://example.org/item1';
    renderer.constraintShape = 'http://example.org/MyShape';

    // Trigger update
    await (renderer as any).willUpdate(new Map([
      ['dataGraph', ''],
      ['dataGraphContentType', ''],
      ['shapesGraph', ''],
      ['shapesGraphContentType', ''],
      ['widgetScoringGraph', ''],
      ['widgetScoringGraphContentType', ''],
      ['focusNode', ''],
      ['constraintShape', '']
    ]));

    expect(renderer.widgetScoringStore).toBeDefined();

    // Verify custom score quad is present in widgetScoringStore
    const customScoreSubject = df.namedNode('http://example.org/customScore');
    const quads = renderer.widgetScoringStore?.getQuads(customScoreSubject, null, null, null);
    expect(quads && quads.length > 0).toBe(true);
  });
});
