import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DataFactory } from 'rdf-data-factory';
import { parseRdf } from '../../lib/core/rdf.ts';
import '../../lib/shacl-renderer.ts';
import type { ShaclRenderer } from '../../lib/shacl-renderer.ts';
import { registerVocabServerWidget } from '../../lib/widgets/vocabserver/index.ts';

const df = new DataFactory();

describe('Cruise Expedition Flagship Shape', () => {
  const shapePath = path.resolve(__dirname, '../../src/assets/cruise-expedition.ttl');
  let shapeTtl: string;

  beforeEach(() => {
    registerVocabServerWidget();
    shapeTtl = fs.readFileSync(shapePath, 'utf8');
  });

  it('parses cruise-expedition.ttl and contains all expected NodeShapes and patterns', async () => {
    const store = await parseRdf(shapeTtl, 'text/turtle');
    const RDF_TYPE = df.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const SH_NODE_SHAPE = df.namedNode('http://www.w3.org/ns/shacl#NodeShape');
    const SH_PATTERN = df.namedNode('http://www.w3.org/ns/shacl#pattern');

    const nodeShapes = store.getQuads(null, RDF_TYPE, SH_NODE_SHAPE).map((q) => q.subject.value);

    expect(nodeShapes).toContain('http://example.org/CruiseExpeditionShape');
    expect(nodeShapes).toContain('http://example.org/OnboardPersonnelShape');
    expect(nodeShapes).toContain('http://example.org/ScientistRoleShape');
    expect(nodeShapes).toContain('http://example.org/CrewRoleShape');
    expect(nodeShapes).toContain('http://example.org/EquipmentDeploymentShape');
    expect(nodeShapes).toContain('http://example.org/InSituSensorShape');
    expect(nodeShapes).toContain('http://example.org/SensorPayloadMeasurementShape');
    expect(nodeShapes).toContain('http://example.org/WaterSedimentSamplerShape');
    expect(nodeShapes).toContain('http://example.org/SamplerSpecificationShape');

    // Check regex patterns are present
    const patterns = store.getQuads(null, SH_PATTERN, null).map((q) => q.object.value);
    expect(patterns).toContain('^CRUISE-[0-9]{4}-[A-Z0-9]+$');
    expect(patterns).toContain('^https://orcid\\.org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$');
    expect(patterns).toContain('^STCW-[A-Z]{2}-[0-9]{6}$');
    expect(patterns).toContain('^EQ-[A-Z0-9]{4}-[0-9]{4}$');
  });

  it('constructs UI components and renders without errors in <shacl-renderer>', async () => {
    const el = document.createElement('shacl-renderer') as ShaclRenderer;
    el.useLightDom = true;
    el.widgetScoringGraph = `
      @prefix shui: <http://www.w3.org/ns/shacl-ui/> .
      @prefix ex: <http://example.org/> .
      ex:tf a shui:WidgetScore ; shui:widget shui:TextFieldEditor ; shui:score 5 .
      ex:dt a shui:WidgetScore ; shui:widget shui:DatePickerEditor ; shui:score 5 .
      ex:num a shui:WidgetScore ; shui:widget shui:NumberFieldEditor ; shui:score 5 .
      ex:enum a shui:WidgetScore ; shui:widget shui:EnumSelectEditor ; shui:score 10 .
      ex:details a shui:WidgetScore ; shui:widget shui:DetailsEditor ; shui:score 5 .
    `;
    el.widgetScoringGraphContentType = 'text/turtle';
    el.shapesGraph = shapeTtl;
    el.shapesGraphContentType = 'text/turtle';
    el.dataGraph = '<http://example.org/cruise/2026-01> a <http://example.org/OceanographicCruise> .\n';
    el.dataGraphContentType = 'text/turtle';
    el.focusNode = 'http://example.org/cruise/2026-01';
    el.constraintShape = 'http://example.org/CruiseExpeditionShape';

    document.body.appendChild(el);

    // Wait for async update pipeline
    const start = Date.now();
    while (el.loading && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 10));
    }
    await el.updateComplete;

    expect(el.error).toBeNull();
    expect(el.ui.length).toBeGreaterThan(0);

    // Verify cruise code property is present with pattern
    const cruiseCodeComp = el.ui.find((c) => c.label === 'Cruise Expedition Code');
    expect(cruiseCodeComp).toBeDefined();
    expect(cruiseCodeComp?.pattern).toBe('^CRUISE-[0-9]{4}-[A-Z0-9]+$');

    // Verify nested equipment and personnel components exist
    const personnelComp = el.ui.find((c) => c.label === 'Onboard Personnel and Scientific Team');
    expect(personnelComp).toBeDefined();

    const equipmentComp = el.ui.find((c) => c.label === 'Deployed Equipment and Instrumentation');
    expect(equipmentComp).toBeDefined();

    el.remove();
  });
});
