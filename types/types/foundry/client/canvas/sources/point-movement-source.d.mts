import { PlaceableObject } from '../placeables/_module.mjs';
import { default as BaseEffectSource } from './base-effect-source.mjs';
import { default as PointEffectSourceMixin } from './point-effect-source.mjs';
/**
 * A specialized subclass of the BaseEffectSource which describes a movement-based source.
 */
export default class PointMovementSource<
    TObject extends PlaceableObject = PlaceableObject,
> extends PointEffectSourceMixin(BaseEffectSource)<TObject> {
    static override sourceType: "move";
}
