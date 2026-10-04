import type { Term } from '@rdfjs/types';
import type { RdfStore } from 'rdf-stores';
// @ts-ignore
import { Validator } from 'shacl-engine';
import { DataFactory } from 'rdf-data-factory';
import { sh, rdf, rdfs, schema } from './namespaces.ts';

const df = new DataFactory();

export interface DetailedViolation {
  id: string;
  focusNode: string;
  path: string;
  pathName: string;
  constraintComponent: string;
  severity: 'Violation' | 'Warning' | 'Info';
  message: string;
  sourceShape?: string;
  breadcrumb: string[];
  parentFocusNode?: string;
}

export interface DetailedValidationReport {
  conforms: boolean;
  violations: DetailedViolation[];
  violationMap: Map<string, DetailedViolation[]>;
  focusNodeViolationCount: Map<string, number>;
}

export interface ValidationOptions {
  rootFocusNode?: string;
}

function extractFocusNodeString(focusNode: any): string {
  if (!focusNode) return '';
  if (typeof focusNode === 'string') return focusNode;
  if (focusNode.value) return focusNode.value;
  if (Array.isArray(focusNode.values) && focusNode.values.length > 0) return focusNode.values[0];
  if (Array.isArray(focusNode.ptrs) && focusNode.ptrs.length > 0) {
    const ptr = focusNode.ptrs[0];
    if (ptr?.term?.value) return ptr.term.value;
    if (ptr?.value) return ptr.value;
  }
  if (Array.isArray(focusNode.terms) && focusNode.terms.length > 0) {
    return focusNode.terms[0].value;
  }
  return String(focusNode);
}

function extractPredicateFromPath(pathObj: any): string {
  if (!pathObj) return '';
  if (typeof pathObj === 'string') return pathObj;
  if (pathObj.value) return pathObj.value;

  if (Array.isArray(pathObj)) {
    for (const item of pathObj) {
      if (item?.predicates && Array.isArray(item.predicates) && item.predicates.length > 0) {
        const pred = item.predicates[0];
        if (pred?.value) return pred.value;
      }
      if (item?.pred?.value) return item.pred.value;
      if (item?.value) return item.value;
    }
  }

  if (pathObj.predicates && Array.isArray(pathObj.predicates) && pathObj.predicates.length > 0) {
    const pred = pathObj.predicates[0];
    if (pred?.value) return pred.value;
  }

  return '';
}

function getLocalName(uri: string): string {
  if (!uri) return '';
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx !== -1 && hashIdx < uri.length - 1) return uri.substring(hashIdx + 1);
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx !== -1 && slashIdx < uri.length - 1) return uri.substring(slashIdx + 1);
  return uri;
}

function resolveShapeLabel(shapeNode: any, shapesStore: RdfStore): string {
  if (!shapeNode) return '';
  let term: Term | null = null;
  if (shapeNode.termType) {
    term = shapeNode as Term;
  } else if (Array.isArray(shapeNode.ptrs) && shapeNode.ptrs.length > 0) {
    term = shapeNode.ptrs[0].term || shapeNode.ptrs[0];
  } else if (typeof shapeNode === 'string') {
    term = df.namedNode(shapeNode);
  }

  if (term) {
    const nameQuads = [
      ...shapesStore.getQuads(term as any, df.namedNode(sh('name')), null, null),
      ...shapesStore.getQuads(term as any, df.namedNode(rdfs('label')), null, null),
      ...shapesStore.getQuads(term as any, df.namedNode(schema('name')), null, null),
    ];
    if (nameQuads.length > 0 && nameQuads[0].object?.value) {
      return nameQuads[0].object.value;
    }
    if (term.termType === 'NamedNode') {
      return getLocalName(term.value);
    }
  }
  return '';
}

function resolveSeverity(severityTerm: any): 'Violation' | 'Warning' | 'Info' {
  const val = severityTerm?.value || '';
  if (val.endsWith('Warning')) return 'Warning';
  if (val.endsWith('Info')) return 'Info';
  return 'Violation';
}

function formatConstraintMessage(
  constraintName: string,
  pathName: string,
  rawMsg?: string
): string {
  if (rawMsg && !rawMsg.startsWith('Value does not have shape') && !rawMsg.startsWith('Failed ')) {
    return rawMsg;
  }

  switch (constraintName) {
    case 'MinCountConstraintComponent':
      return `${pathName || 'Field'} is required (at least 1 value)`;
    case 'MaxCountConstraintComponent':
      return `${pathName || 'Field'} exceeds maximum allowed count`;
    case 'PatternConstraintComponent':
      return `${pathName || 'Field'} does not match required pattern`;
    case 'MinInclusiveConstraintComponent':
      return `${pathName || 'Field'} must be greater than or equal to minimum`;
    case 'MaxInclusiveConstraintComponent':
      return `${pathName || 'Field'} must be less than or equal to maximum`;
    case 'DatatypeConstraintComponent':
      return `${pathName || 'Field'} has an invalid datatype`;
    case 'InConstraintComponent':
      return `${pathName || 'Field'} value is not in permitted list`;
    default:
      return rawMsg || `Failed ${constraintName || 'constraint'}`;
  }
}

