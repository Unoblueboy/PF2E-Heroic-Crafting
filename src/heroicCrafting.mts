import { salvage, salvageButtonListener } from "./Salvage/salvage.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { beginProject } from "./BeginProject/beginBroject.mjs";

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
		beginProject,
	};
});

Hooks.on("renderChatMessageHTML", (message, html, data) =>
	salvageButtonListener(message as ChatMessagePF2e, html as HTMLElement, data)
);
