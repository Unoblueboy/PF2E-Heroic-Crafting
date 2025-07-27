import { salvage, salvageChatButtonListener } from "./Salvage/salvage.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { beginProject } from "./BeginProject/beginProject.mjs";
import { reverseEngineer } from "./ReverseEngineer/reverseEngineer.mjs";
import { craftProject, craftProjectChatButtonListener } from "./CraftProject/craftProject.mjs";

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
		beginProject,
		reverseEngineer,
		craftProject,
	};
});

Hooks.on("renderChatMessageHTML", (message, html, data) => {
	salvageChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	craftProjectChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
});

// https://github.com/Cerapter/pf2e-heroic-crafting-automation/tree/05a6b3ba592eaa3df92a87b5f3525182746cb13e/scripts/rule-elements
// https://github.com/foundryvtt/pf2e/blob/v13-dev/src/module/rules/rule-element/base.ts
