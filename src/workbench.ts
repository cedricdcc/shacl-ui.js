import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { turtle } from '@codemirror/legacy-modes/mode/turtle';
import { oneDark } from '@codemirror/theme-one-dark';
import { DataFactory } from 'rdf-data-factory';
// @ts-ignore
import { Validator } from 'shacl-engine';
import { parseRdf } from '../lib/core/rdf.ts';
import { registerVocabServerWidget } from '../lib/shacl-renderer.ts';
import type { ShaclRenderer } from '../lib/shacl-renderer.ts';
import '../lib/shacl-renderer.ts';

// Register the flagship VocabServer custom widget
registerVocabServerWidget();

const df = new DataFactory();

// ---------------------------------------------------------------------------
// Preset Definitions
// ---------------------------------------------------------------------------

interface Preset {
  id: string;
  name: string;
  assetUrl?: string;
  focusNode: string;
  targetShape: string;
  targetClass?: string;
  ttl: string;
}

const PRESETS: Record<string, Preset> = {
  marine: {
    id: 'marine',
    name: 'Marine Scientific Observation (VocabServer)',
    assetUrl: 'assets/marine-observation.ttl',
    focusNode: 'http://example.org/observation/OBS-2026-01',
    targetShape: 'http://example.org/MarineObservationShape',
    targetClass: 'http://example.org/MarineObservation',
    ttl: `@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix shui:   <http://www.w3.org/ns/shacl-ui/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix schema: <http://schema.org/> .
@prefix ex:     <http://example.org/> .

ex:MarineObservationShape
    a sh:NodeShape ;
    sh:targetClass ex:MarineObservation ;
    sh:name "Marine Scientific Observation" ;
    sh:description "Oceanographic observation form featuring the VocabServer custom widget for controlled vocabulary term lookup." ;
    sh:property [
        sh:path schema:name ;
        sh:name "Observation Campaign / Title" ;
        sh:description "Descriptive title of the measurement cruise or station" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path ex:coordinateReferenceSystem ;
        sh:name "Coordinate Reference System (VLIZ DAMS CRS)" ;
        sh:description "Search and select a standardized CRS term from VLIZ VocabServer (WGS84, ETRS89, Belge Lambert, ED50, etc.)" ;
        sh:nodeKind sh:IRI ;
        shui:widget ex:VocabServerEditor ;
        ex:searchEndpoint "https://vocab.vliz.be" ;
        ex:sourceVocabularies "https://my-application.com/vocabulary-alias/vliz-dams-crs" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path schema:dateCreated ;
        sh:name "Date of Observation" ;
        sh:datatype xsd:date ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 3 ;
    ] ;
    sh:property [
        sh:path schema:description ;
        sh:name "Field Notes & Methodology" ;
        sh:datatype xsd:string ;
        sh:singleLine false ;
        sh:order 4 ;
    ] .
`,
  },
  publication: {
    id: 'publication',
    name: 'Scholarly Publication (Rich Metadata)',
    assetUrl: 'assets/publication-shape.ttl',
    focusNode: 'http://example.org/article/1',
    targetShape: 'http://example.org/ScholarlyArticleShape',
    targetClass: 'https://schema.org/ScholarlyArticle',
    ttl: `@prefix dash:   <http://datashapes.org/dash#> .
@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <https://schema.org/> .
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix foaf:   <http://xmlns.com/foaf/0.1/> .
@prefix ex:     <http://example.org/> .
@prefix shui:   <http://www.w3.org/ns/shacl-ui/> .

ex:ScholarlyArticleShape
    a              sh:NodeShape ;
    sh:targetClass schema:ScholarlyArticle ;
    sh:name        "Scholarly Article" ;
    sh:property    [ sh:path     schema:name ;
                     sh:datatype xsd:string ;
                     sh:name     "Article Title" ;
                     sh:minCount 1 ;
                     sh:maxCount 1 ;
                     sh:order    1 ] ;
    sh:property    [ sh:path     schema:abstract ;
                     sh:datatype xsd:string ;
                     sh:name     "Abstract" ;
                     sh:description "Provide a short summary of the publication, describing its main findings." ;
                     sh:singleLine false ;
                     sh:minCount 1 ;
                     sh:order    2 ] ;
    sh:property    [ sh:path     schema:datePublished ;
                     sh:datatype xsd:date ;
                     sh:name     "Date of Publication" ;
                     sh:maxCount 1 ;
                     sh:order    3 ] ;
    sh:property    [ sh:path     schema:license ;
                     sh:nodeKind sh:IRI ;
                     sh:name     "Open Access License" ;
                     sh:description "Creative Commons license URI" ;
                     sh:order    4 ] .
`,
  },
  person: {
    id: 'person',
    name: 'Person Profile (Built-in Form Fields)',
    assetUrl: 'assets/ui-shape.ttl',
    focusNode: 'http://example.org/alice',
    targetShape: 'http://example.org/PersonShape',
    targetClass: 'http://example.org/Person',
    ttl: `@prefix rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#> .
@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix shui:   <http://www.w3.org/ns/shacl-ui/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix foaf:   <http://xmlns.com/foaf/0.1/> .
@prefix schema: <http://schema.org/> .
@prefix ex:     <http://example.org/> .

ex:PersonShape
    a sh:NodeShape ;
    sh:targetClass ex:Person ;
    sh:name "Person Profile" ;
    sh:property [
        sh:path foaf:name ;
        sh:name "Full Name" ;
        sh:description "The full legal name of the person." ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path foaf:age ;
        sh:name "Age in Years" ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
        sh:maxInclusive 130 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path schema:birthDate ;
        sh:name "Date of Birth" ;
        sh:datatype xsd:date ;
        sh:maxCount 1 ;
        sh:order 3 ;
    ] ;
    sh:property [
        sh:path ex:isVegetarian ;
        sh:name "Dietary Preference: Vegetarian" ;
        sh:datatype xsd:boolean ;
        sh:maxCount 1 ;
        sh:order 4 ;
    ] .
`,
  },
  custom: {
    id: 'custom',
    name: 'Custom Blank Shape',
    focusNode: 'http://example.org/resource/1',
    targetShape: 'http://example.org/CustomShape',
    targetClass: 'http://example.org/CustomClass',
    ttl: `@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix shui:   <http://www.w3.org/ns/shacl-ui/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix schema: <http://schema.org/> .
@prefix ex:     <http://example.org/> .

ex:CustomShape
    a sh:NodeShape ;
    sh:targetClass ex:CustomClass ;
    sh:name "Custom Entity Form" ;
    sh:description "Define your custom SHACL shape constraints here." ;
    sh:property [
        sh:path schema:name ;
        sh:name "Title / Label" ;
        sh:description "Primary human-readable label" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path schema:description ;
        sh:name "Description / Notes" ;
        sh:datatype xsd:string ;
        sh:singleLine false ;
        sh:order 2 ;
    ] .
`,
  },
};

