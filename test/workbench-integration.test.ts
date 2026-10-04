import { describe, expect, it } from 'vitest';
import { ShaclRenderer } from '../lib/shacl-renderer.ts';
import type { DetailedValidationReport } from '../lib/core/validation.ts';
import { DataFactory } from 'rdf-data-factory';

const df = new DataFactory();

describe('Workbench Validation & Jump-to-Field Flow', () => {
  const shapesGraph = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix ex: <http://example.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    ex:CruiseExpeditionShape a sh:NodeShape ;
      sh:targetClass ex:OceanographicCruise ;
      sh:property [
        sh:path ex:cruiseCode ;
        sh:name "Cruise Expedition Code" ;
        sh:datatype xsd:string ;
        sh:pattern "^CRUISE-[0-9]{4}-[A-Z0-9]+$" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
      ] ;
      sh:property [
        sh:path ex:onboardPersonnel ;
        sh:name "Onboard Personnel" ;
        sh:node ex:PersonnelShape ;
        sh:minCount 1 ;
      ] .

    ex:PersonnelShape a sh:NodeShape ;
      sh:property [
        sh:path ex:scientistName ;
        sh:name "Scientist Name" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
      ] .
  `;

  const invalidDataGraph = `
    @prefix ex: <http://example.org/> .

    ex:Cruise2026 a ex:OceanographicCruise ;
      ex:cruiseCode "INVALID_CODE" ;
      ex:onboardPersonnel [
        a ex:Personnel
      ] .
  `;

  const scoringGraph = `
    @prefix shui: <http://www.w3.org/ns/shacl-ui/> .
    @prefix ex: <http://example.org/> .
    ex:tf a shui:WidgetScore ; shui:widget shui:TextFieldEditor ; shui:score 5 .
    ex:de a shui:WidgetScore ; shui:widget shui:DetailsEditor ; shui:score 5 .
  `;

  async function waitForReady(el: ShaclRenderer, timeoutMs = 3000) {
    const start = Date.now();
    while (el.loading && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 10));
    }
    await el.updateComplete;
  }

  it('runs complete validation flow, unpacks nested violations, and auto-expands nested cards', async () => {
    const el = new ShaclRenderer();
    el.shapesGraph = shapesGraph;
    el.shapesGraphContentType = 'text/turtle';
    el.dataGraph = invalidDataGraph;
    el.dataGraphContentType = 'text/turtle';
    el.widgetScoringGraph = scoringGraph;
    el.widgetScoringGraphContentType = 'text/turtle';
    el.focusNode = 'http://example.org/Cruise2026';
    el.constraintShape = 'http://example.org/CruiseExpeditionShape';
    el.autoExpandInvalid = true;

    document.body.appendChild(el);
    await waitForReady(el);

    // Initial state: no validation run yet
    expect(el.validationReport).toBeNull();

    // Trigger validation
    const report = await el.validate();
    expect(report.conforms).toBe(false);
    expect(report.violations.length).toBe(2);

    // Violation 1: PatternConstraintComponent on cruiseCode
    const vPattern = report.violations.find(v => v.constraintComponent === 'PatternConstraintComponent');
    expect(vPattern).toBeDefined();
    expect(vPattern?.pathName).toBe('Cruise Expedition Code');
    expect(vPattern?.breadcrumb).toEqual(['Cruise Expedition Code']);

    // Violation 2: Nested violation on scientistName inside PersonnelShape
    const vNested = report.violations.find(v => v.pathName === 'Scientist Name');
    expect(vNested).toBeDefined();
    expect(vNested?.pathName).toBe('Scientist Name');
    expect(vNested?.breadcrumb).toEqual(['Onboard Personnel', 'Scientist Name']);

    // Check that nested accordion was auto-expanded
    const personnelComp = el.ui.find(c => c.label === 'Onboard Personnel');
    expect(personnelComp).toBeDefined();
    expect(el.isNestedItemExpanded(personnelComp!.uuid, 0, false)).toBe(true);

    document.body.removeChild(el);
  });
});
