import { describe, expect, it } from 'vitest';
import { ShaclRenderer } from '../lib/shacl-renderer.ts';
import { DataFactory } from 'rdf-data-factory';

const df = new DataFactory();

describe('ShaclRenderer Element Validation API', () => {
  const shapesGraph = `
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix ex: <http://example.org/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    ex:PersonShape a sh:NodeShape ;
      sh:targetClass ex:Person ;
      sh:property [
        sh:path ex:name ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:name "Full Name" ;
      ] ;
      sh:property [
        sh:path ex:education ;
        sh:node ex:EducationShape ;
        sh:name "Education" ;
      ] .

    ex:EducationShape a sh:NodeShape ;
      sh:property [
        sh:path ex:degree ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:name "Degree" ;
      ] .
  `;

  const invalidDataGraph = `
    @prefix ex: <http://example.org/> .

    ex:Alice a ex:Person ;
      ex:education [
        a ex:Education
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

  async function createRenderer(data: string = invalidDataGraph): Promise<ShaclRenderer> {
    const el = new ShaclRenderer();
    el.shapesGraph = shapesGraph;
    el.shapesGraphContentType = 'text/turtle';
    el.dataGraph = data;
    el.dataGraphContentType = 'text/turtle';
    el.widgetScoringGraph = scoringGraph;
    el.widgetScoringGraphContentType = 'text/turtle';
    el.focusNode = 'http://example.org/Alice';
    el.constraintShape = 'http://example.org/PersonShape';
    document.body.appendChild(el);
    await waitForReady(el);
    return el;
  }

  it('runs validate(), updates validationReport state, and dispatches shacl-validation event', async () => {
    const el = await createRenderer();

    let eventFired = false;
    let eventDetail: any = null;
    el.addEventListener('shacl-validation', ((e: CustomEvent) => {
      eventFired = true;
      eventDetail = e.detail;
    }) as EventListener);

    expect(el.validationReport).toBeNull();

    const report = await el.validate();

    expect(report).toBeDefined();
    expect(report.conforms).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
    expect(el.validationReport).toBe(report);

    expect(eventFired).toBe(true);
    expect(eventDetail.conforms).toBe(false);
    expect(eventDetail.report).toBe(report);

    document.body.removeChild(el);
  });

  it('auto-expands invalid nested accordion items when autoExpandInvalid is true', async () => {
    const el = await createRenderer();
    el.autoExpandInvalid = true;

    // Find the nested education component
    const eduComp = el.ui.find(c => c.label === 'Education');
    expect(eduComp).toBeDefined();
    const eduUuid = eduComp!.uuid;

    // Item 0 is initially closed if we collapse it explicitly
    el.expandedNestedItems = { [`${eduUuid}-0`]: false };
    expect(el.isNestedItemExpanded(eduUuid, 0, false)).toBe(false);

    await el.validate();

    // After validation, item 0 should be auto-expanded because degree is missing
    expect(el.isNestedItemExpanded(eduUuid, 0, false)).toBe(true);

    document.body.removeChild(el);
  });

  it('clears validation report and fires shacl-validation-cleared event', async () => {
    const el = await createRenderer();
    await el.validate();
    expect(el.validationReport).not.toBeNull();

    let clearedFired = false;
    el.addEventListener('shacl-validation-cleared', () => {
      clearedFired = true;
    });

    el.clearValidation();

    expect(el.validationReport).toBeNull();
    expect(clearedFired).toBe(true);

    document.body.removeChild(el);
  });

  it('supports validate-on="change" debounced live validation', async () => {
    const el = await createRenderer();
    el.validateOn = 'change';
    el.debounceMs = 20;

    let validateCount = 0;
    el.addEventListener('shacl-validation', () => {
      validateCount++;
    });

    // Mutate data
    el.addToDataStore(
      df.namedNode('http://example.org/Alice'),
      { path: 'http://example.org/name', type: 'predicate' },
      df.literal('Alice Wonderland')
    );

    // Should not validate synchronously
    expect(validateCount).toBe(0);

    // Wait for debounce timer
    await new Promise(resolve => setTimeout(resolve, 60));

    expect(validateCount).toBe(1);

    document.body.removeChild(el);
  });
});