// ---------------------------------------------------------------------------
// Global Application State
// ---------------------------------------------------------------------------

let currentTheme: 'dark' | 'light' = 'dark';
let currentMode: 'edit' | 'view' = 'edit';
let shapeEditor: EditorView;
let outputEditor: EditorView;
let shapeThemeCompartment = new Compartment();
let outputThemeCompartment = new Compartment();
let currentRenderer: ShaclRenderer | null = null;
let debounceSyncTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// DOM Elements
// ---------------------------------------------------------------------------

const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
const shapeSelect = document.getElementById('shape-select') as HTMLSelectElement;
const btnGenerate = document.getElementById('btn-generate') as HTMLButtonElement;
const btnReRender = document.getElementById('btn-re-render') as HTMLButtonElement;
const btnModeEdit = document.getElementById('btn-mode-edit') as HTMLButtonElement;
const btnModeView = document.getElementById('btn-mode-view') as HTMLButtonElement;
const btnThemeToggle = document.getElementById('btn-theme-toggle') as HTMLButtonElement;
const themeIconSun = document.getElementById('theme-icon-sun') as SVGElement;
const themeIconMoon = document.getElementById('theme-icon-moon') as SVGElement;
const btnToggleConfig = document.getElementById('btn-toggle-config') as HTMLButtonElement;
const configDrawer = document.getElementById('config-drawer') as HTMLDivElement;
const inputFocusNode = document.getElementById('input-focus-node') as HTMLInputElement;
const inputTargetClass = document.getElementById('input-target-class') as HTMLInputElement;
const shapeEditorHost = document.getElementById('shape-editor-host') as HTMLDivElement;
const outputEditorHost = document.getElementById('output-editor-host') as HTMLDivElement;
const rendererContainer = document.getElementById('renderer-container') as HTMLDivElement;
const shapeStatusDot = document.getElementById('shape-status-dot') as HTMLSpanElement;
const shapeStatusText = document.getElementById('shape-status-text') as HTMLSpanElement;
const currentFocusNodeDisplay = document.getElementById('current-focus-node-display') as HTMLElement;
const conformanceBanner = document.getElementById('conformance-banner') as HTMLDivElement;
const conformanceTitle = document.getElementById('conformance-title') as HTMLElement;
const conformanceSubtitle = document.getElementById('conformance-subtitle') as HTMLElement;
const violationsDrawer = document.getElementById('violations-drawer') as HTMLDivElement;
const violationsList = document.getElementById('violations-list') as HTMLUListElement;
const outputTriplesCount = document.getElementById('output-triples-count') as HTMLElement;
const outputByteSize = document.getElementById('output-byte-size') as HTMLElement;
const outputSyncStatus = document.getElementById('output-sync-status') as HTMLElement;
const btnCopyTtl = document.getElementById('btn-copy-ttl') as HTMLButtonElement;
const copyBtnText = document.getElementById('copy-btn-text') as HTMLElement;
const btnDownloadTtl = document.getElementById('btn-download-ttl') as HTMLButtonElement;
const toastContainer = document.getElementById('toast-container') as HTMLDivElement;

