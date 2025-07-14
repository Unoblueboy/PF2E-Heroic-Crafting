import { HandlebarsRenderOptions } from '../../api/handlebars-application.mjs';
import { default as DialogV2, DialogV2Configuration } from '../../api/dialog.mjs';
/**
 * A Dialog subclass that allows the user to configure export options for a Folder
 */
export default class FolderExport extends DialogV2 {
    static DEFAULT_OPTIONS: DeepPartial<DialogV2Configuration>;

    protected override _onRender(context: object, options: HandlebarsRenderOptions): Promise<void>;
}
