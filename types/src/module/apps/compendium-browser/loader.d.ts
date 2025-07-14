import { CompendiumDocument } from '../../../../types/foundry/client/documents/_module.d.mts';
import { default as CompendiumCollection, CompendiumIndex } from '../../../../types/foundry/client/documents/collections/compendium-collection.d.mts';
import { CompendiumBrowserSources } from './browser.ts';
declare class PackLoader {
    #private;
    loadedSources: string[];
    sourcesSettings: CompendiumBrowserSources;
    constructor();
    loadPacks(documentType: "Actor" | "Item", packs: string[], indexFields: string[]): AsyncGenerator<{
        pack: CompendiumCollection<CompendiumDocument>;
        index: CompendiumIndex;
    }, void, unknown>;
    updateSources(packs: string[]): Promise<void>;
    reset(): void;
    hardReset(packs: string[]): Promise<void>;
}
export { PackLoader };
