import type { SalvageApplicationResult } from "./Applications/types.mjs";
import type { CharacterPF2eHeroicCrafting } from "../character.mjs";
import type { UnsignedCoins } from "../Helper/currencyTypes.mjs";
import type {
	PhysicalItemPF2e,
	StatisticRollParameters,
	CheckRoll,
	DegreeOfSuccessString,
	ChatMessagePF2e,
	TreasurePF2e,
} from "foundry-pf2e";
import type { Rolled } from "foundry-pf2e/foundry/client/dice/roll.mjs";

import { SALVAGE_MATERIAL_UUID } from "../Helper/constants.mjs";
import { SalvageApplication } from "./Applications/SalvageApplication.mjs";
import { calculateDC } from "../Helper/dc.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";

export async function salvage(actor: CharacterPF2eHeroicCrafting, item?: PhysicalItemPF2e, lockItem = false) {
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
	const baseDC = calculateDC(salvageItem.level, salvageItem.rarity) ?? 0;

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			const incomeValue = (() => {
				switch (outcome) {
					case "criticalSuccess":
						return salvageDetails.income.criticalSuccess ?? salvageDetails.income.success;
					case "success":
						return salvageDetails.income.success;
					case "failure":
						return salvageDetails.income.failure;
					case "criticalFailure":
						return salvageDetails.income.criticalFailure ?? salvageDetails.income.failure;

					default:
						return new UnsignedCoinsPF2e();
				}
			})();

			const fullDuration =
				UnsignedCoinsPF2e.getCopperValue(incomeValue) === 0
					? Infinity
					: Math.ceil(
							UnsignedCoinsPF2e.getCopperValue(salvageDetails.max) /
								UnsignedCoinsPF2e.getCopperValue(incomeValue)
					  );
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
			extraRollOptions: [...salvageDetails.rollOptions],
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
			extraRollOptions: [...salvageDetails.rollOptions],
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

export async function createSalvage(item: PhysicalItemPF2e, priceValue?: UnsignedCoins) {
	priceValue ??= UnsignedCoinsPF2e.multiplyCoins(1 / 2, item.price.value); // Use default salvage value of 50%
	const genericSalvage = (await fromUuid(SALVAGE_MATERIAL_UUID)) as TreasurePF2e;
	const genericSalvageClone = genericSalvage.clone({
		system: {
			level: { value: item.level },
			bulk: item.system.bulk,
			containerId: item.container,
			equipped: item.system.equipped,
			price: { value: priceValue },
			traits: {
				rarity: item.rarity,
			},
		},
	});
	if (UnsignedCoinsPF2e.getCopperValue(priceValue) > 0) {
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