// ---------------------------------------------------------------------------
// Notifications & Toast
// ---------------------------------------------------------------------------

function showToast(message: string, durationMs: number = 2200): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

// ---------------------------------------------------------------------------
// Editor Setup
// ---------------------------------------------------------------------------

function initCodeMirrorEditors(): void {
  const turtleLang = StreamLanguage.define(turtle);

  // Shape editor (read-write)
  shapeEditor = new EditorView({
    state: EditorState.create({
      doc: PRESETS.marine.ttl,
      extensions: [
        basicSetup,
        turtleLang,
        shapeThemeCompartment.of(oneDark),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            handleShapeDocChanged();
          }
        }),
      ],
    }),
    parent: shapeEditorHost,
  });

  // Output editor (read-only)
  outputEditor = new EditorView({
    state: EditorState.create({
      doc: '# Waiting for form interaction or generation...',
      extensions: [
        basicSetup,
        turtleLang,
        EditorState.readOnly.of(true),
        outputThemeCompartment.of(oneDark),
      ],
    }),
    parent: outputEditorHost,
  });
}

function updateEditorThemes(): void {
  const extension = currentTheme === 'dark' ? oneDark : [];
  shapeEditor.dispatch({
    effects: shapeThemeCompartment.reconfigure(extension),
  });
  outputEditor.dispatch({
    effects: outputThemeCompartment.reconfigure(extension),
  });
}

// ---------------------------------------------------------------------------
// Shape Analysis & NodeShape Detection
// ---------------------------------------------------------------------------

