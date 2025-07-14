import { FormSelectOption } from '../../../../types/foundry/client/applications/forms/fields.d.mts';
import { AppV1RenderOptions } from '../../../../types/foundry/client/appv1/api/application-v1.d.mts';
import { PhysicalItemPF2e } from '../index.ts';
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from '../base/sheet/sheet.ts';
import { CoinsPF2e, MaterialValuationData } from './index.ts';
declare class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    static get defaultOptions(): ItemSheetOptions;
    /** Show the identified data for editing purposes */
    getData(options?: Partial<ItemSheetOptions>): Promise<PhysicalItemSheetData<TItem>>;
    /** If the item is unidentified, prevent players from opening this sheet. */
    render(force?: boolean, options?: AppV1RenderOptions): this;
    protected getMaterialSheetData(item: PhysicalItemPF2e, valuationData: MaterialValuationData): MaterialSheetData;
    activateListeners($html: JQuery<HTMLElement>): void;
    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    sidebarTemplate: string;
    isApex: boolean;
    isPhysical: true;
    bulkAdjustment: string | null;
    adjustedBulkHint?: string | null;
    adjustedLevelHint: string | null;
    basePrice: CoinsPF2e;
    priceAdjustment: string | null;
    adjustedPriceHint: string | null;
    attributes: typeof CONFIG.PF2E.abilities;
    actionTypes: typeof CONFIG.PF2E.actionTypes;
    actionsNumber: typeof CONFIG.PF2E.actionsNumber;
    bulks: {
        value: number;
        label: string;
    }[];
    frequencies: typeof CONFIG.PF2E.frequencies;
    sizes: Omit<typeof CONFIG.PF2E.actorSizes, "sm">;
    usages: typeof CONFIG.PF2E.usages;
    usageOptions: FormSelectOption[];
    identificationStatusOptions: FormSelectOption[];
    bulkDisabled: boolean;
}
interface MaterialSheetEntry {
    value: string;
    label: string;
    group: string;
}
interface MaterialSheetData {
    value: string;
    materials: MaterialSheetEntry[];
}
export { PhysicalItemSheetPF2e };
export type { MaterialSheetData, MaterialSheetEntry, PhysicalItemSheetData };
