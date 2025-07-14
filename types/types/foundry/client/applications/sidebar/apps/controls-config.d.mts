import { ApplicationRenderContext } from '../../_module.mjs';
import { default as CategoryBrowser, CategoryBrowserConfiguration } from '../../api/category-browser.mjs';
import { HandlebarsRenderOptions, HandlebarsTemplatePart } from '../../api/handlebars-application.mjs';
import { KeybindingActionBinding } from '../../../../common/_types.mjs';
/**
 * View and edit keybinding and (readonly) mouse actions.
 */
export default class ControlsConfig extends CategoryBrowser {
    static override DEFAULT_OPTIONS: DeepPartial<CategoryBrowserConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /**
     * Faux "pointer bindings" for displaying as a readonly category
     */
    static POINTER_CONTROLS: readonly [id: string, name: string, parts: string[], gmOnly?: boolean][];

    /**
     * Transform an action binding into a human-readable string representation.
     */
    static humanizeBinding(binding: KeybindingActionBinding): string;

    protected override _configureRenderOptions(options: DeepPartial<HandlebarsRenderOptions>): void;

    protected override _prepareCategoryData(): Promise<
        Record<string, { id: string; label: string; entries: object[] }>
    >;

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;
}
