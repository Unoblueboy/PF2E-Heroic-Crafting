import { ChatMessagePF2e } from './index.ts';
export declare class CriticalHitAndFumbleCards {
    #private;
    static handleDraw(message: ChatMessagePF2e): void;
    static appendButtons(message: ChatMessagePF2e, html: HTMLElement): void;
}
