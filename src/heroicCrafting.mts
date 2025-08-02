import { salvage } from "./Salvage/salvage.mjs";
import { salvageChatButtonListener } from "./Salvage/chatListener.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { beginProject } from "./BeginProject/beginProject.mjs";
import { reverseEngineer } from "./ReverseEngineer/reverseEngineer.mjs";
import { craftProject } from "./CraftProject/craftProject.mjs";
import { craftProjectChatButtonListener } from "./CraftProject/chatListener.mjs";
import { ConsumablePF2e } from "../types/src/module/item";
import { junkCollectorOnConsume } from "./Feats/junkCollector.mjs";
import { HeroCraftingMenu } from "./Menu/HeroicCraftingMenu.mjs";
import { forageCraftingResources } from "./Forage/forager.mjs";

Hooks.once("init", async () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
		beginProject,
		reverseEngineer,
		craftProject,
		HeroCraftingMenu,
		forageCraftingResources,
	};

	const { TestRuleElement } = await import("./RuleElement/testElement.mjs");
	game.pf2e.RuleElements.custom.Test = TestRuleElement;
});

Hooks.once("ready", () => {
	libWrapper.register(
		"pf2e-heroic-crafting",
		"CONFIG.PF2E.Item.documentClasses.consumable.prototype.consume",
		async function (this: ConsumablePF2e, wrapped: (...args: unknown[]) => Promise<void>, ...args: unknown[]) {
			await junkCollectorOnConsume(this);
			const result = await wrapped(...args);
			return result;
		},
		"MIXED"
	);
});

Hooks.on("renderChatMessageHTML", (message, html, data) => {
	salvageChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	craftProjectChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
});
// https://github.com/Cerapter/pf2e-heroic-crafting-automation/tree/05a6b3ba592eaa3df92a87b5f3525182746cb13e/scripts/rule-elements
// https://github.com/foundryvtt/pf2e/blob/v13-dev/src/module/rules/rule-element/base.ts
