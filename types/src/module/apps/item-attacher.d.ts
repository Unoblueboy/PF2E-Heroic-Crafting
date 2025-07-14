import { PhysicalItemPF2e } from '../item/index.ts';
import { PickAThingPrompt, PickableThing } from './pick-a-thing-prompt.ts';
/** A prompt for the user to select an item to receive an attachment */
declare class ItemAttacher<TItem extends PhysicalItemPF2e> extends PickAThingPrompt<TItem, PhysicalItemPF2e> {
    #private;
    static DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration>;
    static PARTS: Record<string, fa.api.HandlebarsTemplatePart>;
    constructor({ item }: {
        item: TItem;
    });
    get title(): string;
    protected getSelection(event: MouseEvent): PickableThing<PhysicalItemPF2e> | null;
    resolveSelection(): Promise<PickableThing<PhysicalItemPF2e> | null>;
    protected _onRender(context: object, options: fa.ApplicationRenderOptions): Promise<void>;
}
export { ItemAttacher };
