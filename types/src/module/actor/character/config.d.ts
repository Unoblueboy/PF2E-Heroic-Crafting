import { CreatureConfig, CreatureConfigData } from '../creature/config.ts';
import { DocumentSheetV1Options } from '../../../../types/foundry/client/appv1/api/document-sheet-v1.d.mts';
import { CharacterPF2e } from './document.ts';
export declare class CharacterConfig extends CreatureConfig<CharacterPF2e> {
    getData(options?: Partial<DocumentSheetV1Options>): Promise<PCConfigData>;
}
interface PCConfigData extends CreatureConfigData<CharacterPF2e> {
    showBasicUnarmed: boolean;
}
export {};
