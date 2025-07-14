import { ApplicationConfiguration } from '../_types.mjs';
import { default as HandlebarsApplicationMixin, HandlebarsTemplatePart } from '../api/handlebars-application.mjs';
import { default as BasePlaceableHUD } from './placeable-hud.mjs';
/**
 * An implementation of the PlaceableHUD base class which renders a heads-up-display interface for Drawing objects.
 * The DrawingHUD implementation can be configured and replaced via {@link CONFIG.Drawing.hudClass}.
 */
export default class DrawingHUD extends HandlebarsApplicationMixin(BasePlaceableHUD) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;
}
