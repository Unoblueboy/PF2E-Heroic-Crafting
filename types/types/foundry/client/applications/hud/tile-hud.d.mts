import { ApplicationConfiguration } from '../_types.mjs';
import { default as HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from '../api/handlebars-application.mjs';
import { default as BasePlaceableHUD, PlaceableHUDContext } from './placeable-hud.mjs';
/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Tile objects.
 * The TileHUD implementation can be configured and replaced via {@link CONFIG.Tile.hudClass}.
 */
export default class TileHUD extends HandlebarsApplicationMixin(BasePlaceableHUD) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    override _prepareContext(options: HandlebarsRenderOptions): Promise<PlaceableHUDContext>;
}
