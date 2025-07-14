import { CreatureIdentificationData } from '../../../recall-knowledge.ts';
import appv1 = foundry.appv1;
export declare class RecallKnowledgePopup extends appv1.api.Application {
    #private;
    constructor(options: Partial<appv1.api.ApplicationV1Options>, data: CreatureIdentificationData);
    static get defaultOptions(): appv1.api.ApplicationV1Options;
    getData(): Promise<PopupData>;
}
interface PopupData {
    standard: {
        label: string;
        attempts: string[];
    };
    loreEasy: string[];
    loreVeryEasy: string[];
}
export {};
