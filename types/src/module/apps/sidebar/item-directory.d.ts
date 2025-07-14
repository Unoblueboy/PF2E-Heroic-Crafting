import { HandlebarsRenderOptions } from '../../../../types/foundry/client/applications/api/handlebars-application.d.mts';
import { ContextMenuEntry } from '../../../../types/foundry/client/applications/ux/context-menu.d.mts';
import { ItemPF2e } from '../../item/index.ts';
/** Extend ItemDirectory to show more information */
export declare class ItemDirectoryPF2e<TItem extends ItemPF2e<null>> extends fa.sidebar.tabs.ItemDirectory<TItem> {
    #private;
    protected static _entryPartial: string;
    static DEFAULT_OPTIONS: Partial<fa.sidebar.DocumentDirectoryConfiguration>;
    protected _onRender(context: object, options: HandlebarsRenderOptions): Promise<void>;
    /** Add `ContextMenuEntry` to attach physical items */
    protected _getEntryContextOptions(): ContextMenuEntry[];
}
