// Root dispatch for the widget layer: render slots -> components -> the per-widget switch.
import {html, nothing, type TemplateResult} from "lit";
import {twMerge} from "tailwind-merge";
import type {Term} from "@rdfjs/types";
import {
   type CustomWidgetDefinition,
   type CustomWidgetInstance,
   type CustomWidgetRenderContext,
   type RootRenderSlot,
   type TailwindClasses,
   type UIComponent,
   type UIComponentValue
} from "../../types.ts";
import {shui} from "../../core/namespaces.ts";
import {ShaclRenderer} from "../../shacl-renderer.ts";
import {getCustomWidget, hasCustomWidget} from "./registry.ts";
import {
   renderDescription,
   renderLabel,
   renderOrSelectorForValue,
   renderPlusIcon,
   renderSelectWidgetIcon,
   renderXIcon
} from "./shared.ts";
import {
   renderBlankNodeEditor,
   renderBooleanEditor,
   renderDatePickerEditor,
   renderDateTimePickerEditor,
   renderIRIEditor,
   renderNumberFieldEditor,
   renderTextAreaEditor,
   renderTextAreaWithLangEditor,
   renderTextFieldEditor,
   renderTextFieldWithLangEditor
} from "./editors-fields.ts";
import {
   renderAutoCompleteEditor,
   renderEnumSelectEditor,
   renderInstancesSelectEditor,
   renderSubClassEditor
} from "./editors-select.ts";
import {renderDetailsEditor, renderRichTextEditor} from "./editors-rich-nested.ts";
import {
   renderHTMLViewer,
   renderHyperlinkViewer,
   renderLangStringViewer,
   renderLiteralViewer
} from "./viewers-literal.ts";
import {renderBlankNodeViewer, renderImageViewer, renderIRIViewer, renderLabelViewer} from "./viewers-node.ts";
import {renderDetailsViewer, renderValueTableViewer} from "./viewers-nested.ts";

/**
 * Extracts custom shape annotations (predicates and object values) from a shapesStore
 * for a given shape node. Keys include full IRI and local name/prefixed suffixes.
 */
export function extractShapeAnnotations(shapeNode: any, shapesStore: any): Record<string, string> {
   const annotations: Record<string, string> = {};
   if (!shapeNode || !shapesStore || typeof shapesStore.getQuads !== "function") {
      return annotations;
   }
   const quads = shapesStore.getQuads(shapeNode, null, null, null);
   for (const q of quads) {
      const pred = q.predicate.value;
      const val = q.object.value;
      annotations[pred] = val;
      const localName = pred.split("#").pop()?.split("/").pop();
      if (localName && !annotations[localName]) {
         annotations[localName] = val;
      }
   }
   return annotations;
}

class ShaclCustomWidgetHost extends HTMLElement {
   private _def?: CustomWidgetDefinition;
   private _context?: CustomWidgetRenderContext;
   private _instance?: CustomWidgetInstance;

   set widgetDef(val: CustomWidgetDefinition | undefined) {
      this._def = val;
      this._sync();
   }
   get widgetDef() { return this._def; }

   set context(val: CustomWidgetRenderContext | undefined) {
      this._context = val;
      this._sync();
   }
   get context() { return this._context; }

   connectedCallback() {
      this._sync();
   }

   disconnectedCallback() {
      if (this._instance?.unmount) {
         try { this._instance.unmount(); } catch (e) { console.error(e); }
      }
      this._instance = undefined;
   }

   private _sync() {
      if (!this.isConnected || !this._def?.mount || !this._context) return;
      if (!this._instance) {
         this._instance = this._def.mount({
            ...this._context,
            container: this
         });
      } else if (this._instance.update) {
         this._instance.update({
            ...this._context,
            container: this
         });
      }
   }
}

if (typeof customElements !== "undefined" && !customElements.get("shacl-custom-widget-host")) {
   customElements.define("shacl-custom-widget-host", ShaclCustomWidgetHost);
}

