import { ApplicationConfiguration } from '../../_types.mjs';
import { HandlebarsRenderOptions } from '../../api/handlebars-application.mjs';
import { ContextMenuEntry } from '../../ux/context-menu.mjs';
import { default as Scene } from '../../../documents/scene.mjs';
import { default as DocumentDirectory } from '../document-directory.mjs';
/**
 * The World Scene directory listing.
 */
export default class SceneDirectory extends DocumentDirectory<Scene> {
    static override DEFAULT_OPTIONS: Partial<ApplicationConfiguration>;

    static override tabName: "scenes";

    protected static override _entryPartial: string;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    protected override _canRender(options: HandlebarsRenderOptions): false | void;

    protected override _getEntryContextOptions(): ContextMenuEntry[];

    protected override _getFolderContextOptions(): ContextMenuEntry[];
}
