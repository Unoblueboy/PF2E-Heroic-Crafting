import { ActorPF2e } from '../../index.ts';
import { Coins } from '../../../item/physical/data.ts';
import appv1 = foundry.appv1;
interface PopupFormData extends Coins {
    removeByValue: boolean;
}
/**
 * @category Other
 */
export declare class RemoveCoinsPopup extends appv1.api.FormApplication<ActorPF2e> {
    static get defaultOptions(): appv1.api.FormApplicationOptions;
    _updateObject(_event: Event, formData: Record<string, unknown> & PopupFormData): Promise<void>;
}
export {};
