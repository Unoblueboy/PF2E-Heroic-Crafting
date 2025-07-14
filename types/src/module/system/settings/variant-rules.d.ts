import { SettingsTemplateData } from './menu.ts';
import appv1 = foundry.appv1;
export declare class VariantRulesSettings extends appv1.api.FormApplication {
    static get defaultOptions(): appv1.api.FormApplicationOptions;
    getData(): Promise<Record<string, SettingsTemplateData>>;
    static registerSettings(): void;
    activateListeners($html: JQuery): void;
    protected _updateObject(_event: Event, data: Record<string, unknown>): Promise<void>;
}
