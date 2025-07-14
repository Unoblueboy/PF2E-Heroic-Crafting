import { CoinsPF2e } from './coins.ts';
import { Price } from './index.ts';
import fields = foundry.data.fields;
declare class PriceField extends fields.SchemaField<PriceSchema, fields.SourceFromSchema<PriceSchema>, Price> {
    constructor();
    initialize(source: fields.SourceFromSchema<PriceSchema>): Price;
}
type CoinsField = fields.SchemaField<CoinsSchema, fields.SourceFromSchema<CoinsSchema>, CoinsPF2e, true, false, true>;
type CoinsSchema = {
    cp: fields.NumberField<number, number, false, false, false>;
    sp: fields.NumberField<number, number, false, false, false>;
    gp: fields.NumberField<number, number, false, false, false>;
    pp: fields.NumberField<number, number, false, false, false>;
};
type PriceSchema = {
    value: CoinsField;
    per: fields.NumberField<number, number, true, false, true>;
    sizeSensitive: fields.BooleanField<boolean, boolean, false, false, false>;
};
export { PriceField };