function renderCustomWidgetMount(def: CustomWidgetDefinition, context: CustomWidgetRenderContext): TemplateResult {
   return html`<shacl-custom-widget-host .widgetDef=${def} .context=${context}></shacl-custom-widget-host>`;
}

/**
 * Renders the interleaved list of base `sh:property` components and root-level
 * `sh:or` section cards in the correct `sh:order`-based sequence.
 *
 * Slot kinds:
 *  - `'component'`  – a single ungrouped UIComponent rendered normally.
 *  - `'group'`      – a set of UIComponents sharing a sh:group, rendered as a flex row.
 *  - `'orSection'`  – a root-level sh:or section with an inline variant selector
 *                     followed by the currently selected option's sh:property fields.
 */
export function renderRootSlots(
   renderer: ShaclRenderer,
   renderSlots: RootRenderSlot[],
   classes: TailwindClasses,
   depth: number = 0,
   ancestors: string[] = []
): TemplateResult {
   type Chunk =
      | { kind: 'components'; components: UIComponent[] }
      | { kind: 'group'; slot: RootRenderSlot & { kind: 'group' } }
      | { kind: 'orSection'; slot: RootRenderSlot & { kind: 'orSection' } };

   const chunks: Chunk[] = [];
   for (const slot of renderSlots) {
      if (slot.kind === 'component') {
         const lastChunk = chunks[chunks.length - 1];
         if (lastChunk && lastChunk.kind === 'components') {
            lastChunk.components.push(slot.component);
         } else {
            chunks.push({ kind: 'components', components: [slot.component] });
         }
      } else if (slot.kind === 'group') {
         chunks.push({ kind: 'group', slot });
      } else if (slot.kind === 'orSection') {
         chunks.push({ kind: 'orSection', slot });
      }
   }

   return html`
       ${chunks.map(chunk => {
           if (chunk.kind === 'components') {
               return html`
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7 mb-7">
                       ${chunk.components.map(c => {
                           const isFullWidth = chunk.components.length === 1
                               || c.node != null
                               || c.orNode != null
                               || c.defaultWidget === shui('DetailsEditor')
                               || c.defaultWidget === shui('DetailsViewer')
                               || c.defaultWidget === shui('TextAreaEditor')
                               || c.defaultWidget === shui('RichTextEditor')
                               || c.defaultWidget === shui('ValueTableViewer');
                           return html`
                               <div class="${isFullWidth ? 'col-span-full' : 'col-span-1'}">
                                   ${renderUIComponent(renderer, c, classes, depth, ancestors)}
                               </div>
                           `;
                       })}
                   </div>
               `;
           }

           if (chunk.kind === 'group') {
               const { components } = chunk.slot;
               const group = components[0].group!;
               return html`
                   <div class="${twMerge(classes.groupClass)}">
                       <h2 class="${twMerge(classes.groupLabelClass)}">${group.label}</h2>
                       <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
                           ${components.map(c => {
                               const isFullWidth = components.length === 1
                                   || c.node != null
                                   || c.orNode != null
                                   || c.defaultWidget === shui('DetailsEditor')
                                   || c.defaultWidget === shui('DetailsViewer')
                                   || c.defaultWidget === shui('TextAreaEditor')
                                   || c.defaultWidget === shui('RichTextEditor')
                                   || c.defaultWidget === shui('ValueTableViewer');
                               return html`
                                   <div class="${isFullWidth ? 'col-span-full' : 'col-span-1'}">
                                       ${renderUIComponent(renderer, c, classes, depth, ancestors)}
                                   </div>
                               `;
                           })}
                       </div>
                   </div>
               `;
           }

           // ── orSection ────────────────────────────────────────────────────
           const {section, groupIndex} = chunk.slot;
           const {group} = section;

           if (renderer.mode === 'view' || group.options.length < 2) {
               return section.components.length > 0
                  ? html`<div class="my-7">${renderUIComponents(renderer, section.components, classes, depth, ancestors)}</div>`
                  : nothing;
           }

           const key = group.orListNode.value;
           const open = renderer.rootOrSelectOpen[key] ?? false;
           const selected = group.options[group.selectedIndex];

           return html`
               <div class="flex gap-3 my-7">
                   <!-- Thin left accent bar that visually connects selector + fields -->
                   <div class="w-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-full self-stretch shrink-0"></div>

                   <div class="flex-1 min-w-0">
                       <!-- Inline variant selector – intentionally small and unobtrusive -->
                       <div class="relative mb-3">
                           <button class="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                                   @click="${() => renderer.setRootOrSelectOpen(key, !open)}">
                               <span class="font-medium">
                                   ${selected?.label ?? `Option ${group.selectedIndex + 1}`}
                               </span>
                               <svg class="w-3.5 h-3.5 opacity-60"
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2.5">
                                   <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                               </svg>
                           </button>

                           <!-- Dropdown (description shown here only, not below the trigger) -->
                           ${open ? html`
                               <ul class="${twMerge(classes.orSelectorDropdownClass, 'absolute z-50 min-w-48 mt-1')}">
                                   ${group.options.map((option, optionIndex) => html`
                                       <li class="${twMerge(
                                               classes.orSelectorOptionClass,
                                               optionIndex === group.selectedIndex
                                                       ? classes.orSelectorOptionSelectedClass
                                                       : ''
                                       )}"
                                           @mousedown="${() => renderer.selectRootOrOption(groupIndex, optionIndex)}">
                                           <div class="${twMerge(classes.orSelectorLabelClass)}">
                                               ${option.label ?? `Option ${optionIndex + 1}`}
                                           </div>
                                           ${option.description ? html`
                                               <div class="${twMerge(classes.orSelectorDescriptionClass)}">
                                                   ${option.description}
                                               </div>
                                           ` : nothing}
                                       </li>
                                   `)}
                               </ul>
                           ` : nothing}
                       </div>

                       <!-- Fields of the currently selected option -->
                       ${section.components.length > 0
                          ? renderUIComponents(renderer, section.components, classes, depth, ancestors)
                          : nothing}
                   </div>
               </div>
           `;
       })}
   `;
}

