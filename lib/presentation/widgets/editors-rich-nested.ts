// Rich-text editor and the nested details editor (which recurses into the dispatch layer).
import {html, nothing} from "lit";
import {twMerge} from "tailwind-merge";
import {type TailwindClasses, type UIComponent, type UIComponentValue} from "../../types.ts";
import {findTailwindMarginBottomValue} from "../tailwind.ts";
import {mutateTerm} from "../../core/rdf.ts";
import {ShaclRenderer} from "../../shacl-renderer.ts";
import {sanitizeHtml, isSafeLinkUrl, renderXIcon, getHtmlLang, setHtmlLang, getSummaryLabelAndAvatar} from "./shared.ts";
import {renderUIComponents} from "./layout.ts";
import {renderDetailsClassSelect} from "./editors-select.ts";
import {languageOptions} from "./editors-fields.ts";

export function renderDetailsEditor(
   renderer: ShaclRenderer,
   uiComponent: UIComponent,
   value: UIComponentValue,
   index: number,
   classes: TailwindClasses,
   disabled: boolean = false,
   depth: number = 0,
   ancestors: string[] = []
) {
   const childComponents = uiComponent.children ? (uiComponent.children[index] ?? []) : [];
   const nextAncestors = uiComponent.label ? [...ancestors, uiComponent.label] : ancestors;
   const canRemove = (uiComponent.node ? (uiComponent.children?.length ?? 0) : uiComponent.values.length) > (uiComponent.minCount || 0);
   const isMultiple = (uiComponent.maxCount ?? 2) > 1 || uiComponent.values.length > 1;
   const itemLabel = uiComponent.label || `Item #${index + 1}`;

   if (!isMultiple) {
      return html`
          <div class="${twMerge(classes.detailsEditorClass, classes.nestedRailClass)}">
              <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-1.5">
                      <div class="${twMerge(classes.nestedHeaderPipClass)}"></div>
                      <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-100">${itemLabel}</h3>
                      ${uiComponent.description ? html`<span class="text-xs text-zinc-400">· ${uiComponent.description}</span>` : nothing}
                  </div>
                  ${disabled || !canRemove ? nothing : html`
                      <button type="button"
                              title="Remove ${itemLabel}"
                              aria-label="Remove item"
                              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
                              @click="${() => {
                                  uiComponent.children?.splice(index, 1);
                                  renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value, childComponents);
                                  uiComponent.values.splice(index, 1);
                                  renderer.rerender();
                              }}">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                          </svg>
                          <span>Remove</span>
                      </button>
                  `}
              </div>

              ${uiComponent.classes && uiComponent.classes.length > 1 ? renderDetailsClassSelect(renderer, uiComponent, value, index, classes) : nothing}

              ${renderUIComponents(renderer, childComponents, classes, depth + 1, nextAncestors)}
          </div>
      `;
   }

   const defaultOpen = index === 0;
   const isExpanded = renderer.isNestedItemExpanded(uiComponent.uuid, index, defaultOpen);
   const { summaryTitle, summarySubtitle, avatarText } = getSummaryLabelAndAvatar(uiComponent, childComponents, index);

   return html`
       <div class="mb-3.5">
           <div class="${twMerge(classes.nestedSummaryRowClass, 'group')}"
                @click="${() => {
                    renderer.toggleNestedItemExpanded(uiComponent.uuid, index, defaultOpen);
                }}">
               <div class="flex items-center gap-3 min-w-0 flex-1">
                   <div class="${twMerge(classes.nestedSummaryAvatarClass)}">
                       ${avatarText}
                   </div>
                   <div class="flex flex-col min-w-0 flex-1 leading-snug">
                       <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">${summaryTitle}</span>
                       ${summarySubtitle ? html`
                           <span class="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium truncate">${summarySubtitle}</span>
                       ` : nothing}
                   </div>
               </div>

               <div class="flex items-center gap-1 shrink-0 ml-2">
                   ${disabled || !canRemove ? nothing : html`
                       <button type="button"
                               title="Remove ${summaryTitle}"
                               aria-label="Remove item"
                               class="inline-flex items-center p-1 rounded-md text-xs font-medium text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
                               @click="${(e: MouseEvent) => {
                                   e.stopPropagation();
                                   uiComponent.children?.splice(index, 1);
                                   renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value, childComponents);
                                   uiComponent.values.splice(index, 1);
                                   renderer.rerender();
                               }}">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                           </svg>
                       </button>
                   `}

                   <div class="p-1 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-transform ${isExpanded ? 'rotate-180' : ''}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-4">
                           <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                       </svg>
                   </div>
               </div>
           </div>

           ${isExpanded ? html`
               <div class="${twMerge(classes.detailsEditorClass, classes.nestedRailClass, 'mt-2 mb-4')}">
                   ${uiComponent.classes && uiComponent.classes.length > 1 ? renderDetailsClassSelect(renderer, uiComponent, value, index, classes) : nothing}
                   ${renderUIComponents(renderer, childComponents, classes, depth + 1, nextAncestors)}
               </div>
           ` : nothing}
       </div>
   `;
}

