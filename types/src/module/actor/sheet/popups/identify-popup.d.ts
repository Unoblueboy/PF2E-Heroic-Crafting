import { IdentifyAlchemyDCs, IdentifyMagicDCs } from '../../../item/identification.ts';
import { PhysicalItemPF2e } from '../../../item/physical/index.ts';
import appv1 = foundry.appv1;
export declare class IdentifyItemPopup extends appv1.api.FormApplication<PhysicalItemPF2e> {
    static get defaultOptions(): appv1.api.FormApplicationOptions;
    dcs: IdentifyMagicDCs | IdentifyAlchemyDCs;
    getData(): Promise<IdentifyPopupData>;
    activateListeners($html: JQuery): void;
    protected _updateObject(_event: Event, formData: Record<string, unknown>): Promise<void>;
}
interface IdentifyPopupData extends appv1.api.FormApplicationData {
    isMagic: boolean;
    isAlchemical: boolean;
    dcs: IdentifyMagicDCs | IdentifyAlchemyDCs;
}
export {};
