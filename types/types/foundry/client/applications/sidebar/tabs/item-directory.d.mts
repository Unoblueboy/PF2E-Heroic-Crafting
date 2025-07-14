import { ContextMenuEntry } from '../../ux/context-menu.mjs';
import { default as Item } from '../../../documents/item.mjs';
import { default as DocumentDirectory, DocumentDirectoryConfiguration } from '../document-directory.mjs';
/**
 * The World Item directory listing.
 */
export default class ItemDirectory<TDocument extends Item<null> = Item<null>> extends DocumentDirectory<TDocument> {
    static override DEFAULT_OPTIONS: DeepPartial<DocumentDirectoryConfiguration>;

    static override tabName: "item";

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    protected override _canDragStart(): boolean;
}
