import { ApplicationRenderContext } from '../../../../types/foundry/client/applications/_types.d.mts';
import { ContextMenuEntry } from '../../../../types/foundry/client/applications/ux/context-menu.d.mts';
import { ChatSpeakerData } from '../../../../types/foundry/common/documents/chat-message.d.mts';
import { ChatMessagePF2e } from '../../chat-message/index.ts';
declare class ChatLogPF2e extends fa.sidebar.tabs.ChatLog {
    #private;
    static DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration>;
    _onRender(context: ApplicationRenderContext, options: fa.api.HandlebarsRenderOptions): Promise<void>;
    /** Replace parent method in order to use DamageRoll class as needed */
    processMessage(message: string, options?: {
        speaker?: ChatSpeakerData;
    }): Promise<ChatMessagePF2e | undefined>;
    protected _getEntryContextOptions(): ContextMenuEntry[];
}
export { ChatLogPF2e };
