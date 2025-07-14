import { DatabaseUpdateCallbackOptions } from '../../../../types/foundry/common/abstract/_types.d.mts';
import { RegionDocumentPF2e } from '../index.ts';
declare class RegionBehaviorPF2e<TParent extends RegionDocumentPF2e | null = RegionDocumentPF2e | null> extends RegionBehavior<TParent> {
    protected _onUpdate(data: DeepPartial<this["_source"]>, options: DatabaseUpdateCallbackOptions, userId: string): void;
}
export { RegionBehaviorPF2e };
