import { SheetOptions } from '../../sheet/helpers.ts';
import { CreaturePF2e } from './document.ts';
import appv1 = foundry.appv1;
/** A DocumentSheet presenting additional, per-actor settings */
declare abstract class CreatureConfig<TActor extends CreaturePF2e> extends appv1.api.DocumentSheet<TActor> {
    get title(): string;
    get template(): string;
    get actor(): TActor;
    static get defaultOptions(): appv1.api.DocumentSheetV1Options;
    getData(options?: Partial<appv1.api.DocumentSheetV1Options>): Promise<CreatureConfigData<TActor>>;
    /** Remove stored property if it's set to default; otherwise, update */
    _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
interface CreatureConfigData<TActor extends CreaturePF2e> extends appv1.api.DocumentSheetData<TActor> {
    alliances: SheetOptions;
}
export { CreatureConfig, type CreatureConfigData };
