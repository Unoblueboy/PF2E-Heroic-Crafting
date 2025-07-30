import { CharacterPF2e } from "../../types/src/module/actor";
import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { PhysicalItemPF2e, TreasurePF2e } from "../../types/src/module/item";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { StatisticRollParameters } from "../../types/src/module/system/statistic";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { LEVEL_BASED_DC, SALVAGE_MATERIAL_SLUG, SALVAGE_MATERIAL_UUID } from "../Helper/constants.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { SalvageApplication } from "./Applications/SalvageApplication.mjs";
import { SalvageApplicationResult } from "./Applications/types.mjs";
import { CoinsPF2e } from "../../types/src/module/item/physical";

export async function salvage(actor: CharacterPF2e, item: PhysicalItemPF2e, lockItem = false) {
	const salvageDetails = await SalvageApplication.GetSalvageDetails({ actor: actor, item: item, lockItem: lockItem });

	if (!salvageDetails) {
		return;
	}

	const salvageActor = salvageDetails.actor;
	const options: StatisticRollParameters = await getStatisticRollParameters(salvageDetails);
	await salvageActor.skills?.crafting?.check?.roll(options);
}

async function getStatisticRollParameters(salvageDetails: SalvageApplicationResult): Promise<StatisticRollParameters> {
	const salvageItem = salvageDetails.item;
	const salvageItemLevel = salvageItem.level;
	const baseDC = LEVEL_BASED_DC.get(salvageItemLevel) ?? 0;

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			let incomeValue;
			switch (outcome) {
				case "criticalSuccess":
				case "success":
					incomeValue = salvageDetails.income.success;
					break;
				case "failure":
				case "criticalFailure":
					incomeValue = salvageDetails.income.failure;
					break;
				default:
					incomeValue = new game.pf2e.Coins();
					break;
			}

			const fullDuration =
				incomeValue.copperValue === 0
					? Infinity
					: Math.ceil(salvageDetails.max.copperValue / incomeValue.copperValue);
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/salvage/result.hbs",
				{
					item: salvageItem,
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(salvageItem.link, {
						rollData: salvageItem.getRollData(),
					}),
					salvage: {
						income: incomeValue,
						duration: { given: salvageDetails.duration, full: fullDuration },
						max: salvageDetails.max,
					},
					success: ["success", "criticalSuccess"].includes(outcome ?? ""),
					savvyTeardown: salvageDetails.savvyTeardown,
				}
			);
			if (flavor) {
				message.updateSource({ flavor: message.flavor + flavor });
			}
			ChatMessage.create(message.toObject());
		} else {
			console.error("PF2E | Unable to amend chat message with craft result.", message);
		}
	}

	if (salvageDetails.savvyTeardown) {
		return {
			dc: { value: baseDC + 5, visible: true },
			extraRollOptions: ["action:savvy-teardown", "specialty"],
			extraRollNotes: [
				{
					selector: "crafting",
					text: "<strong>Success</strong> Add half of the item's Salvage Maximum value or your Day value on Table 1: Spending Limit, whichever is less. The item is destroyed.",
					outcome: ["success", "criticalSuccess"],
				},
				{
					selector: "crafting",
					text: "<strong>Failure</strong> You gain no materials. The item is destroyed.",
					outcome: ["failure", "criticalFailure"],
				},
			],
			label: await foundry.applications.handlebars.renderTemplate(
				"systems/pf2e/templates/chat/action/header.hbs",
				{
					subtitle: "Crafting Check",
					title: "Savvy Teardown",
				}
			),
			traits: ["exploration"],
			createMessage: false,
			callback: getStatisticRollCallback,
		};
	} else {
		return {
			dc: { value: baseDC, visible: true },
			extraRollOptions: ["action:salvage-item"],
			extraRollNotes: [
				{
					selector: "crafting",
					text: "<strong>Success</strong> Add the amount listed on Table 2: Gathered Income for the item's level to your Material Trove each hour. If you are a master in Crafting, instead add twice as much. The item becomes unusable.",
					outcome: ["success", "criticalSuccess"],
				},
				{
					selector: "crafting",
					text: "<strong>Failure</strong> Add half the amount listed on Table 2: Gathered Income for the item's level to your Material Trove each hour. If you are a master in Crafting, instead add the listed amount. The item becomes unusable.",
					outcome: ["failure", "criticalFailure"],
				},
			],
			label: await foundry.applications.handlebars.renderTemplate(
				"systems/pf2e/templates/chat/action/header.hbs",
				{
					subtitle: "Crafting Check",
					title: "Salvage Item",
				}
			),
			traits: ["exploration"],
			createMessage: false,
			callback: getStatisticRollCallback,
		};
	}
}

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

	const remainingSalvagePrice = CoinsPF2eUtility.maxCoins(
		CoinsPF2eUtility.subCoins(salvageMaxCoins, totalIncome),
		new game.pf2e.Coins()
	);
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

export async function createSalvage(item: PhysicalItemPF2e, priceValue?: CoinsPF2e) {
	priceValue ??= CoinsPF2eUtility.multCoins(1 / 2, item.price.value); // Use default salvage value of 50%
	const genericSalvage = (await fromUuid(SALVAGE_MATERIAL_UUID)) as TreasurePF2e;
	const genericSalvageClone = genericSalvage.clone({
		system: {
			level: { value: item.level },
			bulk: item.system.bulk,
			containerId: item.container,
			equipped: item.system.equipped,
			price: { value: priceValue },
		},
	});
	if (priceValue.copperValue > 0) {
		await Item.implementation.create(genericSalvageClone.toObject(), { parent: item.actor });
	} else {
		ui.notifications.info(`${item.name} fully salvaged`);
	}

	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}
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
