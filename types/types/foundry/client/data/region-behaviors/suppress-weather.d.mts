import { DataSchema } from '../../../common/abstract/_types.mjs';
import { RegionBehaviorType } from './base.mjs';
import type * as fields from "@common/data/fields.mjs";

/** The data model for a behavior that allows to suppress weather effects within the Region */
export class SuppressWeatherRegionBehaviorType extends RegionBehaviorType<SuppressWeatherRegionBehaviorTypeSchema> {
    static override defineSchema(): SuppressWeatherRegionBehaviorTypeSchema;
}

export interface SuppressWeatherRegionBehaviorType
    extends RegionBehaviorType<SuppressWeatherRegionBehaviorTypeSchema>,
        fields.ModelPropsFromSchema<SuppressWeatherRegionBehaviorTypeSchema> {}

export type SuppressWeatherRegionBehaviorTypeSchema = DataSchema;
