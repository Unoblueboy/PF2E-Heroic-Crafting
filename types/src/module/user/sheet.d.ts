import { ApplicationTab } from '../../../types/foundry/client/applications/_module.d.mts';
import { DocumentSheetRenderOptions } from '../../../types/foundry/client/applications/api/document-sheet.d.mts';
import { UserPF2e } from './document.ts';
/** Player-specific settings, stored as flags on each User */
declare class UserConfigPF2e extends fa.sheets.UserConfig<UserPF2e> {
    #private;
    static PARTS: {
        tabs: {
            template: string;
        };
        main: {
            template: string;
        };
    };
    tabGroups: {
        primary: string;
    };
    _prepareContext(options: DocumentSheetRenderOptions): Promise<UserConfigRenderContextPF2e>;
}
interface UserConfigRenderContextPF2e extends fa.sheets.UserConfigRenderContext<UserPF2e> {
    tabs: Partial<ApplicationTab>[];
    tabGroups: Record<string, string>;
}
export { UserConfigPF2e };