export function renderUIComponents(
   renderer: ShaclRenderer,
   uiComponents: UIComponent[],
   classes: TailwindClasses,
   depth: number = 0,
   ancestors: string[] = []
): TemplateResult {
   const grouped = new Map<string | undefined, UIComponent[]>();

   for (const component of uiComponents) {
      const key = component.group?.iri.value;
      if (!grouped.has(key)) {
         grouped.set(key, []);
      }
      grouped.get(key)!.push(component);
   }

   return html`
       ${Array.from(grouped.entries()).map(([_, components]) => {
           const group = components[0].group;

           if (!group) {
               return html`
                   <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
                       ${components.map(c => {
                           const isFullWidth = components.length === 1
                               || c.node != null
                               || c.orNode != null
                               || c.defaultWidget === shui('DetailsEditor')
                               || c.defaultWidget === shui('DetailsViewer')
                               || c.defaultWidget === shui('TextAreaEditor')
                               || c.defaultWidget === shui('RichTextEditor')
                               || c.defaultWidget === shui('ValueTableViewer');
                           return html`
                               <div class="${isFullWidth ? 'col-span-full' : 'col-span-1'}">
                                   ${renderUIComponent(renderer, c, classes, depth, ancestors)}
                               </div>
                           `;
                       })}
                   </div>
               `;
           }

           return html`
               <div class="${twMerge(classes.groupClass)}">
                   ${group.label ? html`
                       <h2 class="${twMerge(classes.groupLabelClass)}">
                           ${group.label}
                       </h2>
                   ` : nothing}

                   <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
                       ${components.map(c => {
                           const isFullWidth = components.length === 1
                               || c.node != null
                               || c.orNode != null
                               || c.defaultWidget === shui('DetailsEditor')
                               || c.defaultWidget === shui('DetailsViewer')
                               || c.defaultWidget === shui('TextAreaEditor')
                               || c.defaultWidget === shui('RichTextEditor')
                               || c.defaultWidget === shui('ValueTableViewer');
                           return html`
                               <div class="${isFullWidth ? 'col-span-full' : 'col-span-1'}">
                                   ${renderUIComponent(renderer, c, classes, depth, ancestors)}
                               </div>
                           `;
                       })}
                   </div>
               </div>
           `;
       })}
   `;
}