function processViolationResult(
  result: any,
  shapesStore: RdfStore,
  breadcrumbs: string[],
  parentFocusNode: string | undefined,
  ancestorFocusNodes: string[],
  violations: DetailedViolation[],
  violationMap: Map<string, DetailedViolation[]>,
  focusNodeViolationCount: Map<string, number>
) {
  const constraintComp = result.constraintComponent?.value || '';
  const isNodeConstraint = constraintComp.endsWith('NodeConstraintComponent');
  const hasSubResults = Array.isArray(result.results) && result.results.length > 0;

  if (isNodeConstraint && hasSubResults) {
    // Unpack nested shape violation
    const pathIri = extractPredicateFromPath(result.path) || extractPredicateFromPath(result.shape?.path);
    let stepLabel = '';
    if (result.shape?.ptr) {
      stepLabel = resolveShapeLabel(result.shape.ptr, shapesStore);
    }
    if (!stepLabel && pathIri) {
      stepLabel = getLocalName(pathIri);
    }
    if (!stepLabel && result.args?.node) {
      stepLabel = resolveShapeLabel(result.args.node, shapesStore) || getLocalName(result.args.node.value);
    }
    if (!stepLabel) {
      stepLabel = 'Nested Item';
    }

    const currentFocus = extractFocusNodeString(result.focusNode);
    const nextAncestors = currentFocus ? [...ancestorFocusNodes, currentFocus] : ancestorFocusNodes;
    const nextBreadcrumbs = [...breadcrumbs, stepLabel];

    for (const sub of result.results) {
      processViolationResult(
        sub,
        shapesStore,
        nextBreadcrumbs,
        currentFocus || parentFocusNode,
        nextAncestors,
        violations,
        violationMap,
        focusNodeViolationCount
      );
    }
  } else {
    // Leaf violation
    const focusNodeStr = extractFocusNodeString(result.focusNode);
    const pathIri = extractPredicateFromPath(result.path) || extractPredicateFromPath(result.shape?.path);
    const constraintName = getLocalName(constraintComp) || 'Constraint';
    const rawMessage = Array.isArray(result.message) ? result.message[0]?.value : result.message?.value;

    let pathName = '';
    if (result.shape?.ptr) {
      pathName = resolveShapeLabel(result.shape.ptr, shapesStore);
    }
    if (!pathName && pathIri) {
      pathName = getLocalName(pathIri);
    }

    const message = formatConstraintMessage(constraintName, pathName, rawMessage);
    const fullBreadcrumbs = pathName ? [...breadcrumbs, pathName] : breadcrumbs;
    const id = `v-${focusNodeStr}-${pathIri || 'nopath'}-${constraintName}`;

    const violation: DetailedViolation = {
      id,
      focusNode: focusNodeStr,
      path: pathIri,
      pathName: pathName || pathIri,
      constraintComponent: constraintName,
      severity: resolveSeverity(result.severity),
      message,
      sourceShape: result.shape?.ptr?.value || undefined,
      breadcrumb: fullBreadcrumbs,
      parentFocusNode,
    };

    violations.push(violation);

    // Populate violationMap
    const mapKey = `${focusNodeStr}#${pathIri}`;
    const existing = violationMap.get(mapKey);
    if (existing) {
      existing.push(violation);
    } else {
      violationMap.set(mapKey, [violation]);
    }

    // Increment focusNodeViolationCount for this node and all ancestors
    if (focusNodeStr) {
      focusNodeViolationCount.set(focusNodeStr, (focusNodeViolationCount.get(focusNodeStr) ?? 0) + 1);
    }
    for (const ancestor of ancestorFocusNodes) {
      if (ancestor && ancestor !== focusNodeStr) {
        focusNodeViolationCount.set(ancestor, (focusNodeViolationCount.get(ancestor) ?? 0) + 1);
      }
    }
  }
}

export async function validateDataset(
  shapesStore: RdfStore,
  dataStore: RdfStore,
  _options?: ValidationOptions
): Promise<DetailedValidationReport> {
  const validator = new Validator(shapesStore.asDataset(), { factory: df });
  const report = await validator.validate({ dataset: dataStore.asDataset() });

  const violations: DetailedViolation[] = [];
  const violationMap = new Map<string, DetailedViolation[]>();
  const focusNodeViolationCount = new Map<string, number>();

  if (!report.conforms && report.results) {
    for (const r of report.results) {
      processViolationResult(
        r,
        shapesStore,
        [],
        undefined,
        [],
        violations,
        violationMap,
        focusNodeViolationCount
      );
    }
  }

  return {
    conforms: violations.length === 0,
    violations,
    violationMap,
    focusNodeViolationCount,
  };
}
