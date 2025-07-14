import { TrackedAttributesDescription } from '../../_types.mjs';
import { TurnMarkerData } from '../../canvas/placeables/tokens/_module.mjs';
import { default as CombatConfiguration } from '../../data/combat-config.mjs';
import { SettingConfig } from '../../../common/_types.mjs';
import { ApplicationConfiguration, FormFooterButton } from '../_types.mjs';
import { ApplicationV2, HandlebarsApplicationMixin, HandlebarsRenderOptions, HandlebarsTemplatePart } from '../api/_module.mjs';
export interface CombatTrackerContext {
    rootId: string;
    attributeChoices: TrackedAttributesDescription;
    canConfigure: boolean;
    combatTheme?: SettingConfig;
    fields: (typeof CombatConfiguration)["schema"]["fields"];
    selectedTheme?: SettingConfig;
    settings: SettingConfig;
    animationChoices: TurnMarkerData;
    buttons: FormFooterButton[];
}

/** The Application responsible for configuring the CombatTracker and its contents. */
export default class CombatTrackerConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration>;

    static override PARTS: Record<string, HandlebarsTemplatePart>;

    override _prepareContext(options: HandlebarsRenderOptions): Promise<CombatTrackerContext>;
}
