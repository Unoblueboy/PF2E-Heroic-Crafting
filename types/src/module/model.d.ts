import { SkillSlug } from './actor/types.ts';
import { Rarity, ZeroToFour } from './data.ts';
import fields = foundry.data.fields;
declare class RarityField extends fields.StringField<Rarity, Rarity, true, false, true> {
    constructor();
}
declare class ProficiencyRankField extends fields.NumberField<ZeroToFour, ZeroToFour, true, false, true> {
    constructor();
}
declare class PublicationField extends fields.SchemaField<PublicationSchema, fields.SourceFromSchema<PublicationSchema>, fields.ModelPropsFromSchema<PublicationSchema>, true, false, true> {
    constructor();
}
/** Schema definition for an actor's sourcebook */
type PublicationSchema = {
    title: fields.StringField<string, string, true, false, true>;
    authors: fields.StringField<string, string, true, false, true>;
    license: fields.StringField<"ORC" | "OGL", "ORC" | "OGL", true, false, true>;
    remaster: fields.BooleanField;
};
/**
 * A function to generate choices for data models that include both old and new skill slugs, for compatibility purposes.
 * @todo: remove once migrations are functional for structural changes
 */
declare function getCompatSkills(): SkillSlug[];
export { getCompatSkills, ProficiencyRankField, PublicationField, RarityField };
