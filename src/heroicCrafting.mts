import { ChatMessagePF2e } from "../types/src/module/chat-message";
import { ConsumablePF2e } from "../types/src/module/item";
import { forageCraftingResources, forageSocketListener } from "./Forage/forager.mjs";
import { HeroCraftingMenu } from "./Menu/HeroicCraftingMenu.mjs";
import { beginProject } from "./BeginProject/beginProject.mjs";
import { reverseEngineer } from "./ReverseEngineer/reverseEngineer.mjs";
import { craftProject } from "./CraftProject/craftProject.mjs";
import { salvage } from "./Salvage/salvage.mjs";
import { editProject } from "./EditProject/editProject.mjs";
import { junkCollectorOnConsume } from "./Feats/junkCollector.mjs";
import { salvageChatButtonListener } from "./Salvage/chatListener.mjs";
import { craftProjectChatButtonListener } from "./CraftProject/chatListener.mjs";
import { forageCraftingResourcesChatButtonListener } from "./Forage/chatListener.mjs";
import { initRuleElements } from "./RuleElement/initRuleElements.mjs";
import { MaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { SignedCoins, UnsignedCoins } from "./Helper/currencyTypes.mjs";
import { UnsignedCoinsPF2e } from "./Helper/unsignedCoins.mjs";
import { SignedCoinsPF2e } from "./Helper/signedCoins.mjs";

Handlebars.registerHelper("padStart", (objectToFormat: unknown, maxLength: number, fillString: string) => {
	console.assert(typeof maxLength === "number", "Max Length expected to be number");
	console.assert(typeof fillString === "string", "Fill string expected to be number");
	const formatString = String(objectToFormat);
	return fillString ? formatString.padStart(maxLength, fillString) : formatString.padStart(maxLength);
});

Handlebars.registerHelper("formatCoin", (coins: SignedCoins | UnsignedCoins, ignoreSign: boolean = false) => {
	if (!ignoreSign) return SignedCoinsPF2e.toString(coins);

	const coinsCopy = foundry.utils.deepClone(coins);
	delete coins.isNegative;
	return UnsignedCoinsPF2e.toString(coinsCopy as UnsignedCoins);
});

Hooks.once("init", () => {
	console.log("Heroic Crafting | Initializing game variables");
	game.pf2eHeroicCrafting = {
		salvage,
		beginProject,
		reverseEngineer,
		craftProject,
		openHeroCraftingMenu: HeroCraftingMenu.openHeroCraftingMenu,
		forageCraftingResources,
		editProject,
		MaterialTrove,
	};

	initRuleElements();

	MaterialTrove.onInit();
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

	MaterialTrove.onReady();

	game.socket.on("module.pf2e-heroic-crafting", forageSocketListener);
});

Hooks.on("renderChatMessageHTML", async (message, html, data) => {
	salvageChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	craftProjectChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
	forageCraftingResourcesChatButtonListener(message as ChatMessagePF2e, html as HTMLElement, data);
});
