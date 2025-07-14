import { ActorPF2e } from '../../index.ts';
import { SpellPF2e } from '../../../item/index.ts';
import { SpellConsumableItemType } from '../../../item/consumable/spell-consumables.ts';
import { OneToTen } from '../../../data.ts';
import appv1 = foundry.appv1;
interface FormInputData extends appv1.api.FormApplicationData<ActorPF2e> {
    itemTypeOptions?: object;
    validLevels?: number[];
    itemType?: SpellConsumableItemType;
    level?: OneToTen;
}
type FormOutputData = {
    itemType: SpellConsumableItemType;
    level: OneToTen;
};
export declare class CastingItemCreateDialog extends appv1.api.FormApplication<ActorPF2e> {
    onSubmitCallback: CastingItemCreateCallback;
    spell: SpellPF2e;
    formDataCache: FormOutputData;
    constructor(object: ActorPF2e, options: Partial<appv1.api.FormApplicationOptions>, callback: CastingItemCreateCallback, spell: SpellPF2e);
    static get defaultOptions(): appv1.api.FormApplicationOptions;
    getData(): Promise<FormInputData>;
    _updateObject(event: Event, formData: FormOutputData): Promise<void>;
}
type CastingItemCreateCallback = (level: OneToTen, itemType: SpellConsumableItemType, spell: SpellPF2e) => Promise<void>;
export {};
