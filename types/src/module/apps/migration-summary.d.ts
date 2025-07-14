import appv1 = foundry.appv1;
/** A summary window that opens after a system migration completes */
export declare class MigrationSummary extends appv1.api.Application<MigrationSummaryOptions> {
    #private;
    constructor(options?: Partial<MigrationSummaryOptions>);
    static get defaultOptions(): appv1.api.ApplicationV1Options;
    getData(): Promise<MigrationSummaryData>;
    activateListeners($html: JQuery): void;
}
interface MigrationSummaryOptions extends appv1.api.ApplicationV1Options {
    troubleshoot: boolean;
}
interface MigrationSummaryData {
    options: MigrationSummaryOptions;
    systemVersion: string;
    latestSchemaVersion: number;
    actors: {
        successful: number;
        total: number;
    };
    items: {
        successful: number;
        total: number;
    };
    canRemigrate: boolean;
    helpResources: boolean;
    helpResourcesText: string;
}
export {};
