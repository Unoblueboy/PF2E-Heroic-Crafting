import { SkillSlug } from '../../actor/types.ts';
import { FormSelectOption } from '../../../../types/foundry/client/applications/forms/fields.d.mts';
import { ItemUUID } from '../../../../types/foundry/client/documents/_module.d.mts';
import { ImageFilePath } from '../../../../types/foundry/common/constants.d.mts';
import { DeityPF2e } from '../index.ts';
import { ItemSheetDataPF2e, ItemSheetOptions, ItemSheetPF2e } from '../base/sheet/sheet.ts';
import { SheetOptions } from '../../sheet/helpers.ts';
export declare class DeitySheetPF2e extends ItemSheetPF2e<DeityPF2e> {
    static get defaultOptions(): ItemSheetOptions;
    getData(options?: Partial<ItemSheetOptions>): Promise<DeitySheetData>;
    activateListeners($html: JQuery): void;
    _onDrop(event: DragEvent): Promise<void>;
    /** Foundry inflexibly considers checkboxes to be booleans: set back to a string tuple for Divine Font */
    _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
interface DeitySheetData extends ItemSheetDataPF2e<DeityPF2e> {
    categories: FormSelectOption[];
    sanctifications: FormSelectOption[];
    skills: Record<SkillSlug, string>;
    divineFonts: SheetOptions;
    spells: SpellBrief[];
}
interface SpellBrief {
    uuid: ItemUUID;
    level: number;
    name: string;
    img: ImageFilePath;
}
export {};
