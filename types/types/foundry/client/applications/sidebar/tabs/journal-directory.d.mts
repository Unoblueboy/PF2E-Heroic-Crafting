import { ApplicationConfiguration } from '../../_types.mjs';
import { ContextMenuEntry } from '../../ux/context-menu.mjs';
import { default as JournalEntry } from '../../../documents/cards.mjs';
import { default as DocumentDirectory } from '../document-directory.mjs';
/**
 * The World Journal.
 */
export default class JournalDirectory extends DocumentDirectory<JournalEntry> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "journal";

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[];
}
