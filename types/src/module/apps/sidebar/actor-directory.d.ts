import { ActorPF2e } from '../../actor/index.ts';
import { HandlebarsRenderOptions, HandlebarsTemplatePart } from '../../../../types/foundry/client/applications/api/handlebars-application.d.mts';
import { ContextMenuEntry } from '../../../../types/foundry/client/applications/ux/context-menu.d.mts';
import { DropCanvasData } from '../../../../types/foundry/client/helpers/hooks.d.mts';
/** Extend ActorDirectory to show more information */
declare class ActorDirectoryPF2e extends fa.sidebar.tabs.ActorDirectory<ActorPF2e<null>> {
    #private;
    static DEFAULT_OPTIONS: Partial<fa.sidebar.DocumentDirectoryConfiguration>;
    static PARTS: Record<string, HandlebarsTemplatePart>;
    protected static _entryPartial: string;
    _preparePartContext(partId: string, context: object, options: HandlebarsRenderOptions): Promise<object>;
    protected _prepareFooterContext(context: object & {
        buttons?: object[];
    }, options: HandlebarsRenderOptions): Promise<void>;
    saveActivePartyFolderState(): Promise<void>;
    _onRender(context: object, options: HandlebarsRenderOptions): Promise<void>;
    /** Collapses all open folders in this directory, including parties */
    collapseAll(): void;
    /** Overriden so matched actors in a party reveal their party "folder" as well */
    protected _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;
    protected _onDragStart(event: DragEvent): void;
    /** Overriden to prevent highlighting of certain types of draggeed data (such as parties) */
    protected _onDragHighlight(event: DragEvent): void;
    protected _handleDroppedEntry(target: HTMLElement, data: ActorSidebarDropData): Promise<void>;
    /** Overriden to not fire folder events on party actors */
    protected _createContextMenus(): void;
    protected _getEntryContextOptions(): ContextMenuEntry[];
}
interface ActorSidebarDropData extends DropCanvasData<"actor", ActorPF2e> {
    fromParty?: string;
}
export { ActorDirectoryPF2e };
