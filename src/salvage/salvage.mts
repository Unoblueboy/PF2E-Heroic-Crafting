import { ActorPF2e } from "../../types/src/module/actor";
import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../types/src/module/item";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { StatisticRollParameters } from "../../types/src/module/system/statistic";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { copperValueToCoins, copperValueToCoinString, coinsToCopperValue } from "../helper/currency.mjs";
import { LEVEL_BASED_DC } from "../helper/constants.mjs";
import { addMaterialTroveValue } from "../MaterialTrove/materialTrove.mjs";
import { SalvageApplication } from "./Applications/SalvageApplication.mjs";
import { SalvageApplicationResult } from "./Applications/types.mjs";

const SALVAGE_MATERIAL_UUID = "Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.R8QxNha74tYOrccl";

export async function salvage(actor: ActorPF2e, item: PhysicalItemPF2e, lockItem = false) {
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
		roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			let incomeCopperValue;
			switch (outcome) {
				case "criticalSuccess":
				case "success":
					incomeCopperValue = salvageDetails.income.success;
					break;
				case "failure":
				case "criticalFailure":
					incomeCopperValue = salvageDetails.income.failure;
					break;
				default:
					incomeCopperValue = 0;
					break;
			}

			const fullDuration =
				incomeCopperValue == 0
					? Infinity
					: Math.ceil(coinsToCopperValue(salvageDetails.max) / incomeCopperValue);
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/salvage/result.hbs",
				{
					item: salvageItem,
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(salvageItem.link, {
						rollData: salvageItem.getRollData(),
					}),
					salvage: {
						income: {
							copperValue: incomeCopperValue,
							string: copperValueToCoinString(incomeCopperValue),
						},
						duration: { given: salvageDetails.duration, full: fullDuration },
						max: salvageDetails.max,
					},
					success: ["success", "criticalSuccess"].includes(outcome ?? ""),
					savvyTeardown: salvageDetails.savvyTeardown,
				}
			);
			if (!!flavor) {
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

export function salvageButtonListener(message: ChatMessagePF2e, html: HTMLElement, data: any) {
	const salvageResults = html.querySelector("[data-salvage-results]");
	if (!!salvageResults) salvageResults.addEventListener("click", (e: Event) => gainMaterials(e, message));
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
	if (!!flavorHtml) message.update({ flavor: flavorHtml });
}

async function gainSalvageMaterials(data: DOMStringMap) {
	const item = (await fromUuid(data.itemUuid as string)) as PhysicalItemPF2e;
	if (!item || !item.actor) return;

	const salvageMaxCoins = {
		pp: Number.parseInt(data.salvageMaxPp as string),
		gp: Number.parseInt(data.salvageMaxGp as string),
		sp: Number.parseInt(data.salvageMaxSp as string),
		cp: Number.parseInt(data.salvageMaxCp as string),
	};
	const duration = Number.parseInt(data.duration as string);
	const income = Number.parseInt(data.salvageIncome as string);
	const totalIncome = duration * income;

	const genericSalvage = (await fromUuid(SALVAGE_MATERIAL_UUID)) as TreasurePF2e;
	const salvageMaxCopper = coinsToCopperValue(salvageMaxCoins);
	const remainingSalvagePrice = Math.max(salvageMaxCopper - totalIncome, 0);
	if (item.slug != "generic-salvage-material") {
		const genericSalvageClone = genericSalvage.clone({
			system: {
				level: { value: item.level },
				bulk: item.system.bulk,
				containerId: item.container,
				equipped: item.system.equipped,
				price: { value: copperValueToCoins(remainingSalvagePrice) },
			},
		});
		if (remainingSalvagePrice > 0) {
			await Item.implementation.create(genericSalvageClone.toObject(), { parent: item.actor });
		} else {
			ui.notifications.info(`${item.name} fully salvaged`);
		}

		if (item.quantity > 1) {
			await item.update({ "system.quantity": item.quantity - 1 });
		} else {
			await item.delete();
		}
	} else {
		if (remainingSalvagePrice > 0) {
			await item.update({ "system.price.value": copperValueToCoins(remainingSalvagePrice) });
		} else {
			ui.notifications.info(`${item.name} fully salvaged`);
			await item.delete();
		}
	}

	await addMaterialTroveValue(item.actor, Math.min(salvageMaxCopper, totalIncome));
}

async function gainSavvyTeardownMaterials(data: DOMStringMap) {
	const item = (await fromUuid(data.itemUuid as string)) as PhysicalItemPF2e;
	if (!item || !item.actor) return;
	const income = Number.parseInt(data.salvageIncome as string);

	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}

	await addMaterialTroveValue(item.actor, income);
}
