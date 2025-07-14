import { DataFieldOptions } from '../../../../../types/foundry/common/data/_types.d.mts';
import { ItemPF2e } from '../../../item/index.ts';
import { ItemSourcePF2e, ItemType } from '../../../item/base/data/index.ts';
import { ItemTrait } from '../../../item/base/types.ts';
import { DamageType } from '../../../system/damage/types.ts';
import { PredicateField, SlugField, StrictNumberField } from '../../../system/schema-data-fields.ts';
import { AELikeChangeMode } from '../ae-like.ts';
import fields = foundry.data.fields;
import validation = foundry.data.validation;
/** A `SchemaField` reappropriated for validation of specific item alterations */
declare class ItemAlterationValidator<TSchema extends AlterationSchema> extends fields.SchemaField<TSchema> {
    #private;
    operableOnInstances: boolean;
    operableOnSource: boolean;
    constructor(fields: TSchema, options?: AlterationFieldOptions<fields.SourceFromSchema<TSchema>>);
    /**
     * A type-safe affirmation of full validity of an alteration _and_ its applicable to a particular item
     * Errors will bubble all the way up to the originating parent rule element
     */
    isValid(data: {
        item: ItemPF2e | ItemSourcePF2e;
        alteration: MaybeAlterationData;
    }): data is {
        item: ItemOrSource<fields.SourceFromSchema<TSchema>["itemType"]>;
        alteration: fields.SourceFromSchema<TSchema>;
    };
}
type ItemOrSource<TItemType extends ItemType> = InstanceType<(typeof CONFIG.PF2E.Item.documentClasses)[TItemType]> | InstanceType<(typeof CONFIG.PF2E.Item.documentClasses)[TItemType]>["_source"];
type MaybeAlterationData = {
    mode: string;
    itemType: string;
    value: unknown;
};
declare const ITEM_ALTERATION_VALIDATORS: {
    "ac-bonus": ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "area-size": ItemAlterationValidator<{
        itemType: fields.StringField<"spell", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "badge-max": ItemAlterationValidator<{
        itemType: fields.StringField<"effect", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "downgrade", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "badge-value": ItemAlterationValidator<{
        itemType: fields.StringField<"condition" | "effect", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    bulk: ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield" | "consumable" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<number, number, true, false, false>;
    }>;
    category: ItemAlterationValidator<{
        itemType: fields.StringField<"armor", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<"light" | "medium" | "heavy", NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "check-penalty": ItemAlterationValidator<{
        itemType: fields.StringField<"armor", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "damage-dice-faces": ItemAlterationValidator<{
        itemType: fields.StringField<"weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<4 | 10 | 6 | 8 | 12, 4 | 10 | 6 | 8 | 12, true, true, true>;
    }>;
    "damage-dice-number": ItemAlterationValidator<{
        itemType: fields.StringField<"weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "damage-type": ItemAlterationValidator<{
        itemType: fields.StringField<"weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<"force" | "acid" | "bleed" | "bludgeoning" | "cold" | "electricity" | "fire" | "mental" | "piercing" | "poison" | "slashing" | "sonic" | "spirit" | "vitality" | "void" | "untyped", NonNullable<JSONValue>, true, false, boolean>;
    }>;
    /** The passive defense targeted by an attack spell */
    "defense-passive": ItemAlterationValidator<{
        itemType: fields.StringField<"spell", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<"ac" | "fortitude-dc" | "reflex-dc" | "will-dc", NonNullable<JSONValue>, true, false, boolean>;
    }>;
    description: ItemAlterationValidator<{
        itemType: fields.StringField<"action" | "background" | "armor" | "shield" | "consumable" | "class" | "ancestry" | "affliction" | "campaignFeature" | "condition" | "deity" | "effect" | "feat" | "heritage" | "kit" | "lore" | "melee" | "spell" | "spellcastingEntry" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "add", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.ArrayField<DescriptionElementField, fields.SourceFromSchema<{
            title: fields.StringField<string, string, false, true, true>;
            text: fields.StringField<string, string, true, false, false>;
            divider: fields.BooleanField<boolean, boolean, false, false, true>;
            predicate: PredicateField<false>;
        }>[], fields.ModelPropsFromSchema<{
            title: fields.StringField<string, string, false, true, true>;
            text: fields.StringField<string, string, true, false, false>;
            divider: fields.BooleanField<boolean, boolean, false, false, true>;
            predicate: PredicateField<false>;
        }>[], true, false, false>;
    }>;
    "dex-cap": ItemAlterationValidator<{
        itemType: fields.StringField<"armor", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "focus-point-cost": ItemAlterationValidator<{
        itemType: fields.StringField<"spell", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "add", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    group: ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<string, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    hardness: ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield" | "consumable" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "hp-max": ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield" | "consumable" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "material-type": ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield" | "consumable" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<"abysium" | "adamantine" | "dawnsilver" | "djezet" | "duskwood" | "inubrix" | "noqual" | "orichalcum" | "siccatite" | "silver" | "cold-iron" | "dragonhide" | "dreamweb" | "grisantian-pelt" | "keep-stone" | "peachwood" | "sisterstone" | "sisterstone-dusk" | "sisterstone-scarlet" | "sloughstone" | "sovereign-steel" | "warpglass", NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "pd-recovery-dc": ItemAlterationValidator<{
        itemType: fields.StringField<"condition", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "persistent-damage": ItemAlterationValidator<{
        itemType: fields.StringField<"condition", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.SchemaField<PersistentDamageValueSchema, fields.SourceFromSchema<PersistentDamageValueSchema>, fields.ModelPropsFromSchema<PersistentDamageValueSchema>, true, false, true>;
    }>;
    rarity: ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield" | "consumable" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<"common" | "uncommon" | "rare" | "unique", NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "range-increment": ItemAlterationValidator<{
        itemType: fields.StringField<"weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "multiply" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "range-max": ItemAlterationValidator<{
        itemType: fields.StringField<"weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "multiply" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "frequency-max": ItemAlterationValidator<{
        itemType: fields.StringField<"action" | "feat", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "frequency-per": ItemAlterationValidator<{
        itemType: fields.StringField<"action" | "feat", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<string, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "other-tags": ItemAlterationValidator<{
        itemType: fields.StringField<"action" | "background" | "armor" | "shield" | "consumable" | "class" | "ancestry" | "affliction" | "campaignFeature" | "condition" | "deity" | "effect" | "feat" | "heritage" | "kit" | "lore" | "melee" | "spell" | "spellcastingEntry" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: SlugField<true, false, boolean>;
    }>;
    name: ItemAlterationValidator<{
        itemType: fields.StringField<ItemType, ItemType, true, false, false>;
        mode: fields.StringField<"override", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<string, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    potency: ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    resilient: ItemAlterationValidator<{
        itemType: fields.StringField<"armor", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    "speed-penalty": ItemAlterationValidator<{
        itemType: fields.StringField<"armor" | "shield", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    strength: ItemAlterationValidator<{
        itemType: fields.StringField<"armor", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade" | "downgrade" | "add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: StrictNumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    striking: ItemAlterationValidator<{
        itemType: fields.StringField<"weapon", ItemType, true, false, false>;
        mode: fields.StringField<"override" | "upgrade", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.NumberField<number, NonNullable<JSONValue>, true, false, boolean>;
    }>;
    traits: ItemAlterationValidator<{
        itemType: fields.StringField<"action" | "background" | "armor" | "shield" | "consumable" | "class" | "ancestry" | "affliction" | "campaignFeature" | "condition" | "effect" | "feat" | "heritage" | "kit" | "melee" | "spell" | "backpack" | "book" | "equipment" | "treasure" | "weapon", ItemType, true, false, false>;
        mode: fields.StringField<"add" | "subtract" | "remove", "override" | "upgrade" | "downgrade" | "multiply" | "add" | "subtract" | "remove", true, false, false>;
        value: fields.StringField<ItemTrait, ItemTrait, true, false, false>;
    }>;
};
interface AlterationFieldOptions<TSourceProp extends fields.SourceFromSchema<AlterationSchema>> extends DataFieldOptions<TSourceProp, true, false, false> {
    validateForItem?: (item: ItemPF2e | ItemSourcePF2e, alteration: MaybeAlterationData) => validation.DataModelValidationFailure | void;
    /** Whether this alteration can be used with an `ItemPF2e` instance */
    operableOnInstances?: boolean;
    /** Whether this alteration can be used with item source data */
    operableOnSource?: boolean;
}
type AlterationSchema = {
    itemType: fields.StringField<ItemType, ItemType, true, false, false>;
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    value: fields.DataField<Exclude<JSONValue, undefined>, Exclude<JSONValue, undefined>, true, boolean, boolean>;
};
type PersistentDamageValueSchema = {
    formula: fields.StringField<string, string, true, false, false>;
    damageType: fields.StringField<DamageType, DamageType, true, false, false>;
    dc: fields.NumberField<number, number, true, false, true>;
};
type DescriptionElementField = fields.SchemaField<{
    title: fields.StringField<string, string, false, true, true>;
    text: fields.StringField<string, string, true, false, false>;
    divider: fields.BooleanField<boolean, boolean, false, false, true>;
    predicate: PredicateField<false>;
}>;
export { ITEM_ALTERATION_VALIDATORS };
