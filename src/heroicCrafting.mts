import { salvage, salvageButtonListener } from "./Salvage/salvage.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { beginProject } from "./BeginProject/beginProject.mjs";
import { reverseEngineer } from "./ReverseEngineer/reverseEngineer.mjs";
import { craftProject } from "./CraftProject/craftProject.mjs";

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
		beginProject,
		reverseEngineer,
		craftProject,
	};
});

Hooks.on("renderChatMessageHTML", (message, html, data) =>
	salvageButtonListener(message as ChatMessagePF2e, html as HTMLElement, data)
);
