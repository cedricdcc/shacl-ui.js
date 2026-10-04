import '../lib/core/ensure-process.ts';
import { basicSetup, EditorView } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { turtle } from '@codemirror/legacy-modes/mode/turtle';
import { oneDark } from '@codemirror/theme-one-dark';
import { DataFactory } from 'rdf-data-factory';
import { parseRdf } from '../lib/core/rdf.ts';
import { type DetailedValidationReport, type DetailedViolation } from '../lib/core/validation.ts';
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
  cruise: {
    id: 'cruise',
    name: 'Oceanographic Cruise (Double-Nested, Regex & VocabServer)',
    assetUrl: 'assets/cruise-expedition.ttl',
    focusNode: 'http://example.org/cruise/2026-NORTHSEA',
    targetShape: 'http://example.org/CruiseExpeditionShape',
    targetClass: 'http://example.org/OceanographicCruise',
    ttl: `@prefix sh:     <http://www.w3.org/ns/shacl#> .
@prefix shui:   <http://www.w3.org/ns/shacl-ui/> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
@prefix schema: <http://schema.org/> .
@prefix ex:     <http://example.org/> .

ex:CruiseExpeditionShape
    a sh:NodeShape ;
    sh:targetClass ex:OceanographicCruise ;
    sh:name "Oceanographic Research Cruise Expedition" ;
    sh:description "Multi-tier marine expedition metadata form demonstrating double-nested shapes, sh:pattern regex validation, sh:or variant switching, and live VLIZ VocabServer integrations." ;
    sh:property [
        sh:path ex:cruiseCode ;
        sh:name "Cruise Expedition Code" ;
        sh:description "Official expedition identifier (Format: CRUISE-YYYY-NAME, e.g. CRUISE-2026-NORTHSEA1)" ;
        sh:datatype xsd:string ;
        sh:pattern "^CRUISE-[0-9]{4}-[A-Z0-9]+$" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path schema:name ;
        sh:name "Expedition Campaign Title" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path schema:startDate ;
        sh:name "Departure Date" ;
        sh:datatype xsd:date ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 3 ;
    ] ;
    sh:property [
        sh:path schema:endDate ;
        sh:name "Return Date" ;
        sh:datatype xsd:date ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 4 ;
    ] ;
    sh:property [
        sh:path schema:license ;
        sh:name "Open Data License" ;
        sh:description "Select open data license from VLIZ VocabServer" ;
        sh:nodeKind sh:IRI ;
        shui:editor ex:VocabServerEditor ;
        shui:widget ex:VocabServerEditor ;
        ex:searchEndpoint "https://vocab.vliz.be" ;
        ex:sourceVocabularies "https://my-application.com/vocabulary-alias/vliz-dams-licenses" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 5 ;
    ] ;
    sh:property [
        sh:path ex:coordinateReferenceSystem ;
        sh:name "Navigation CRS (Spatial Reference)" ;
        sh:description "Select coordinate reference system from VLIZ VocabServer" ;
        sh:nodeKind sh:IRI ;
        shui:editor ex:VocabServerEditor ;
        shui:widget ex:VocabServerEditor ;
        ex:searchEndpoint "https://vocab.vliz.be" ;
        ex:sourceVocabularies "https://my-application.com/vocabulary-alias/vliz-dams-crs" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 6 ;
    ] ;
    sh:property [
        sh:path ex:onboardPersonnel ;
        sh:name "Onboard Personnel and Scientific Team" ;
        sh:description "Expedition participants, their institute affiliations, and specific role credentials." ;
        shui:editor shui:DetailsEditor ;
        shui:widget shui:DetailsEditor ;
        sh:node ex:OnboardPersonnelShape ;
        sh:minCount 1 ;
        sh:order 7 ;
    ] ;
    sh:property [
        sh:path ex:deployedEquipment ;
        sh:name "Deployed Equipment and Instrumentation" ;
        sh:description "Instruments deployed during cruise with calibration specs or sampling procedures." ;
        shui:editor shui:DetailsEditor ;
        shui:widget shui:DetailsEditor ;
        sh:node ex:EquipmentDeploymentShape ;
        sh:minCount 1 ;
        sh:order 8 ;
    ] .

ex:OnboardPersonnelShape
    a sh:NodeShape ;
    sh:name "Expedition Participant" ;
    sh:property [
        sh:path schema:person ;
        sh:name "Person (MarineInfo Registry)" ;
        sh:description "Search registered marine scientists and personnel from VLIZ MarineInfo" ;
        sh:nodeKind sh:IRI ;
        shui:editor ex:VocabServerEditor ;
        shui:widget ex:VocabServerEditor ;
        ex:searchEndpoint "https://vocab.vliz.be" ;
        ex:sourceVocabularies "https://my-application.com/vocabulary-alias/marineinfo-persons" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path schema:affiliation ;
        sh:name "Home Institution / Affiliation" ;
        sh:description "Search registered research organizations and institutes from VLIZ MarineInfo" ;
        sh:nodeKind sh:IRI ;
        shui:editor ex:VocabServerEditor ;
        shui:widget ex:VocabServerEditor ;
        ex:searchEndpoint "https://vocab.vliz.be" ;
        ex:sourceVocabularies "https://my-application.com/vocabulary-alias/marineinfo-institutes" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path ex:roleSpecification ;
        sh:name "Participant Category and Role" ;
        shui:editor shui:DetailsEditor ;
        shui:widget shui:DetailsEditor ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 3 ;
        sh:or (
            [ sh:node ex:ScientistRoleShape ; sh:name "Scientific Researcher" ]
            [ sh:node ex:CrewRoleShape ; sh:name "Ship Crew / Maritime Officer" ]
        ) ;
    ] .

ex:ScientistRoleShape
    a sh:NodeShape ;
    sh:name "Scientific Researcher" ;
    sh:property [
        sh:path ex:orcid ;
        sh:name "ORCID Identifier" ;
        sh:description "Standard ORCID URI (e.g. https://orcid.org/0000-0002-1825-0097)" ;
        sh:datatype xsd:string ;
        sh:pattern "^https://orcid\\\\.org/[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path ex:scientificRank ;
        sh:name "Expedition Science Role" ;
        sh:in ( "Chief Scientist" "Principal Investigator" "Postdoctoral Researcher" "PhD Candidate" "Marine Laboratory Technician" ) ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path ex:workPackage ;
        sh:name "Work Package / Research Topic" ;
        sh:datatype xsd:string ;
        sh:order 3 ;
    ] .

ex:CrewRoleShape
    a sh:NodeShape ;
    sh:name "Ship Crew / Maritime Officer" ;
    sh:property [
        sh:path ex:stcwCertificate ;
        sh:name "STCW Seafarer Certificate ID" ;
        sh:description "IMO STCW Maritime qualification code (Format: STCW-CC-123456, e.g. STCW-BE-102948)" ;
        sh:datatype xsd:string ;
        sh:pattern "^STCW-[A-Z]{2}-[0-9]{6}$" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path ex:maritimeRank ;
        sh:name "Maritime Rank" ;
        sh:in ( "Captain / Master" "Chief Mate" "Second Officer" "Chief Engineer" "Bosun" "Deck Rating" ) ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path ex:watchSchedule ;
        sh:name "Assigned Watch Schedule" ;
        sh:datatype xsd:string ;
        sh:order 3 ;
    ] .

ex:EquipmentDeploymentShape
    a sh:NodeShape ;
    sh:name "Equipment Deployment" ;
    sh:property [
        sh:path schema:identifier ;
        sh:name "Equipment Serial Tag" ;
        sh:description "Hardware inventory code (Format: EQ-XXXX-1234, e.g. EQ-CTD1-2026)" ;
        sh:datatype xsd:string ;
        sh:pattern "^EQ-[A-Z0-9]{4}-[0-9]{4}$" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path schema:name ;
        sh:name "Instrument Model / Tag" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path ex:instrumentType ;
        sh:name "Instrument Type Specification" ;
        shui:editor shui:DetailsEditor ;
        shui:widget shui:DetailsEditor ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 3 ;
        sh:or (
            [ sh:node ex:InSituSensorShape ; sh:name "In-Situ Continuous Sensor" ]
            [ sh:node ex:WaterSedimentSamplerShape ; sh:name "Autonomous Discrete Sampler" ]
        ) ;
    ] .

ex:InSituSensorShape
    a sh:NodeShape ;
    sh:name "In-Situ Continuous Sensor" ;
    sh:property [
        sh:path ex:sensorPayload ;
        sh:name "Sensor Measurement Specification" ;
        shui:editor shui:DetailsEditor ;
        shui:widget shui:DetailsEditor ;
        sh:node ex:SensorPayloadMeasurementShape ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] .

ex:SensorPayloadMeasurementShape
    a sh:NodeShape ;
    sh:name "Measured Parameter and Calibration" ;
    sh:property [
        sh:path ex:measuredParameter ;
        sh:name "Oceanographic Parameter (BODC PUV P01)" ;
        sh:description "Search standardized parameter terms from BODC Parameter Usage Vocabulary (P01)" ;
        sh:nodeKind sh:IRI ;
        shui:editor ex:VocabServerEditor ;
        shui:widget ex:VocabServerEditor ;
        ex:searchEndpoint "https://vocab.vliz.be" ;
        ex:sourceVocabularies "https://my-application.com/vocabulary-alias/P01" ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path ex:calibrationDate ;
        sh:name "Latest Calibration Date" ;
        sh:datatype xsd:date ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path ex:samplingFrequencyHz ;
        sh:name "Sampling Frequency (Hz)" ;
        sh:datatype xsd:decimal ;
        sh:minInclusive 0.1 ;
        sh:maxInclusive 100.0 ;
        sh:order 3 ;
    ] ;
    sh:property [
        sh:path ex:maxOperatingDepthM ;
        sh:name "Maximum Operating Depth (meters)" ;
        sh:datatype xsd:integer ;
        sh:minInclusive 0 ;
        sh:maxInclusive 11000 ;
        sh:order 4 ;
    ] .

ex:WaterSedimentSamplerShape
    a sh:NodeShape ;
    sh:name "Autonomous Discrete Sampler" ;
    sh:property [
        sh:path ex:samplingProcedure ;
        sh:name "Sampling Protocol and Specifications" ;
        shui:editor shui:DetailsEditor ;
        shui:widget shui:DetailsEditor ;
        sh:node ex:SamplerSpecificationShape ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:order 1 ;
    ] .

ex:SamplerSpecificationShape
    a sh:NodeShape ;
    sh:name "Sampler Specifications" ;
    sh:property [
        sh:path ex:bottleCapacityL ;
        sh:name "Chamber Capacity (Liters)" ;
        sh:datatype xsd:decimal ;
        sh:minInclusive 0.5 ;
        sh:maxInclusive 50.0 ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path ex:targetSubstrate ;
        sh:name "Target Marine Substrate" ;
        sh:in ( "Surface Seawater" "Deep Bathypelagic Seawater" "Benthic Sediment Core" "Suspended Particulate Matter" ) ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path schema:description ;
        sh:name "Sample Preservation Protocol" ;
        sh:datatype xsd:string ;
        sh:singleLine false ;
        sh:order 3 ;
    ] .
`,
  },
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
const btnValidateForm = document.getElementById('btn-validate-form') as HTMLButtonElement;
const selectValidateOn = document.getElementById('select-validate-on') as HTMLSelectElement;
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
      doc: PRESETS.cruise.ttl,
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
  const targetClassIri = inputTargetClass.value.trim();
  renderer.dataGraphContentType = 'text/turtle';
  renderer.dataGraph = targetClassIri
    ? `<${focusNodeIri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <${targetClassIri}> .\n`
    : '';
  renderer.focusNode = focusNodeIri;
  if (targetShapeIri) {
    renderer.constraintShape = targetShapeIri;
  }
  renderer.validateOn = (selectValidateOn?.value as any) || 'manual';
  renderer.autoExpandInvalid = true;

  renderer.addEventListener('shacl-validation', ((e: CustomEvent) => {
    updateConformanceUI(e.detail.report);
  }) as EventListener);

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

    // Run live SHACL validation if validateOn is change/blur or if form already has errors to update
    if (currentRenderer.validateOn !== 'manual' || (currentRenderer.validationReport && !currentRenderer.validationReport.conforms)) {
      await runShaclValidation();
    }
  } catch (err) {
    console.warn('Workbench: serialization failed', err);
    outputSyncStatus.textContent = 'Sync error';
  }
}