export function renderUIComponent(
   renderer: ShaclRenderer,
   uiComponent: UIComponent,
   classes: TailwindClasses,
   depth: number = 0,
   ancestors: string[] = []
) {
   if (renderer.mode === 'view') {
      return renderUIComponentViewMode(renderer, uiComponent, classes, depth, ancestors);
   }
   const isSingleNested = (uiComponent.defaultWidget === shui('DetailsEditor') || uiComponent.values[0]?.selectedWidget === shui('DetailsEditor')) && ((uiComponent.maxCount ?? 2) <= 1 && uiComponent.values.length <= 1);

   return html`
       <div class="mb-2">
           ${renderPlusIcon(renderer, uiComponent, classes)}

           ${isSingleNested ? nothing : renderLabel(uiComponent, classes)}

           ${isSingleNested ? nothing : renderDescription(uiComponent, classes)}

           ${uiComponent.values.map((value, index) => {
               const key = `${uiComponent.uuid}-${uiComponent.focusNode?.value}-${value.path.path}-${index}`;
               const open = renderer.alternativePathSelectOpen[key] ?? false;

               const isHasValue = !!uiComponent.hasValue && index === 0;

               return html`

                   <div class="flex items-start gap-2">
                       <div class="flex-1 min-w-0">
                           ${isHasValue || isSingleNested ? nothing : renderOrSelectorForValue(renderer, uiComponent, value, index, classes)}
                           ${renderEditor(renderer, uiComponent, value, index, classes, isHasValue, depth, ancestors)}
                       </div>

                       ${(value.widgets?.length ?? 0) > 1 ? html`
                           <div class="shrink-0 mt-2">
                               ${renderSelectWidgetIcon(renderer, uiComponent, value, index, classes)}
                           </div>
                       ` : nothing}
                   </div>

                   ${(uiComponent.paths?.length ?? 0) > 1 ? html`
                       <p class="${twMerge(classes.alternativePathDescriptionClass)}"
                          @click="${() => renderer.setAlternativePathSelectOpen(key, !open)}">
                           Click to choose an alternative path.
                       </p>

                       ${open ? html`
                           <ul class="${twMerge(classes.alternativePathSelectClass)}">
                               ${uiComponent.paths.map(path => html`
                                   <li class="${twMerge(classes.alternativePathOptionClass, path.path === value.path.path ? classes.alternativePathOptionSelectedClass : '')}"
                                       @click="${() => {
                                           // Move only THIS value's triple to the new path; sibling
                                           // values keep their own (possibly the old) path.
                                           if (uiComponent.focusNode && value.path) {
                                               renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value);
                                               renderer.addToDataStore(uiComponent.focusNode, path, value.value);
                                           } else {
                                               console.warn(`Cannot update path in dataStore for component ${uiComponent.uuid} because it is missing a focus node or current path.`);
                                           }
                                           value.path = path;
                                           renderer.setAlternativePathSelectOpen(key, false);
                                           renderer.rerender();
                                       }}">
                                       ${path.path}
                                   </li>
                               `)}
                           </ul>
                       ` : nothing}
                   ` : nothing}
               `;
           })}
       </div>
   `;
}

