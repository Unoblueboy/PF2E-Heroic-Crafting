import { ActorPF2e } from '../../../actor/index.ts';
import { ItemPF2e } from '../../../item/index.ts';
import { ItemSourcePF2e } from '../../../item/base/data/index.ts';
import { AELikeChangeMode } from '../ae-like.ts';
import { RuleElementPF2e } from '../base.ts';
import { ResolvableValueField } from '../data.ts';
import fields = foundry.data.fields;
declare class ItemAlteration extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema> {
    #private;
    static VALID_PROPERTIES: readonly ["ac-bonus", "area-size", "badge-max", "badge-value", "bulk", "category", "check-penalty", "damage-dice-faces", "damage-dice-number", "damage-type", "defense-passive", "description", "dex-cap", "focus-point-cost", "frequency-max", "frequency-per", "group", "hardness", "hp-max", "material-type", "name", "other-tags", "pd-recovery-dc", "persistent-damage", "potency", "range-increment", "range-max", "rarity", "resilient", "speed-penalty", "strength", "striking", "traits"];
    static defineSchema(): ItemAlterationSchema;
    get rule(): RuleElementPF2e;
    get actor(): ActorPF2e;
    /**
     * Apply this alteration to an item (or source)
     * @param item The item to be altered
     */
    applyTo(item: ItemPF2e<ActorPF2e> | ItemSourcePF2e): void;
}
interface ItemAlteration extends foundry.abstract.DataModel<RuleElementPF2e, ItemAlterationSchema>, fields.ModelPropsFromSchema<ItemAlterationSchema> {
}
type ItemAlterationSchema = {
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    property: fields.StringField<ItemAlterationProperty, ItemAlterationProperty, true, false, false>;
    value: ResolvableValueField<true, true, false>;
};
type ItemAlterationProperty = (typeof ItemAlteration.VALID_PROPERTIES)[number];
export { ItemAlteration };
export type { ItemAlterationProperty, ItemAlterationSchema };