async function runShaclValidation(): Promise<void> {
  if (!currentRenderer) return;

  try {
    const report = await currentRenderer.validate();
    updateConformanceUI(report);
  } catch (err) {
    conformanceBanner.className = 'conformance-banner invalid';
    conformanceTitle.textContent = 'SHACL Validation Check Failed';
    conformanceSubtitle.textContent = err instanceof Error ? err.message : String(err);
    violationsDrawer.style.display = 'none';
  }
}

function updateConformanceUI(report: DetailedValidationReport): void {
  if (report.conforms) {
    conformanceBanner.className = 'conformance-banner valid';
    conformanceTitle.textContent = 'SHACL Conformance: Valid';
    conformanceSubtitle.textContent = 'Data conforms to all active shape constraints.';
    violationsDrawer.style.display = 'none';
    violationsList.innerHTML = '';
  } else {
    const violations = report.violations || [];
    conformanceBanner.className = 'conformance-banner invalid';
    conformanceTitle.textContent = `SHACL Conformance: ${violations.length} Violation${violations.length === 1 ? '' : 's'}`;
    conformanceSubtitle.textContent = 'Click any violation below to jump directly to the field:';
    violationsDrawer.style.display = 'block';
    violationsList.innerHTML = '';

    violations.forEach((v) => {
      const li = document.createElement('li');
      li.className = 'violation-item';

      const breadcrumbStr = v.breadcrumb && v.breadcrumb.length > 0
        ? v.breadcrumb.join(' › ')
        : (v.pathName || v.path || 'Field');

      const focusStr = v.focusNode ? v.focusNode.split(/[#/]/).pop() || v.focusNode : '(no node)';
      const compStr = v.constraintComponent.replace('ConstraintComponent', '');

      li.innerHTML = `
        <div class="violation-header">
          <span class="violation-breadcrumb">${breadcrumbStr}</span>
          <span class="violation-badge">${compStr}</span>
          <span class="violation-node">${focusStr}</span>
        </div>
        <div class="violation-message-row">
          <span class="violation-message">${v.message}</span>
          <span class="violation-jump-hint">Jump to field &rarr;</span>
        </div>
      `;

      li.addEventListener('click', () => {
        jumpToViolationField(v);
      });

      violationsList.appendChild(li);
    });
  }
}

function jumpToViolationField(violation: DetailedViolation): void {
  if (!currentRenderer) return;

  // Find the target component and expand parent accordions
  const findAndExpand = (components: any[], targetFocusNode: string, targetPath?: string): any => {
    for (const comp of components) {
      if (comp.focusNode?.value === targetFocusNode && (!targetPath || comp.paths?.some((p: any) => p.path === targetPath || p.path.endsWith(targetPath)))) {
        return comp;
      }
      if (comp.children && comp.children.length > 0) {
        for (let i = 0; i < comp.children.length; i++) {
          const subList = comp.children[i] ?? [];
          const found = findAndExpand(subList, targetFocusNode, targetPath);
          if (found) {
            currentRenderer!.expandNestedItem(comp.uuid, i);
            return found;
          }
        }
      }
    }
    return null;
  };

  const foundComp = findAndExpand(currentRenderer.ui, violation.focusNode, violation.path);

  setTimeout(() => {
    const root = (currentRenderer!.renderRoot || currentRenderer!) as HTMLElement;
    let targetEl: HTMLElement | null = null;

    if (foundComp) {
      // Find element matching uuid
      targetEl = root.querySelector(`[id^="${foundComp.uuid}-"]`) ||
                 root.querySelector(`[id="${foundComp.uuid}"]`) ||
                 root.querySelector(`[class*="${foundComp.uuid}"]`);
    }

    if (!targetEl && violation.focusNode) {
      // Fallback: search for any input with aria-invalid="true" or role="alert"
      targetEl = root.querySelector('[aria-invalid="true"]') ||
                 root.querySelector('[role="alert"]') as HTMLElement | null;
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'SELECT')
        ? targetEl
        : (targetEl.querySelector('input, textarea, select, [tabindex]') as HTMLElement | null);
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
      }

      targetEl.classList.remove('field-highlight-pulse');
      // trigger reflow
      void targetEl.offsetWidth;
      targetEl.classList.add('field-highlight-pulse');

      showToast(`Jumped to: ${violation.pathName || 'field'}`);
    } else {
      showToast(`Field located in form for ${violation.pathName || 'property'}`);
    }
  }, 100);
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
  presetSelect.value = 'cruise';

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

  // Validate Form button
  if (btnValidateForm) {
    btnValidateForm.addEventListener('click', async () => {
      if (!currentRenderer) return;
      const report = await currentRenderer.validate();
      updateConformanceUI(report);
      if (report.conforms) {
        showToast('Validation passed: Form is valid');
      } else {
        showToast(`Validation found ${report.violations.length} error(s)`);
      }
    });
  }

  // Validate On change selector
  if (selectValidateOn) {
    selectValidateOn.addEventListener('change', () => {
      if (currentRenderer) {
        currentRenderer.validateOn = selectValidateOn.value as any;
        showToast(`Validation trigger set to: ${selectValidateOn.value}`);
      }
    });
  }

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
// Interactive 3-Panel Resizing & Focus Mode
// ---------------------------------------------------------------------------

function setupPanelResizing(): void {
  const container = document.getElementById('workbench-panels') as HTMLElement | null;
  const resizerLeft = document.getElementById('resizer-left') as HTMLElement | null;
  const resizerRight = document.getElementById('resizer-right') as HTMLElement | null;
  const btnExpandForm = document.getElementById('btn-expand-form') as HTMLButtonElement | null;
  const textExpandForm = document.getElementById('text-expand-form') as HTMLElement | null;

  if (!container || !resizerLeft || !resizerRight) return;

  const STORAGE_KEY = 'shacl_workbench_panel_widths';

  // Restore saved column template if exists
  const savedTemplate = localStorage.getItem(STORAGE_KEY);
  if (savedTemplate && !window.matchMedia('(max-width: 1100px)').matches) {
    container.style.gridTemplateColumns = savedTemplate;
  }

  function startDragging(e: MouseEvent, isLeft: boolean) {
    e.preventDefault();
    const activeResizer = isLeft ? resizerLeft! : resizerRight!;
    activeResizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const containerRect = container!.getBoundingClientRect();
    const totalWidth = containerRect.width;

    function onMouseMove(moveEvent: MouseEvent) {
      const offsetX = moveEvent.clientX - containerRect.left;
      const computed = window.getComputedStyle(container!).gridTemplateColumns.split(' ');
      if (computed.length < 5) return;

      const w1 = parseFloat(computed[0]);
      const w2 = parseFloat(computed[2]);
      const w3 = parseFloat(computed[4]);

      let newW1 = w1;
      let newW2 = w2;
      let newW3 = w3;
      const minW = 200; // minimum panel width in px

      if (isLeft) {
        newW1 = Math.max(minW, Math.min(offsetX, totalWidth - (w3 + minW + 24)));
        newW2 = Math.max(minW, (w1 + w2) - newW1);
      } else {
        const offsetFromRight = totalWidth - offsetX;
        newW3 = Math.max(minW, Math.min(offsetFromRight, totalWidth - (w1 + minW + 24)));
        newW2 = Math.max(minW, (w2 + w3) - newW3);
      }

      const template = `${newW1}px 8px ${newW2}px 8px ${newW3}px`;
      container!.style.gridTemplateColumns = template;
      localStorage.setItem(STORAGE_KEY, template);
    }

    function onMouseUp() {
      activeResizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  resizerLeft.addEventListener('mousedown', (e) => startDragging(e, true));
  resizerRight.addEventListener('mousedown', (e) => startDragging(e, false));

  // Double click resets to generous default
  const resetLayout = () => {
    container.classList.remove('focus-form');
    container.style.gridTemplateColumns = '';
    localStorage.removeItem(STORAGE_KEY);
    if (textExpandForm) textExpandForm.textContent = 'Focus Form';
    showToast('Layout reset to default');
  };

  resizerLeft.addEventListener('dblclick', resetLayout);
  resizerRight.addEventListener('dblclick', resetLayout);

  // Focus Form Toggle button
  if (btnExpandForm) {
    btnExpandForm.addEventListener('click', () => {
      const isFocused = container.classList.toggle('focus-form');
      if (isFocused) {
        if (textExpandForm) textExpandForm.textContent = 'Restore Grid';
        showToast('Form expanded (Focus Mode)');
      } else {
        if (textExpandForm) textExpandForm.textContent = 'Focus Form';
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          container.style.gridTemplateColumns = saved;
        } else {
          container.style.gridTemplateColumns = '';
        }
        showToast('Restored standard 3-panel view');
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Application Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  initCodeMirrorEditors();
  setupEventListeners();
  setupPanelResizing();
  await handleShapeDocChanged();
  shapeSelect.value = PRESETS.cruise.targetShape;
  await generateForm();
}

// Start workbench
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
