import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { ConsumablePF2e } from "../types/src/module/item";
import { forageCraftingResources, forageSocketListener } from "./Forage/forager.mjs";
import { HeroCraftingMenu } from "./Menu/HeroicCraftingMenu.mjs";
import { beginProject } from "./BeginProject/beginProject.mjs";
import { reverseEngineer } from "./ReverseEngineer/reverseEngineer.mjs";
import { craftProject } from "./CraftProject/craftProject.mjs";
import { editMaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { salvage } from "./Salvage/salvage.mjs";
import { editProject } from "./EditProject/editProject.mjs";
import { junkCollectorOnConsume } from "./Feats/junkCollector.mjs";
import { salvageChatButtonListener } from "./Salvage/chatListener.mjs";
import { craftProjectChatButtonListener } from "./CraftProject/chatListener.mjs";
import { forageCraftingResourcesChatButtonListener } from "./Forage/chatListener.mjs";
import { initRuleElements } from "./RuleElement/initRuleElements.mjs";

Handlebars.registerHelper("padStart", (objectToFormat: unknown, maxLength: number, fillString: string) => {
	console.assert(typeof maxLength === "number", "Max Length expected to be number");
	console.assert(typeof fillString === "string", "Fill string expected to be number");
	const formatString = String(objectToFormat);
	return fillString ? formatString.padStart(maxLength, fillString) : formatString.padStart(maxLength);
});

Hooks.once("init", () => {
	console.log("Heroic Crafting | Initializing game variables");
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
		beginProject,
		reverseEngineer,
		craftProject,
		HeroCraftingMenu,
		forageCraftingResources,
		editProject,
	};

	initRuleElements();
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

	game.socket.on("module.pf2e-heroic-crafting", forageSocketListener);
});

Hooks.on("renderChatMessageHTML", async (message, html, data) => {
	salvageChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	craftProjectChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	forageCraftingResourcesChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
});
