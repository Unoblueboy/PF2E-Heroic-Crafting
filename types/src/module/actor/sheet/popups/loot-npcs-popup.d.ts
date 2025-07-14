import { ActorPF2e } from '../../index.ts';
import appv1 = foundry.appv1;
declare class LootNPCsPopup extends appv1.api.FormApplication<ActorPF2e> {
    static get defaultOptions(): appv1.api.FormApplicationOptions;
    getData(): Promise<PopupData>;
    _updateObject(_event: Event, formData: Record<string, unknown> & {
        selection?: boolean;
    }): Promise<void>;
}
interface PopupData extends appv1.api.FormApplicationData<ActorPF2e> {
    tokenInfo: {
        id: string;
        name: string;
        checked: boolean;
    }[];
}
export { LootNPCsPopup };
