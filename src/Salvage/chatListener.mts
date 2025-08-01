import { CharacterPF2e } from "../../types/src/module/actor";
import { ChatMessagePF2e } from "../../types/src/module/chat-message/document";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { SALVAGE_MATERIAL_SLUG } from "../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { createSalvage } from "./salvage.mjs";

export function salvageChatButtonListener(message: ChatMessagePF2e, html: HTMLElement, _data: unknown) {
	const salvageResults = html.querySelector("[data-salvage-results]");
	if (salvageResults) salvageResults.addEventListener("click", (e: Event) => gainMaterials(e, message));
}

async function gainMaterials(event: Event, message: ChatMessagePF2e) {
	if ((event.target as HTMLElement)?.tagName != "BUTTON") return;
	const button = event.target as HTMLButtonElement;
	const generalDiv = event.currentTarget as HTMLElement;
	const data = foundry.utils.mergeObject(generalDiv.dataset, button.dataset);

	switch (data.action) {
		case "gain-salvage-materials":
			await gainSalvageMaterials(data);
			break;
		case "gain-savvy-teardown-materials":
			await gainSavvyTeardownMaterials(data);
			break;

		default:
			break;
	}

	generalDiv.querySelectorAll<HTMLButtonElement>(".card-buttons button").forEach((button) => {
		button.disabled = true;
	});
	const flavorHtml = generalDiv.closest("span.flavor-text")?.innerHTML;
	if (flavorHtml) message.update({ flavor: flavorHtml });
}

async function gainSalvageMaterials(data: DOMStringMap) {
	const item = (await fromUuid(data.itemUuid as string)) as PhysicalItemPF2e;
	if (!item) return;
	if (!item.actor) return;

	const salvageMaxCoins = game.pf2e.Coins.fromString(data.salvageMax ?? "");
	const duration = Number.parseInt(data.duration as string);
	const income = game.pf2e.Coins.fromString(data.salvageIncome ?? "");
	const totalIncome = CoinsPF2eUtility.multCoins(duration, income);

	const remainingSalvagePrice = CoinsPF2eUtility.subCoins(salvageMaxCoins, totalIncome);
	if (item.slug != SALVAGE_MATERIAL_SLUG) {
		await createSalvage(item, remainingSalvagePrice);
	} else if (remainingSalvagePrice.copperValue > 0) {
		await item.update({ "system.price.value": remainingSalvagePrice });
	} else {
		ui.notifications.info(`${item.name} fully salvaged`);
		await item.delete();
	}

	await MaterialTrove.addValue(item.actor as CharacterPF2e, CoinsPF2eUtility.minCoins(salvageMaxCoins, totalIncome));
}

async function gainSavvyTeardownMaterials(data: DOMStringMap) {
	const item = (await fromUuid(data.itemUuid as string)) as PhysicalItemPF2e;
	if (!item) return;
	if (!item.actor) return;
	const income = game.pf2e.Coins.fromString(data.salvageIncome ?? "");

	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}

	await MaterialTrove.addValue(item.actor as CharacterPF2e, income);
}
