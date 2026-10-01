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
    const scoringPath = path.resolve(__dirname, '../../src/assets/widget-scoring.ttl');
    const scoringTtl = fs.readFileSync(scoringPath, 'utf8');

    const el = document.createElement('shacl-renderer') as ShaclRenderer;
    el.useLightDom = true;
    el.widgetScoringGraph = scoringTtl;
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

    // Root license and CRS properties use VocabServer
    const licenseComp = el.ui.find((c) => c.label === 'Open Data License');
    expect(licenseComp).toBeDefined();
    expect(licenseComp?.defaultWidget).toMatch(/VocabServerEditor/);

    const crsComp = el.ui.find((c) => c.label === 'Navigation CRS (Spatial Reference)');
    expect(crsComp).toBeDefined();
    expect(crsComp?.defaultWidget).toMatch(/VocabServerEditor/);

    // Verify personnel component uses DetailsEditor and has nested children
    const personnelComp = el.ui.find((c) => c.label === 'Onboard Personnel and Scientific Team');
    expect(personnelComp).toBeDefined();
    expect(personnelComp?.defaultWidget).toBe('http://www.w3.org/ns/shacl-ui/DetailsEditor');
    expect(personnelComp?.children).toBeDefined();
    expect(personnelComp?.children?.length).toBeGreaterThan(0);

    const personChildren = personnelComp?.children?.[0] ?? [];
    const personField = personChildren.find((c) => c.label === 'Person (MarineInfo Registry)');
    expect(personField).toBeDefined();
    expect(personField?.defaultWidget).toMatch(/VocabServerEditor/);

    const affiliationField = personChildren.find((c) => c.label === 'Home Institution / Affiliation');
    expect(affiliationField).toBeDefined();
    expect(affiliationField?.defaultWidget).toMatch(/VocabServerEditor/);

    const roleField = personChildren.find((c) => c.label === 'Participant Category and Role');
    expect(roleField).toBeDefined();
    expect(roleField?.defaultWidget).toBe('http://www.w3.org/ns/shacl-ui/DetailsEditor');
    expect(roleField?.orNode).toHaveLength(2);
    expect(roleField?.children).toBeDefined();
    expect(roleField?.children?.length).toBeGreaterThan(0);

    const roleChildren = roleField?.children?.[0] ?? [];
    const orcidField = roleChildren.find((c) => c.label === 'ORCID Identifier');
    expect(orcidField).toBeDefined();
    expect(orcidField?.pattern).toBe('^https://orcid\\.org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$');

    // Verify equipment component uses DetailsEditor and has nested children
    const equipmentComp = el.ui.find((c) => c.label === 'Deployed Equipment and Instrumentation');
    expect(equipmentComp).toBeDefined();
    expect(equipmentComp?.defaultWidget).toBe('http://www.w3.org/ns/shacl-ui/DetailsEditor');
    expect(equipmentComp?.children).toBeDefined();
    expect(equipmentComp?.children?.length).toBeGreaterThan(0);

    const equipChildren = equipmentComp?.children?.[0] ?? [];
    const equipSerial = equipChildren.find((c) => c.label === 'Equipment Serial Tag');
    expect(equipSerial).toBeDefined();
    expect(equipSerial?.pattern).toBe('^EQ-[A-Z0-9]{4}-[0-9]{4}$');

    const equipType = equipChildren.find((c) => c.label === 'Instrument Type Specification');
    expect(equipType).toBeDefined();
    expect(equipType?.defaultWidget).toBe('http://www.w3.org/ns/shacl-ui/DetailsEditor');
    expect(equipType?.orNode).toHaveLength(2);
    expect(equipType?.children).toBeDefined();
    expect(equipType?.children?.length).toBeGreaterThan(0);

    const sensorOptionChildren = equipType?.children?.[0] ?? [];
    const payloadProp = sensorOptionChildren.find((c) => c.label === 'Sensor Measurement Specification');
    expect(payloadProp).toBeDefined();
    expect(payloadProp?.defaultWidget).toBe('http://www.w3.org/ns/shacl-ui/DetailsEditor');
    expect(payloadProp?.children).toBeDefined();
    expect(payloadProp?.children?.length).toBeGreaterThan(0);

    const payloadChildren = payloadProp?.children?.[0] ?? [];
    const measuredParam = payloadChildren.find((c) => c.label === 'Oceanographic Parameter (BODC PUV P01)');
    expect(measuredParam).toBeDefined();
    expect(measuredParam?.defaultWidget).toMatch(/VocabServerEditor/);

    // DOM Verification: check that custom elements and widgets are rendered into DOM
    const vocabBars = el.querySelectorAll('vocab-search-bar');
    expect(vocabBars.length).toBeGreaterThanOrEqual(3); // license, crs, person, affiliation, measuredParam...

    // Verify pattern inputs are rendered
    const orcidInput = el.querySelector('input[pattern="^https://orcid\\\\.org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$"]');
    expect(orcidInput).not.toBeNull();

    const equipInput = el.querySelector('input[pattern="^EQ-[A-Z0-9]{4}-[0-9]{4}$"]');
    expect(equipInput).not.toBeNull();

    el.remove();
  });
});
