import { ApplicationConfiguration, ApplicationRenderContext } from '../../_types.mjs';
import { default as ApplicationV2 } from '../../api/application.mjs';
import { default as HandlebarsApplicationMixin, HandlebarsTemplatePart } from '../../api/handlebars-application.mjs';
/**
 * The application responsible for configuring methods of DiceTerm resolution.
 */
export default class DiceConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Register setting and menu.
     */
    static registerSetting(): void;

    /* -------------------------------------------- */
    /*  Application                                 */
    /* -------------------------------------------- */

    override _prepareContext(): Promise<ApplicationRenderContext>;
}