export function renderEditor(
   renderer: ShaclRenderer,
   uiComponent: UIComponent,
   value: UIComponentValue,
   index: number,
   classes: TailwindClasses,
   disabled: boolean = false,
   depth: number = 0,
   ancestors: string[] = []
) {
   if (value.selectedWidget && hasCustomWidget(value.selectedWidget)) {
      const customWidget = getCustomWidget(value.selectedWidget)!;
      const shapeNode = (uiComponent as any).propertyShape || uiComponent.node || uiComponent.iri;
      const annotations = extractShapeAnnotations(shapeNode, renderer.shapesStore);

      const onValueChange = (newTerm: Term | null) => {
         const prevTerm = value.value;
         if (prevTerm && renderer.removeFromDataStore) {
            renderer.removeFromDataStore(uiComponent.focusNode, value.path, prevTerm);
         }
         if (newTerm && renderer.addToDataStore) {
            renderer.addToDataStore(uiComponent.focusNode, value.path, newTerm);
         }
         value.value = newTerm ?? ({} as any);
         renderer.rerender();
      };

      const context: CustomWidgetRenderContext = {
         renderer,
         uiComponent,
         value,
         index,
         classes,
         disabled,
         mode: renderer.mode || 'edit',
         annotations,
         onValueChange
      };

      if (customWidget.render) {
         return customWidget.render(context);
      } else if (customWidget.mount) {
         return renderCustomWidgetMount(customWidget, context);
      }
   }

   switch (value.selectedWidget) {
      case shui("AutoCompleteEditor"):
         return renderAutoCompleteEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("BlankNodeEditor"):
         return renderBlankNodeEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("BooleanEditor"):
         return renderBooleanEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("DatePickerEditor"):
         return renderDatePickerEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("DateTimePickerEditor"):
         return renderDateTimePickerEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("DetailsEditor"):
         return renderDetailsEditor(renderer, uiComponent, value, index, classes, disabled, depth, ancestors);
      case shui("EnumSelectEditor"):
         return renderEnumSelectEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("InstancesSelectEditor"):
         return renderInstancesSelectEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("IRIEditor"):
         return renderIRIEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("NumberFieldEditor"):
         return renderNumberFieldEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("RichTextEditor"):
         return renderRichTextEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("SubClassEditor"):
         return renderSubClassEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("TextAreaEditor"):
         return renderTextAreaEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("TextAreaWithLangEditor"):
         return renderTextAreaWithLangEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("TextFieldEditor"):
         return renderTextFieldEditor(renderer, uiComponent, value, index, classes, disabled);
      case shui("TextFieldWithLangEditor"):
         return renderTextFieldWithLangEditor(renderer, uiComponent, value, index, classes, disabled);
      default:
         return html`
             <div class="relative">
                 <label class="${twMerge(classes.labelClass)}">
                     ${uiComponent.label} (${value.path.path}) - Unsupported widget:
                     ${value.selectedWidget ?? 'none'}
                 </label>
                 ${disabled ? nothing : renderXIcon(uiComponent, {
                     ...classes,
                     xIconClass: twMerge(classes.xIconClass, 'mt-0')
                 }, () => {
                     renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value);
                     uiComponent.values.splice(index, 1);
                     renderer.rerender();
                 })}
             </div>
         `;
   }
}

/**
 * View-mode rendering of a single component: a muted caption label + optional description above
 * the read-only value(s), with no editing affordances (no +/x/widget-switch icons, no
 * or/alternative-path editing). When the property prefers the multi-viewer shui:ValueTableViewer,
 * all values are rendered as one table.
 */
