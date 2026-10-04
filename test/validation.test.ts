import { describe, it, expect } from 'vitest';
import { parseRdf } from '../lib/core/rdf.ts';
import { validateDataset, type DetailedValidationReport } from '../lib/core/validation.ts';

describe('Core SHACL Validation Subsystem', () => {
  it('returns conforms: true when data satisfies all shape constraints', async () => {
    const shapesTtl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
          sh:path ex:name ;
          sh:name "Full Name" ;
          sh:minCount 1 ;
          sh:datatype xsd:string ;
        ] .
    `;

    const dataTtl = `
      @prefix ex: <http://example.org/> .

      ex:Alice a ex:Person ;
        ex:name "Alice Smith" .
    `;

    const shapesStore = await parseRdf(shapesTtl, 'text/turtle');
    const dataStore = await parseRdf(dataTtl, 'text/turtle');

    const report: DetailedValidationReport = await validateDataset(shapesStore, dataStore);
    expect(report.conforms).toBe(true);
    expect(report.violations).toHaveLength(0);
    expect(report.violationMap.size).toBe(0);
  });

  it('reports direct root-level violations with path, focusNode, and friendly message', async () => {
    const shapesTtl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:property [
          sh:path ex:age ;
          sh:name "Age" ;
          sh:datatype xsd:integer ;
          sh:minInclusive 18 ;
        ] ;
        sh:property [
          sh:path ex:code ;
          sh:name "User Code" ;
          sh:pattern "^USER-[0-9]+$" ;
        ] .
    `;

    const dataTtl = `
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:Bob a ex:Person ;
        ex:age 15 ;
        ex:code "INVALID-CODE" .
    `;

    const shapesStore = await parseRdf(shapesTtl, 'text/turtle');
    const dataStore = await parseRdf(dataTtl, 'text/turtle');

    const report = await validateDataset(shapesStore, dataStore);
    expect(report.conforms).toBe(false);
    expect(report.violations.length).toBeGreaterThanOrEqual(2);

    const ageViolations = report.violationMap.get('http://example.org/Bob#http://example.org/age');
    expect(ageViolations).toBeDefined();
    expect(ageViolations![0].constraintComponent).toContain('MinInclusiveConstraintComponent');
    expect(ageViolations![0].pathName).toBe('Age');

    const codeViolations = report.violationMap.get('http://example.org/Bob#http://example.org/code');
    expect(codeViolations).toBeDefined();
    expect(codeViolations![0].constraintComponent).toContain('PatternConstraintComponent');
  });

  it('unpacks nested sh:node shape violations with detailed breadcrumbs and exact child focus nodes', async () => {
    const shapesTtl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:PersonShape a sh:NodeShape ;
        sh:targetClass ex:Person ;
        sh:name "Person Profile" ;
        sh:property [
          sh:path ex:address ;
          sh:name "Address" ;
          sh:node ex:AddressShape ;
        ] .

      ex:AddressShape a sh:NodeShape ;
        sh:name "Postal Address" ;
        sh:property [
          sh:path ex:city ;
          sh:name "City" ;
          sh:minCount 1 ;
          sh:datatype xsd:string ;
        ] ;
        sh:property [
          sh:path ex:postalCode ;
          sh:name "Postal Code" ;
          sh:pattern "^[0-9]{4,5}$" ;
        ] .
    `;

    const dataTtl = `
      @prefix ex: <http://example.org/> .

      ex:Charlie a ex:Person ;
        ex:address [
          ex:postalCode "ABC"
          # missing ex:city!
        ] .
    `;

    const shapesStore = await parseRdf(shapesTtl, 'text/turtle');
    const dataStore = await parseRdf(dataTtl, 'text/turtle');

    const report = await validateDataset(shapesStore, dataStore);
    expect(report.conforms).toBe(false);

    // Should NOT merely be a single top-level "Value does not have shape AddressShape" violation.
    // It should have unpacked the leaf violations!
    const leafCity = report.violations.find(v => v.path === 'http://example.org/city');
    expect(leafCity).toBeDefined();
    expect(leafCity!.constraintComponent).toContain('MinCountConstraintComponent');
    expect(leafCity!.breadcrumb).toEqual(['Address', 'City']);

    const leafPostal = report.violations.find(v => v.path === 'http://example.org/postalCode');
    expect(leafPostal).toBeDefined();
    expect(leafPostal!.constraintComponent).toContain('PatternConstraintComponent');
    expect(leafPostal!.breadcrumb).toEqual(['Address', 'Postal Code']);

    // Check focusNodeViolationCount on the child blank node
    const childFocusNode = leafCity!.focusNode;
    expect(childFocusNode).toBeDefined();
    expect(report.focusNodeViolationCount.get(childFocusNode)).toBe(2);

    // Parent focus node should also aggregate child violation count
    expect(report.focusNodeViolationCount.get('http://example.org/Charlie')).toBe(2);
  });

  it('handles multi-level nested structures (depth 2+)', async () => {
    const shapesTtl = `
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix ex: <http://example.org/> .
      @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

      ex:CompanyShape a sh:NodeShape ;
        sh:targetClass ex:Company ;
        sh:property [
          sh:path ex:department ;
          sh:name "Department" ;
          sh:node ex:DepartmentShape ;
        ] .

      ex:DepartmentShape a sh:NodeShape ;
        sh:property [
          sh:path ex:team ;
          sh:name "Team" ;
          sh:node ex:TeamShape ;
        ] .

      ex:TeamShape a sh:NodeShape ;
        sh:property [
          sh:path ex:lead ;
          sh:name "Team Lead" ;
          sh:minCount 1 ;
        ] .
    `;

    const dataTtl = `
      @prefix ex: <http://example.org/> .

      ex:Acme a ex:Company ;
        ex:department [
          ex:team [
            # missing ex:lead
          ]
        ] .
    `;

    const shapesStore = await parseRdf(shapesTtl, 'text/turtle');
    const dataStore = await parseRdf(dataTtl, 'text/turtle');

    const report = await validateDataset(shapesStore, dataStore);
    expect(report.conforms).toBe(false);

    const leadViolation = report.violations.find(v => v.path === 'http://example.org/lead');
    expect(leadViolation).toBeDefined();
    expect(leadViolation!.breadcrumb).toEqual(['Department', 'Team', 'Team Lead']);
  });
});
