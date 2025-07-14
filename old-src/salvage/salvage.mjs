import { copperValueToCoins, copperValueToCoinString, coinsToCopperValue } from "../helper/currency.mjs";
import { LEVEL_BASED_DC } from "../helper/limits.mjs";
import { addMaterialTroveValue } from "../MaterialTrove/materialTrove.mjs";
import { SalvageApplication } from "./Applications/SalvageApplication.mjs";

const SALVAGE_MATERIAL_UUID = "Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.R8QxNha74tYOrccl";

export async function salvage(actor, item, lockItem = false) {
	const salvageDetails = await GetSalvageDetails({ actor: actor, item: item, lockItem: lockItem });

	if (!salvageDetails) {
		return;
	}

	const salvageActor = salvageDetails.actor;
	const salvageItem = salvageDetails.item;
	const salvageItemLevel = salvageItem.level;

	// data-visibility
	const baseDC = LEVEL_BASED_DC.get(salvageItemLevel);
	const options = await (async () => {
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
			};
		}
	})();
	options.callback = async (roll, outcome, message, event) => {
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
					itemLink: await TextEditor.enrichHTML(salvageItem.link, {
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
					success: ["success", "criticalSuccess"].includes(outcome),
					savvyTeardown: salvageDetails.savvyTeardown,
				}
			);
			if (!!flavor) {
				message.updateSource({ flavor: message.flavor + flavor });
			}
			CONFIG.ChatMessage.documentClass.create(message.toObject());
		} else {
			console.error("PF2E | Unable to amend chat message with craft result.", message);
		}
	};
	await salvageActor.skills.crafting.check.roll(options);
}

export function salvageButtonListener(message, html, data) {
	const salvageResults = html.querySelector("[data-salvage-results]");
	if (!!salvageResults) salvageResults.addEventListener("click", (e) => gainMaterials(e, message));
}

async function gainMaterials(event, message) {
	if (event.target?.tagName != "BUTTON") return;
	const button = event.target;
	const generalDiv = event.currentTarget;
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

	generalDiv.querySelectorAll(".card-buttons button").forEach((button) => {
		button.disabled = true;
	});
	const flavorHtml = generalDiv.closest("span.flavor-text")?.innerHTML;
	if (!!flavorHtml) message.update({ flavor: flavorHtml });
}

async function gainSalvageMaterials(data) {
	const item = await fromUuid(data.itemUuid);
	const salvageMaxCoins = {
		pp: Number.parseInt(data.salvageMaxPp),
		gp: Number.parseInt(data.salvageMaxGp),
		sp: Number.parseInt(data.salvageMaxSp),
		cp: Number.parseInt(data.salvageMaxCp),
	};
	const duration = Number.parseInt(data.duration);
	const income = Number.parseInt(data.salvageIncome);
	const totalIncome = duration * income;

	const genericSalvage = await fromUuid(SALVAGE_MATERIAL_UUID);
	const salvageMaxCopper = coinsToCopperValue(salvageMaxCoins);
	const remainingSalvagePrice = Math.max(salvageMaxCopper - totalIncome, 0);
	if (item.slug != "generic-salvage-material") {
		const genericSalvageClone = genericSalvage.clone(
			{
				system: {
					level: { value: item.level },
					bulk: item.system.bulk,
					containerId: item.container,
					equipped: item.system.equipped,
					price: { value: copperValueToCoins(remainingSalvagePrice) },
				},
			},
			{ parent: item.actor }
		);
		if (remainingSalvagePrice > 0) {
			await Item.implementation.create(genericSalvageClone, { parent: item.actor });
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

async function gainSavvyTeardownMaterials(data) {
	const item = await fromUuid(data.itemUuid);
	const income = Number.parseInt(data.salvageIncome);

	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}

	await addMaterialTroveValue(item.actor, income);
}

export function checkItemPhysical(item) {
	return ["armor", "backpack", "book", "consumable", "equipment", "shield", "treasure", "weapon"].includes(item.type);
}

export async function GetSalvageDetails(options) {
	return new Promise((resolve, reject) => {
		const app = new SalvageApplication(
			Object.assign(options, {
				callback: resolve,
			})
		);
		app.render(true);
	});
}
