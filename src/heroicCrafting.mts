import { salvage, salvageButtonListener } from "./salvage/salvage.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { GamePF2e } from "../types/src/global";
import { ChatMessagePF2e } from "../types/src/module/chat-message";

interface GamePF2eHeroicCrafting extends GamePF2e {
	pf2eHeroicCrafting: any;
}

declare global {
	namespace globalThis {
		const game: GamePF2eHeroicCrafting;
	}
}

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
	};
});

Hooks.on("renderChatMessageHTML", (message, html, data) =>
	salvageButtonListener(message as ChatMessagePF2e, html as HTMLElement, data)
);