export function renderRichTextEditor(renderer: ShaclRenderer, uiComponent: UIComponent, value: UIComponentValue, index: number, classes: TailwindClasses, disabled: boolean = false) {
   const editorId = `rte-${uiComponent.uuid}-${index}`;

   // Track HTML mode per editor
   const htmlMode = renderer.richTextHtmlMode[editorId] ?? false;

   const exec = (command: string, arg?: string) => {
      const editor = renderer.renderRoot?.querySelector(
         `#${editorId}`
      ) as HTMLElement;

      if (!editor) return;

      editor.focus();
      document.execCommand(command, false, arg);
      // Replace the term instead of mutating it in place: the data store indexes terms by
      // their string value, so an in-place mutation would leave the stored quad unfindable.
      const newTerm = mutateTerm(value.value, sanitizeHtml(editor.innerHTML));
      renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value);
      renderer.addToDataStore(uiComponent.focusNode, value.path, newTerm);
      value.value = newTerm;
      renderer.rerender();
   };

   const insertImage = (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
         exec("insertImage", reader.result as string);
      };
      reader.readAsDataURL(file);
   };

   // The spec stores the RichTextEditor language in the lang attribute of the HTML root.
   const currentLang = getHtmlLang(value.value.value ?? '');
   const langOptions = languageOptions(renderer, uiComponent, currentLang);

   return html`
       <div class="${twMerge('relative', `mb-${findTailwindMarginBottomValue(twMerge(classes.globalFieldClass, classes.richTextEditorClass)) || '0'}`)}">
           <div class="${twMerge(
                   classes.globalFieldClass,
                   classes.richTextEditorClass,
                   'mb-0'
           )}">

               <!-- Toolbar -->
               <div class="${twMerge(classes.richTextEditorToolbarClass, disabled ? 'pointer-events-none opacity-40' : '')}">

                   <!-- Bold -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => exec('bold')}">
                       B
                   </button>

                   <!-- Italic -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass, 'italic')}"
                           @click="${() => exec('italic')}">
                       I
                   </button>

                   <!-- Underline -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass, 'underline')}"
                           @click="${() => exec('underline')}">
                       U
                   </button>

                   <!-- Headings -->
                   <select class="${twMerge(classes.richTextEditorSelectClass)}"
                           @change="${(e: Event) => {
                               const val = (e.target as HTMLSelectElement).value;
                               exec('formatBlock', val);
                           }}">
                       <option value="p">Paragraph</option>
                       <option value="h1">H1</option>
                       <option value="h2">H2</option>
                       <option value="h3">H3</option>
                   </select>

                   <!-- Font family -->
                   <select class="${twMerge(classes.richTextEditorSelectClass)}"
                           @change="${(e: Event) => {
                               exec('fontName', (e.target as HTMLSelectElement).value);
                           }}">
                       <option value="Arial">Arial</option>
                       <option value="Times New Roman">Times</option>
                       <option value="Courier New">Courier</option>
                       <option value="Verdana">Verdana</option>
                   </select>

                   <!-- Font size -->
                   <select class="${twMerge(classes.richTextEditorSelectClass)}"
                           @change="${(e: Event) => {
                               exec('fontSize', (e.target as HTMLSelectElement).value);
                           }}">
                       <option value="3">Normal</option>
                       <option value="4">Large</option>
                       <option value="5">X-Large</option>
                   </select>

                   <!-- Text color -->
                   <input type="color"
                          class="w-8 h-8 border rounded cursor-pointer"
                          @input="${(e: Event) => {
                              exec('foreColor', (e.target as HTMLInputElement).value);
                          }}"/>

                   <!-- Lists -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => exec('insertUnorderedList')}">
                       • List
                   </button>

                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => exec('insertOrderedList')}">
                       1. List
                   </button>

                   <!-- Alignment -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => exec('justifyLeft')}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5">
                           <path stroke-linecap="round" stroke-linejoin="round"
                                 d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"/>
                       </svg>
                   </button>

                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => exec('justifyCenter')}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5">
                           <path stroke-linecap="round" stroke-linejoin="round"
                                 d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
                       </svg>
                   </button>

                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => exec('justifyRight')}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5">
                           <path stroke-linecap="round" stroke-linejoin="round"
                                 d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25"/>
                       </svg>
                   </button>

                   <!-- Link -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass)}"
                           @click="${() => {
                               const url = prompt('Enter URL');
                               if (url && isSafeLinkUrl(url)) exec('createLink', url);
                           }}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5">
                           <path stroke-linecap="round" stroke-linejoin="round"
                                 d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>
                       </svg>
                   </button>

                   <!-- Image upload -->
                   <label class="${twMerge(classes.richTextEditorButtonClass)}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5">
                           <path stroke-linecap="round" stroke-linejoin="round"
                                 d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
                       </svg>
                       <input type="file" accept="image/*" class="hidden"
                              @change="${(e: Event) => {
                                  const file = (e.target as HTMLInputElement).files?.[0];
                                  if (file) insertImage(file);
                              }}">
                   </label>

                   <!-- Language (stored as the lang attribute of the HTML root) -->
                   <select data-rte-lang
                           class="${twMerge(classes.richTextEditorSelectClass)}"
                           aria-label="Content language"
                           @change="${(e: Event) => {
                               const lang = (e.target as HTMLSelectElement).value || undefined;
                               const newHtml = setHtmlLang(value.value.value ?? '', lang);
                               const newTerm = mutateTerm(value.value, newHtml);
                               renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value);
                               renderer.addToDataStore(uiComponent.focusNode, value.path, newTerm);
                               value.value = newTerm;
                               renderer.rerender();
                           }}">
                       <option value="" ?selected="${!currentLang}">Language</option>
                       ${langOptions.map(lang => html`
                           <option value="${lang}" ?selected="${lang === currentLang}">${lang}</option>
                       `)}
                   </select>

                   <!-- HTML toggle -->
                   <button type="button"
                           class="${twMerge(classes.richTextEditorButtonClass, htmlMode ? 'bg-gray-200' : '')}"
                           @click="${() => {
                               renderer.richTextHtmlMode[editorId] = !htmlMode;
                               renderer.rerender();
                           }}">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5">
                           <path stroke-linecap="round" stroke-linejoin="round"
                                 d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/>
                       </svg>
                   </button>
               </div>

               <!-- Editor -->
               ${htmlMode ? html`
                   <textarea
                           id="${editorId}"
                           class="${twMerge(classes.richTextEditorRawContentClass, disabled ? 'cursor-not-allowed opacity-60' : '')}"
                           .value="${value.value.value ?? ''}"
                           ?disabled="${disabled}"
                           @input="${(e: Event) => {
                               const el = e.target as HTMLTextAreaElement;
                               const newTerm = mutateTerm(value.value, el.value);
                               renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value);
                               renderer.addToDataStore(uiComponent.focusNode, value.path, newTerm);
                               value.value = newTerm;
                           }}"
                   ></textarea>
               ` : html`
                   <div
                           id="${editorId}"
                           contenteditable="${disabled ? 'false' : 'true'}"
                           class="${twMerge(classes.richTextEditorContentClass, disabled ? 'cursor-not-allowed opacity-60' : '')}"
                           .innerHTML="${sanitizeHtml(value.value.value ?? '')}"
                           @input="${(e: Event) => {
                               const el = e.target as HTMLElement;
                               const newTerm = mutateTerm(value.value, sanitizeHtml(el.innerHTML));
                               renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value);
                               renderer.addToDataStore(uiComponent.focusNode, value.path, newTerm);
                               value.value = newTerm;
                           }}"
                   ></div>
               `}

           </div>
           ${disabled ? nothing : renderXIcon(uiComponent, classes, () => {
               renderer.removeFromDataStore(uiComponent.focusNode, value.path, value.value, uiComponent.children?.[index]);
               uiComponent.values.splice(index, 1);
               renderer.rerender();
           })}
       </div>
   `;
}