async function handleShapeDocChanged(): Promise<void> {
  const text = shapeEditor.state.doc.toString();
  try {
    const store = await parseRdf(text, 'text/turtle');
    const SH_NODE_SHAPE = df.namedNode('http://www.w3.org/ns/shacl#NodeShape');
    const RDF_TYPE = df.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const quads = store.getQuads(null, RDF_TYPE, SH_NODE_SHAPE);
    const shapeIris = quads.map((q) => q.subject.value);

    // Update NodeShape selector
    const currentVal = shapeSelect.value;
    shapeSelect.innerHTML = '';
    if (shapeIris.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(No NodeShapes detected)';
      shapeSelect.appendChild(opt);
    } else {
      shapeIris.forEach((iri) => {
        const opt = document.createElement('option');
        opt.value = iri;
        opt.textContent = iri.split(/[#/]/).pop() || iri;
        opt.title = iri;
        shapeSelect.appendChild(opt);
      });
      if (shapeIris.includes(currentVal)) {
        shapeSelect.value = currentVal;
      } else {
        shapeSelect.value = shapeIris[0];
      }
    }

    shapeStatusDot.className = 'status-indicator valid';
    shapeStatusText.textContent = `Valid SHACL (${store.getQuads().length} quads, ${shapeIris.length} NodeShapes)`;
  } catch (err) {
    shapeStatusDot.className = 'status-indicator invalid';
    shapeStatusText.textContent = `Syntax Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ---------------------------------------------------------------------------
// Form Generation & shacl-renderer Lifecycle
// ---------------------------------------------------------------------------

async function generateForm(): Promise<void> {
  const shapeTtl = shapeEditor.state.doc.toString();
  const focusNodeIri = inputFocusNode.value.trim() || 'http://example.org/resource/1';
  const targetShapeIri = shapeSelect.value.trim() || undefined;

  currentFocusNodeDisplay.textContent = focusNodeIri;

  // Clear existing renderer
  rendererContainer.innerHTML = '';

  // Instantiate new shacl-renderer
  const renderer = document.createElement('shacl-renderer') as ShaclRenderer;
  renderer.id = 'active-shacl-renderer';
  renderer.useLightDom = true;
  renderer.theme = currentTheme;
  renderer.mode = currentMode;
  renderer.widgetScoringGraphUrl = 'assets/widget-scoring.ttl';
  renderer.shapesGraphContentType = 'text/turtle';
  renderer.shapesGraph = shapeTtl;
  renderer.focusNode = focusNodeIri;
  if (targetShapeIri) {
    renderer.constraintShape = targetShapeIri;
  }

  currentRenderer = renderer;
  rendererContainer.appendChild(renderer);

  // Trigger initial synchronization
  scheduleOutputSync(300);
}

// ---------------------------------------------------------------------------
// Output Synchronization & SHACL Validation
// ---------------------------------------------------------------------------

function scheduleOutputSync(delayMs: number = 180): void {
  outputSyncStatus.textContent = 'Synchronizing...';
  outputSyncStatus.classList.add('pending');

  if (debounceSyncTimer) {
    clearTimeout(debounceSyncTimer);
  }

  debounceSyncTimer = setTimeout(async () => {
    await performOutputSync();
  }, delayMs);
}

async function performOutputSync(): Promise<void> {
  if (!currentRenderer) return;

  try {
    const turtleData = (await currentRenderer.data('text/turtle')) as string;
    const outputDoc = turtleData.trim() || '# Data graph is currently empty.';

    // Update Output CodeMirror view
    outputEditor.dispatch({
      changes: {
        from: 0,
        to: outputEditor.state.doc.length,
        insert: outputDoc,
      },
    });

    // Update stats
    const quads = (await currentRenderer.data()) as any[];
    outputTriplesCount.textContent = `${quads.length} ${quads.length === 1 ? 'triple' : 'triples'}`;
    const bytes = new Blob([outputDoc]).size;
    outputByteSize.textContent = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

    outputSyncStatus.textContent = 'Synchronized';
    outputSyncStatus.classList.remove('pending');

    // Run live SHACL validation
    await runShaclValidation(turtleData);
  } catch (err) {
    console.warn('Workbench: serialization failed', err);
    outputSyncStatus.textContent = 'Sync error';
  }
}

async function runShaclValidation(dataTtl: string): Promise<void> {
  const shapeTtl = shapeEditor.state.doc.toString();

  try {
    const shapesStore = await parseRdf(shapeTtl, 'text/turtle');
    const dataStore = await parseRdf(dataTtl, 'text/turtle');

    const validator = new Validator(shapesStore.asDataset(), { factory: df });
    const report = await validator.validate({ dataset: dataStore.asDataset() });

    if (report.conforms) {
      conformanceBanner.className = 'conformance-banner valid';
      conformanceTitle.textContent = 'SHACL Conformance: Valid';
      conformanceSubtitle.textContent = 'Data conforms to all active shape constraints.';
      violationsDrawer.style.display = 'none';
      violationsList.innerHTML = '';
    } else {
      const results = report.results || [];
      conformanceBanner.className = 'conformance-banner invalid';
      conformanceTitle.textContent = `SHACL Conformance: ${results.length} Violation${results.length === 1 ? '' : 's'}`;
      conformanceSubtitle.textContent = 'Data does not satisfy one or more property constraints:';
      violationsDrawer.style.display = 'block';
      violationsList.innerHTML = '';

      results.forEach((r: any) => {
        const li = document.createElement('li');
        li.className = 'violation-item';

        const pathStr = r.path?.value ? r.path.value.split(/[#/]/).pop() : '(no path)';
        const focusStr = r.focusNode?.value ? r.focusNode.value.split(/[#/]/).pop() : '(no node)';
        const compStr = r.sourceConstraintComponent?.value
          ? r.sourceConstraintComponent.value.split(/[#/]/).pop()
          : 'Constraint';
        const msgStr = r.message?.[0]?.value || `Failed ${compStr}`;

        li.innerHTML = `
          <div class="violation-header">
            <span class="violation-badge">${compStr}</span>
            <span class="violation-path">${pathStr}</span>
            <span class="violation-node">${focusStr}</span>
          </div>
          <div class="violation-message">${msgStr}</div>
        `;
        violationsList.appendChild(li);
      });
    }
  } catch (err) {
    conformanceBanner.className = 'conformance-banner invalid';
    conformanceTitle.textContent = 'SHACL Validation Check Failed';
    conformanceSubtitle.textContent = err instanceof Error ? err.message : String(err);
    violationsDrawer.style.display = 'none';
  }
}

// ---------------------------------------------------------------------------
// Event Listeners & Wire-up
// ---------------------------------------------------------------------------

function setupEventListeners(): void {
  // Populate Presets dropdown
  Object.values(PRESETS).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    presetSelect.appendChild(opt);
  });
  presetSelect.value = 'marine';

  // Preset switch
  presetSelect.addEventListener('change', async () => {
    const preset = PRESETS[presetSelect.value];
    if (!preset) return;

    inputFocusNode.value = preset.focusNode;
    if (preset.targetClass) {
      inputTargetClass.value = preset.targetClass;
    }

    let ttlToLoad = preset.ttl;
    if (preset.assetUrl) {
      try {
        const resp = await fetch(preset.assetUrl);
        if (resp.ok) {
          ttlToLoad = await resp.text();
        }
      } catch {
        // Fall back to preset.ttl
      }
    }

    shapeEditor.dispatch({
      changes: {
        from: 0,
        to: shapeEditor.state.doc.length,
        insert: ttlToLoad,
      },
    });

    await handleShapeDocChanged();
    shapeSelect.value = preset.targetShape;
    await generateForm();
    showToast(`Loaded preset: ${preset.name}`);
  });

  // Target NodeShape selection
  shapeSelect.addEventListener('change', () => {
    generateForm();
  });

  // Primary generate action
  btnGenerate.addEventListener('click', () => {
    generateForm();
    showToast('Form generated from SHACL shape');
  });

  btnReRender.addEventListener('click', () => {
    generateForm();
    showToast('Form refreshed');
  });

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateForm();
      showToast('Form generated (Ctrl+Enter)');
    }
  });

  // Mode toggles
  btnModeEdit.addEventListener('click', () => {
    if (currentMode === 'edit') return;
    currentMode = 'edit';
    btnModeEdit.classList.add('active');
    btnModeView.classList.remove('active');
    if (currentRenderer) {
      currentRenderer.mode = 'edit';
    }
  });

  btnModeView.addEventListener('click', () => {
    if (currentMode === 'view') return;
    currentMode = 'view';
    btnModeView.classList.add('active');
    btnModeEdit.classList.remove('active');
    if (currentRenderer) {
      currentRenderer.mode = 'view';
    }
  });

  // Theme toggle
  btnThemeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = currentTheme;
    if (currentTheme === 'dark') {
      themeIconSun.style.display = 'block';
      themeIconMoon.style.display = 'none';
    } else {
      themeIconSun.style.display = 'none';
      themeIconMoon.style.display = 'block';
    }
    updateEditorThemes();
    if (currentRenderer) {
      currentRenderer.theme = currentTheme;
    }
  });

  // Advanced config drawer toggle
  btnToggleConfig.addEventListener('click', () => {
    configDrawer.classList.toggle('collapsed');
  });

  inputFocusNode.addEventListener('change', () => {
    currentFocusNodeDisplay.textContent = inputFocusNode.value;
    if (currentRenderer) {
      currentRenderer.focusNode = inputFocusNode.value;
      scheduleOutputSync(200);
    }
  });

  // Listen for user changes inside the form viewport
  // Handles standard input/change, VocabServer @selection-changed, and shacl-change
  const handleAnyFormChange = () => {
    scheduleOutputSync(150);
  };

  rendererContainer.addEventListener('input', handleAnyFormChange);
  rendererContainer.addEventListener('change', handleAnyFormChange);
  rendererContainer.addEventListener('selection-changed', handleAnyFormChange);
  rendererContainer.addEventListener('shacl-change', handleAnyFormChange);

  // Copy Turtle Output
  btnCopyTtl.addEventListener('click', async () => {
    const text = outputEditor.state.doc.toString();
    try {
      await navigator.clipboard.writeText(text);
      copyBtnText.textContent = 'Copied!';
      showToast('Turtle output copied to clipboard');
      setTimeout(() => {
        copyBtnText.textContent = 'Copy';
      }, 2000);
    } catch {
      showToast('Could not access clipboard');
    }
  });

  // Download data.ttl
  btnDownloadTtl.addEventListener('click', () => {
    const text = outputEditor.state.doc.toString();
    const blob = new Blob([text], { type: 'text/turtle;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.ttl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded data.ttl');
  });
}

// ---------------------------------------------------------------------------
// Application Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  initCodeMirrorEditors();
  setupEventListeners();
  await handleShapeDocChanged();
  shapeSelect.value = PRESETS.marine.targetShape;
  await generateForm();
}

// Start workbench
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