function renderUIComponentViewMode(
   renderer: ShaclRenderer,
   uiComponent: UIComponent,
   classes: TailwindClasses,
   depth: number = 0,
   ancestors: string[] = []
) {
   const isSingleNested = (uiComponent.defaultWidget === shui("DetailsViewer") || uiComponent.values[0]?.selectedWidget === shui("DetailsViewer")) && ((uiComponent.maxCount ?? 2) <= 1 && uiComponent.values.length <= 1);
   const header = isSingleNested ? nothing : html`
       ${uiComponent.label ? html`<div class="${twMerge(classes.viewerLabelClass)}">${uiComponent.label}</div>` : nothing}
       ${uiComponent.description ? html`<p class="${twMerge(classes.viewerDescriptionClass)}">${uiComponent.description}</p>` : nothing}
   `;

   if (uiComponent.defaultWidget === shui("ValueTableViewer")) {
      return html`
          <div class="${twMerge(classes.viewerFieldClass)}">
              ${header}
              ${renderValueTableViewer(renderer, uiComponent, classes)}
          </div>
      `;
   }

   return html`
       <div class="${twMerge(classes.viewerFieldClass)}">
           ${header}
           ${uiComponent.values.length === 0
              ? html`<span class="${twMerge(classes.viewerEmptyClass)}">—</span>`
              : html`
                  <div class="${twMerge(classes.viewerValuesClass)}">
                      ${uiComponent.values.map((value, index) => html`
                          <div class="${twMerge(classes.viewerValueClass)}">
                              ${renderViewer(renderer, uiComponent, value, index, classes, depth, ancestors)}
                          </div>
                      `)}
                  </div>
              `}
       </div>
   `;
}

/** Per-value dispatch for view mode: routes value.selectedWidget (a viewer IRI) to its render fn. */
export function renderViewer(
   renderer: ShaclRenderer,
   uiComponent: UIComponent,
   value: UIComponentValue,
   index: number,
   classes: TailwindClasses,
   depth: number = 0,
   ancestors: string[] = []
) {
   if (value.selectedWidget && hasCustomWidget(value.selectedWidget)) {
      const customWidget = getCustomWidget(value.selectedWidget)!;
      const shapeNode = (uiComponent as any).propertyShape || uiComponent.node || uiComponent.iri;
      const annotations = extractShapeAnnotations(shapeNode, renderer.shapesStore);

      const context: CustomWidgetRenderContext = {
         renderer,
         uiComponent,
         value,
         index,
         classes,
         disabled: true,
         mode: 'view',
         annotations,
         onValueChange: () => {}
      };

      if (customWidget.render) {
         return customWidget.render(context);
      } else if (customWidget.mount) {
         return renderCustomWidgetMount(customWidget, context);
      }
   }

   switch (value.selectedWidget) {
      case shui("BlankNodeViewer"):
         return renderBlankNodeViewer(renderer, uiComponent, value, index, classes);
      case shui("DetailsViewer"):
         return renderDetailsViewer(renderer, uiComponent, value, index, classes, depth, ancestors);
      case shui("HTMLViewer"):
         return renderHTMLViewer(renderer, uiComponent, value, index, classes);
      case shui("HyperlinkViewer"):
         return renderHyperlinkViewer(renderer, uiComponent, value, index, classes);
      case shui("ImageViewer"):
         return renderImageViewer(renderer, uiComponent, value, index, classes);
      case shui("IRIViewer"):
         return renderIRIViewer(renderer, uiComponent, value, index, classes);
      case shui("LabelViewer"):
         return renderLabelViewer(renderer, uiComponent, value, index, classes);
      case shui("LangStringViewer"):
         return renderLangStringViewer(renderer, uiComponent, value, index, classes);
      case shui("LiteralViewer"):
         return renderLiteralViewer(renderer, uiComponent, value, index, classes);
      case shui("ValueTableViewer"):
         // Multi-viewer: handled once per component in renderUIComponentViewMode, not per value.
         return nothing;
      default:
         // Sensible fallback by term type when no viewer scored.
         if (value.value.termType === "NamedNode")
            return renderIRIViewer(renderer, uiComponent, value, index, classes);
         if (value.value.termType === "BlankNode")
            return renderBlankNodeViewer(renderer, uiComponent, value, index, classes);
         return renderLiteralViewer(renderer, uiComponent, value, index, classes);
   }
}
