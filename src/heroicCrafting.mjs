import { salvage, salvageButtonListener } from "./salvage/salvage.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
	};
});

Hooks.on("renderChatMessageHTML", (message, html, data) => salvageButtonListener(message, html, data));
