import { registerCustomWidget } from '../../presentation/widgets/registry.ts';
import {
  VOCABSERVER_WIDGET_IRI,
  VOCABSERVER_WIDGET_IRI_ORG,
  VocabServerWidgetDefinition,
  parseVocabServerConfig,
  ensureVocabSearchBarLoaded,
  type VocabServerConfig
} from './component.ts';

export const VOCABSERVER_SCORING_TTL = `@prefix ex:    <http://example.org/> .
@prefix excom: <http://example.com/ns#> .
@prefix sh:    <http://www.w3.org/ns/shacl#> .
@prefix shui:  <http://www.w3.org/ns/shacl-ui/> .

excom:vocabServerScore
    a shui:WidgetScore ;
    shui:widget excom:VocabServerEditor ;
    shui:score 35 ;
    shui:shapesGraphShape [
        a sh:NodeShape ;
        sh:property [
            sh:path excom:searchEndpoint ;
            sh:minCount 1 ;
        ]
    ] .

ex:vocabServerScore
    a shui:WidgetScore ;
    shui:widget ex:VocabServerEditor ;
    shui:score 35 ;
    shui:shapesGraphShape [
        a sh:NodeShape ;
        sh:property [
            sh:path ex:searchEndpoint ;
            sh:minCount 1 ;
        ]
    ] .

ex:vocabServerExplicitWidgetScore
    a shui:WidgetScore ;
    shui:widget ex:VocabServerEditor ;
    shui:score 50 ;
    shui:shapesGraphShape [
        a sh:NodeShape ;
        sh:property [
            sh:path shui:widget ;
            sh:hasValue ex:VocabServerEditor ;
        ]
    ] .

ex:vocabServerExplicitEditorScore
    a shui:WidgetScore ;
    shui:widget ex:VocabServerEditor ;
    shui:score 50 ;
    shui:shapesGraphShape [
        a sh:NodeShape ;
        sh:property [
            sh:path shui:editor ;
            sh:hasValue ex:VocabServerEditor ;
        ]
    ] .
`;

// Attach default scoring TTL
VocabServerWidgetDefinition.defaultScoringTtl = VOCABSERVER_SCORING_TTL;

/**
 * Registers the VocabServer widget under both namespaces (example.com/ns# and example.org).
 */
export function registerVocabServerWidget(): void {
  registerCustomWidget(VocabServerWidgetDefinition);
  registerCustomWidget({
    ...VocabServerWidgetDefinition,
    iri: VOCABSERVER_WIDGET_IRI_ORG,
    defaultScoringTtl: '' // Avoid duplicate TTL aggregation
  });
}

export {
  VOCABSERVER_WIDGET_IRI,
  VOCABSERVER_WIDGET_IRI_ORG,
  VocabServerWidgetDefinition,
  parseVocabServerConfig,
  ensureVocabSearchBarLoaded,
  type VocabServerConfig
};
