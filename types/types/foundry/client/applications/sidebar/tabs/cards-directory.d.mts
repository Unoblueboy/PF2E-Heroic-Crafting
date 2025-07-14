import { ApplicationConfiguration } from '../../_types.mjs';
import { ContextMenuEntry } from '../../ux/context-menu.mjs';
import { default as Cards } from '../../../documents/cards.mjs';
import { default as DocumentDirectory } from '../document-directory.mjs';
/**
 * The World Cards directory listing.
 */
export default class CardsDirectory extends DocumentDirectory<Cards> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "cards";

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[];
}
