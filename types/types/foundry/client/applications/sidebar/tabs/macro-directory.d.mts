import { ApplicationConfiguration } from '../../_types.mjs';
import { default as Macro } from '../../../documents/macro.mjs';
import { default as DocumentDirectory } from '../document-directory.mjs';
/**
 * The World Macro directory listing.
 */
export default class MacroDirectory extends DocumentDirectory<Macro> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "macros";
}
