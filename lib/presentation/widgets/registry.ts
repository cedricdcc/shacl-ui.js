import type {CustomWidgetDefinition} from "../../types.ts";

const customWidgets = new Map<string, CustomWidgetDefinition>();

/**
 * Registers a custom widget definition.
 * If a widget with the same IRI is already registered, it is overwritten.
 */
export function registerCustomWidget(definition: CustomWidgetDefinition): void {
   if (!definition || !definition.iri) {
      throw new Error("Cannot register custom widget without a valid IRI.");
   }
   customWidgets.set(definition.iri, definition);
}

/**
 * Removes a custom widget registration by its IRI.
 */
export function unregisterCustomWidget(iri: string): void {
   customWidgets.delete(iri);
}

/**
 * Retrieves a custom widget definition by its IRI.
 */
export function getCustomWidget(iri: string): CustomWidgetDefinition | undefined {
   return customWidgets.get(iri);
}

/**
 * Checks whether a custom widget is registered for the given IRI.
 */
export function hasCustomWidget(iri: string): boolean {
   return customWidgets.has(iri);
}

/**
 * Returns an array of all currently registered custom widget definitions.
 */
export function getAllCustomWidgets(): CustomWidgetDefinition[] {
   return Array.from(customWidgets.values());
}

/**
 * Aggregates all non-empty default scoring TTL strings from registered custom widgets.
 */
export function getCustomScoringTtls(): string[] {
   const ttls: string[] = [];
   for (const def of customWidgets.values()) {
      if (def.defaultScoringTtl && def.defaultScoringTtl.trim().length > 0) {
         ttls.push(def.defaultScoringTtl.trim());
      }
   }
   return ttls;
}

/**
 * Clears all registered custom widgets (primarily for testing).
 */
export function clearCustomWidgets(): void {
   customWidgets.clear();
}
