import { DocumentSheetV1Options } from '../../../../types/foundry/client/appv1/api/document-sheet-v1.d.mts';
import { ItemSheetDataPF2e, ItemSheetPF2e } from '../base/sheet/sheet.ts';
import { SheetOptions } from '../../sheet/helpers.ts';
import { DamageCategoryUnique } from '../../system/damage/types.ts';
import { MeleePF2e } from './index.ts';
export declare class MeleeSheetPF2e extends ItemSheetPF2e<MeleePF2e> {
    getData(options?: Partial<DocumentSheetV1Options>): Promise<MeleeSheetData>;
    activateListeners($html: JQuery<HTMLElement>): void;
    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
interface MeleeSheetData extends ItemSheetDataPF2e<MeleePF2e> {
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"];
    damageCategories: Record<DamageCategoryUnique, string>;
    attackEffects: SheetOptions;
}
export {};
