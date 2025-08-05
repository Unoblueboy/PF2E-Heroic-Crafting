import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { ConsumablePF2e } from "../types/src/module/item";

Hooks.once("init", async () => {
	const { CharacterPF2eHeroicCrafting } = await import("./character.mjs");
	CONFIG.PF2E.Actor.documentClasses.character = CharacterPF2eHeroicCrafting;

	const { TestRuleElement } = await import("./RuleElement/testElement.mjs");
	const { ModifyProgressRuleElement } = await import("./RuleElement/modifyProgressElement.mjs");
	game.pf2e.RuleElements.custom.Test = TestRuleElement;
	game.pf2e.RuleElements.custom.ModifyProgress = ModifyProgressRuleElement;

	const { HeroicCraftingProjectHelper } = await import("./character.mjs");
	const { forageCraftingResources } = await import("./Forage/forager.mjs");
	const { HeroCraftingMenu } = await import("./Menu/HeroicCraftingMenu.mjs");
	const { beginProject } = await import("./BeginProject/beginProject.mjs");
	const { reverseEngineer } = await import("./ReverseEngineer/reverseEngineer.mjs");
	const { craftProject } = await import("./CraftProject/craftProject.mjs");
	const { editMaterialTrove } = await import("./MaterialTrove/materialTrove.mjs");
	const { salvage } = await import("./Salvage/salvage.mjs");
	const { editProject } = await import("./EditProject/editProject.mjs");

	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
		beginProject,
		reverseEngineer,
		craftProject,
		HeroCraftingMenu,
		forageCraftingResources,
		editProject,
		HeroicCraftingProjectHelper,
	};
});

Hooks.once("ready", async () => {
	const { junkCollectorOnConsume } = await import("./Feats/junkCollector.mjs");

	const { forageSocketListener } = await import("./Forage/forager.mjs");

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

	game.socket.on("module.pf2e-heroic-crafting", forageSocketListener);
});

Hooks.on("renderChatMessageHTML", async (message, html, data) => {
	const { salvageChatButtonListener } = await import("./Salvage/chatListener.mjs");
	const { craftProjectChatButtonListener } = await import("./CraftProject/chatListener.mjs");
	const { forageCraftingResourcesChatButtonListener } = await import("./Forage/chatListener.mjs");

	salvageChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	craftProjectChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	forageCraftingResourcesChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
});
// https://github.com/Cerapter/pf2e-heroic-crafting-automation/tree/05a6b3ba592eaa3df92a87b5f3525182746cb13e/scripts/rule-elements
// https://github.com/foundryvtt/pf2e/blob/v13-dev/src/module/rules/rule-element/base.ts
