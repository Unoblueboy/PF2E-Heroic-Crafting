import { ApplicationConfiguration, ApplicationPosition, ApplicationRenderContext } from '../../_types.mjs';
import { default as User } from '../../../documents/user.mjs';
import { default as ApplicationV2 } from '../../api/application.mjs';
import { default as HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from '../../api/handlebars-application.mjs';
interface CameraPopoutConfiguration extends ApplicationConfiguration {
    user: User;
}

/**
 * An application for a single popped-out camera.
 * @extends {ApplicationV2<CameraPopoutConfiguration, HandlebarsRenderOptions>}
 * @mixes HandlebarsApplication
 */
export default class CameraPopout extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(options?: DeepPartial<ApplicationConfiguration> & { user: User });

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The user this camera view is for.
     */
    get user(): User;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _initializeApplicationOptions(options: DeepPartial<ApplicationConfiguration>): ApplicationConfiguration;

    protected override _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void>;

    protected override _prepareContext(options: HandlebarsRenderOptions): Promise<ApplicationRenderContext>;

    /* -------------------------------------------- */
    /*  Positioning                                 */
    /* -------------------------------------------- */

    override setPosition(position?: Partial<ApplicationPosition>): ApplicationPosition;

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    protected override _onClickAction(event: PointerEvent, target: HTMLElement): void | Promise<void>;
}
