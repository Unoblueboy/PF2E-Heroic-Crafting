import { ChatMessagePF2e } from "../../types/src/module/chat-message/document";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { SALVAGE_MATERIAL_SLUG } from "../Helper/constants.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
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
	if (!data.itemUuid) return;
	const item = await fromUuid<PhysicalItemPF2e<CharacterPF2eHeroicCrafting>>(data.itemUuid);
	if (!item) return;
	if (!item.actor) return;

	const salvageMaxCoins = UnsignedCoinsPF2e.fromString(data.salvageMax ?? "");
	const duration = Number.parseInt(data.duration as string);
	const income = UnsignedCoinsPF2e.fromString(data.salvageIncome ?? "");
	const totalIncome = UnsignedCoinsPF2e.multiplyCoins(duration, income);

	const remainingSalvagePrice = UnsignedCoinsPF2e.subtractCoins(salvageMaxCoins, totalIncome, true);
	if (item.slug != SALVAGE_MATERIAL_SLUG) {
		await createSalvage(item, remainingSalvagePrice);
	} else if (remainingSalvagePrice.copperValue > 0) {
		await item.update({ "system.price.value": remainingSalvagePrice });
	} else {
		ui.notifications.info(`${item.name} fully salvaged`);
		await item.delete();
	}

	await addCoinsToActor(item.actor, UnsignedCoinsPF2e.minCoins(salvageMaxCoins, totalIncome));
}

async function gainSavvyTeardownMaterials(data: DOMStringMap) {
	if (!data.itemUuid) return;
	const item = await foundry.utils.fromUuid<PhysicalItemPF2e<CharacterPF2eHeroicCrafting>>(data.itemUuid);
	if (!item) return;
	if (!item.actor) return;
	const income = UnsignedCoinsPF2e.fromString(data.salvageIncome ?? "");

	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}

	await addCoinsToActor(item.actor, income);
}

async function addCoinsToActor(actor: CharacterPF2eHeroicCrafting, gainedCoins: UnsignedCoinsPF2e) {
	const materialTrove = await MaterialTrove.getMaterialTrove(actor, false);
	if (materialTrove) {
		await materialTrove.add(gainedCoins);
	} else {
		await actor.inventory.addCoins(gainedCoins);
		await ChatMessage.create({
			style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
			speaker: ChatMessage.getSpeaker(actor),
			content: `<i>No material trove was found on ${actor.name}</i>
			<br>
			<i>${gainedCoins} added directly to ${actor.name}'s inventory.</i>`,
		});
	}
}
