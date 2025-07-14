import { ApplicationConfiguration, ApplicationRenderContext } from '../../../../types/foundry/client/applications/_types.d.mts';
import { HandlebarsRenderOptions } from '../../../../types/foundry/client/applications/api/handlebars-application.d.mts';
import { ContextMenuEntry } from '../../../../types/foundry/client/applications/ux/context-menu.mjs';
import { CompendiumIndexData } from '../../../../types/foundry/client/documents/collections/compendium-collection.d.mts';
import { default as MiniSearch } from 'minisearch';
/** Extend CompendiumDirectory to support a search bar */
declare class CompendiumDirectoryPF2e extends fa.sidebar.tabs.CompendiumDirectory {
    #private;
    static readonly STOP_WORDS: Set<string>;
    /** Include ability to search and drag document search results */
    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;
    matchDragDrop: fa.ux.DragDrop;
    static PARTS: {
        match: {
            template: string;
        };
    };
    get searchEngine(): MiniSearch<CompendiumIndexData>;
    _prepareContext(options: HandlebarsRenderOptions): Promise<CompendiumDirectoryRenderContext>;
    protected _preparePartContext(partId: string, context: CompendiumDirectoryRenderContext, options: HandlebarsRenderOptions): Promise<CompendiumDirectoryRenderContext>;
    protected _onFirstRender(context: ApplicationRenderContext, options: HandlebarsRenderOptions): Promise<void>;
    protected _onRender(context: CompendiumDirectoryRenderContext, options: HandlebarsRenderOptions): Promise<void>;
    protected _getEntryContextOptions(): ContextMenuEntry[];
    /** System compendium search */
    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, listElem: HTMLElement): void;
    /** Anyone can drag from search results */
    protected _canDragStart(selector: string): boolean;
    /** Replicate the functionality of dragging a compendium document from an open `Compendium` */
    protected _onDragStart(event: DragEvent): void;
    /** Called by a "ready" hook */
    compileSearchIndex(): void;
}
interface CompendiumDirectoryPF2e extends fa.sidebar.tabs.CompendiumDirectory {
    constructor: typeof CompendiumDirectoryPF2e;
}
interface CompendiumDirectoryRenderContext extends ApplicationRenderContext {
    searchContents?: boolean;
    buttons?: {
        type: "button" | "submit";
        name?: string;
        action?: string;
        disabled?: boolean;
        icon?: string;
        label?: string;
    }[];
}
export { CompendiumDirectoryPF2e };
