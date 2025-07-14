import { ClientDocument } from '../../../../../../types/foundry/client/documents/abstract/_module.d.mts';
import { CompendiumIndexData } from '../../../../../../types/foundry/client/documents/collections/compendium-collection.d.mts';
import { HexColorString } from '../../../../../../types/foundry/common/constants.d.mts';
import { SourceFromSchema } from '../../../../../../types/foundry/common/data/fields.d.mts';
import { ItemPF2e } from '../../../index.ts';
import { AuraRuleElement, AuraRuleElementSchema } from '../../../../rules/rule-element/aura.ts';
import { RuleElementForm, RuleElementFormSheetData, RuleElementFormTabData } from './base.ts';
declare class AuraForm extends RuleElementForm<AuraRuleElementSource, AuraRuleElement> {
    #private;
    template: string;
    protected tabs: RuleElementFormTabData;
    get effectsArray(): AuraEffectSource[];
    protected getInitialValue(): object;
    activateListeners(html: HTMLElement): void;
    getData(): Promise<AuraSheetData>;
    protected onDrop(event: DragEvent, element: HTMLElement): Promise<ItemPF2e | null>;
    updateItem(updates: Partial<AuraRuleElementSource> | Record<string, unknown>): Promise<void>;
    updateObject(source: AuraRuleElementSource & Partial<Record<string, JSONValue>>): void;
}
interface AuraSheetData extends RuleElementFormSheetData<AuraRuleElementSource, AuraRuleElement> {
    affectsOptions: Record<string, string>;
    effects: AuraRuleElementSource["effects"] & {
        item: ClientDocument | CompendiumIndexData | null;
    }[];
    borderColor: HexColorString | null;
    highlightColor: HexColorString;
    saveTypes: ConfigPF2e["PF2E"]["saves"];
    isImageFile: boolean;
}
type AuraEffectSource = AuraRuleElementSource["effects"][number];
type AuraRuleElementSource = SourceFromSchema<AuraRuleElementSchema>;
export { AuraForm };
