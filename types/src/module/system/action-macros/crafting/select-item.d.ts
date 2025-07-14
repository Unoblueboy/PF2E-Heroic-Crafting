import { PhysicalItemPF2e } from '../../../item/index.ts';
import appv1 = foundry.appv1;
declare class SelectItemDialog extends appv1.api.Application {
    #private;
    private constructor();
    static get defaultOptions(): appv1.api.ApplicationV1Options;
    get template(): string;
    get title(): string;
    getData(options?: Partial<appv1.api.ApplicationV1Options>): Promise<{
        item: PhysicalItemPF2e | null;
    }>;
    activateListeners($html: JQuery): void;
    close(options?: {
        force?: boolean;
    }): Promise<void>;
    static getItem(action: ItemAction): Promise<PhysicalItemPF2e | null>;
}
type ItemAction = "craft" | "repair";
export { SelectItemDialog };
