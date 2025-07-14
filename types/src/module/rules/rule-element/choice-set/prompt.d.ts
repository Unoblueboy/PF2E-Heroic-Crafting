import { ActorPF2e } from '../../../actor/index.ts';
import { HandlebarsRenderOptions } from '../../../../../types/foundry/client/applications/api/handlebars-application.d.mts';
import { ItemPF2e } from '../../../item/index.ts';
import { PickableThing, PickAThingConstructorArgs, PickAThingPrompt, PromptTemplateData } from '../../../apps/pick-a-thing-prompt.ts';
import { Predicate } from '../../../system/predication.ts';
/** Prompt the user for a selection among a set of options */
declare class ChoiceSetPrompt extends PickAThingPrompt<ItemPF2e<ActorPF2e>, string | number | object> {
    #private;
    /** The prompt statement to present the user in this application's window */
    prompt: string;
    /** Does this choice set contain items? If true, an item-drop zone may be added */
    containsItems: boolean;
    /** A predicate validating a dragged & dropped item selection */
    allowedDrops: {
        label: string | null;
        predicate: Predicate;
    } | null;
    constructor(data: ChoiceSetPromptData);
    static DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration>;
    static PARTS: Record<string, fa.api.HandlebarsTemplatePart>;
    _prepareContext(): Promise<ChoiceSetTemplateData>;
    protected _onRender(context: object, options: HandlebarsRenderOptions): Promise<void>;
    /** Return early if there is only one choice */
    resolveSelection(): Promise<PickableThing<string | number | object> | null>;
    protected _onClose(options: fa.ApplicationClosingOptions): void;
    /** Handle a dropped homebrew item */
    protected _onDrop(event: DragEvent): Promise<void>;
}
interface ChoiceSetPrompt extends PickAThingPrompt<ItemPF2e<ActorPF2e>, string | number | object> {
    getSelection(event: MouseEvent): ChoiceSetChoice | null;
}
interface ChoiceSetPromptData extends PickAThingConstructorArgs<ItemPF2e<ActorPF2e>, string | number | object> {
    prompt: string;
    containsItems: boolean;
    allowedDrops: {
        label: string | null;
        predicate: Predicate;
    } | null;
}
interface ChoiceSetChoice extends PickableThing {
    hasUUID: boolean;
}
interface ChoiceSetTemplateData extends PromptTemplateData {
    prompt: string;
    choices: ChoiceSetChoice[];
    /** Whether to use a select menu instead of a column of buttons */
    selectMenu: boolean;
    includeDropZone: boolean;
    allowNoSelection: boolean;
    containsItems: boolean;
}
export { ChoiceSetPrompt };
