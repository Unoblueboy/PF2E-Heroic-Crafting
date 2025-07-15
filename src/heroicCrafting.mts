import { salvage, salvageButtonListener } from "./Salvage/salvage.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { ChatMessagePF2e } from "../types/src/module/chat-message";

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
	};
});

Hooks.on("renderChatMessageHTML", (message, html, data) =>
	salvageButtonListener(message as ChatMessagePF2e, html as HTMLElement, data)
);
