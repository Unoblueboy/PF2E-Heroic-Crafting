import { ActorSourcePF2e } from '../../actor/data/index.ts';
import { TokenSource } from '../../../../types/foundry/common/documents/token.d.mts';
import { ItemSourcePF2e } from '../../item/base/data/index.ts';
import { MigrationBase } from '../base.ts';
/** Clean up Calling items, setting a category and removing tags */
export declare class Migration935DeityIconPaths extends MigrationBase {
    #private;
    static version: number;
    updateActor(source: ActorSourcePF2e): Promise<void>;
    updateItem(source: ItemSourcePF2e): Promise<void>;
    updateToken(source: TokenSource): Promise<void>;
}
