import { ActorPF2e } from "../../types/src/module/actor";
import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { Coins } from "../../types/src/module/item/physical";
import { TokenDocumentPF2e, ScenePF2e } from "../../types/src/module/scene";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { ProjectItemDetails } from "../BeginProject/types.mjs";
import { coinsToCoinString, coinsToCopperValue, copperValueToCoins } from "../Helper/currency.mjs";
import { addMaterialTroveValue } from "../MaterialTrove/materialTrove.mjs";
import {
	ProjectCraftDetails,
	ProjectCraftDuration,
	TreasureMaterialSpent,
	TreasurePostUseOperation,
} from "./types.mjs";

export async function craftProject(actor: ActorPF2e, projectId?: string) {
	if (!actor) return;
	if (!projectId) return;
	// TODO: Get projectId and totalSpent

	const craftDetails = await getCraftDetails({ actor, projectId });
	const totalSpent = await getTotalMaterialSpent(craftDetails);
	console.log(totalSpent);
	const item = (await foundry.utils.fromUuid(craftDetails.itemDetails.itemData.uuid)) as PhysicalItemPF2e;

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			const materials = [];
			if (craftDetails.materialsSpent.generic) {
				materials.push({
					item: {
						name: "Generic Crafting Material",
						img: "icons/tools/fasteners/nails-steel-brown.webp",
					},
					spent: coinsToCoinString(craftDetails.materialsSpent.generic),
				});
			}
			if (craftDetails.materialsSpent.currency) {
				materials.push({
					item: {
						name: "Currency",
						img: "systems/pf2e/icons/equipment/treasure/currency/gold-pieces.webp",
					},
					spent: coinsToCoinString(craftDetails.materialsSpent.currency),
				});
			}

			for (const treasureSpent of craftDetails.materialsSpent.treasure ?? []) {
				const treasure = await foundry.utils.fromUuid<PhysicalItemPF2e>(treasureSpent.uuid);
				if (!treasure) continue;

				materials.push({
					item: {
						name: treasure.name,
						img: treasure.img,
					},
					spent: coinsToCoinString(treasureSpent.value),
				});
			}

			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/result.hbs",
				{
					item: item,
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(item.link, {
						rollData: item.getRollData(),
					}),
					"craft-details": JSON.stringify(craftDetails),
					materials,
					totalMaterialsSpent: coinsToCoinString(totalSpent),
					outcome,
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

	actor.skills?.crafting?.check?.roll({
		dc: { value: craftDetails.itemDetails.dc, visible: true },
		extraRollOptions: ["action:craft-projct", "action:craft", "specialty"],
		extraRollNotes: [
			{
				selector: "crafting",
				text: "<strong>Success</strong> You work productively during this period. Add double this activity's Cost to the project's Current Value.",
				outcome: ["success", "criticalSuccess"],
			},
			{
				selector: "crafting",
				text: "<strong>Failure</strong> You work unproductively during this period. Add half this activity's Cost to the project's Current Value.",
				outcome: ["failure"],
			},
			{
				selector: "crafting",
				text: "<strong>Critical Failure</strong> You ruin your materials and suffer a setback while crafting. Deduct this activity's Cost from the project's Current Value. If this reduces the project's Current Value below 0, the project is ruined and must be started again.",
				outcome: ["criticalFailure"],
			},
		],
		label: await foundry.applications.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
			subtitle: "Crafting Check",
			title: "Craft A Project",
		}),
		traits: [craftDetails.duration == ProjectCraftDuration.HOUR ? "exploration" : "downtime", "manipulate"],
		createMessage: false,
		callback: getStatisticRollCallback,
	});

	// await useMaterialSpent(actor, craftDetails);
}

async function getCraftDetails(options: { actor: ActorPF2e; projectId: string }): Promise<ProjectCraftDetails> {
	const projects = options.actor.flags["pf2eHeroicCrafting"].projects as Record<string, ProjectItemDetails>;
	return {
		itemDetails: projects[options.projectId],
		materialsSpent: {
			generic: { cp: 1, sp: 2, gp: 3, pp: 4 },
			currency: { cp: 5, sp: 6, gp: 7, pp: 8 },
			treasure: [
				{
					uuid: "Actor.H1Q6r7n9442o2lks.Item.i2zZkjWqDVSrlhVv",
					value: { cp: 9, sp: 10, gp: 11, pp: 12 },
					postUseOperation: TreasurePostUseOperation.DECREASE_VALUE,
				},
			],
		},
		duration: ProjectCraftDuration.HOUR,
	};
}

async function getTotalMaterialSpent(craftDetails: ProjectCraftDetails): Promise<Coins> {
	const materialsSpent = craftDetails.materialsSpent;
	let totalSpent = 0;
	if (materialsSpent.generic) {
		const genericCraftingCost = coinsToCopperValue(materialsSpent.generic);
		totalSpent += genericCraftingCost;
	}
	if (materialsSpent.currency) {
		totalSpent += coinsToCopperValue(materialsSpent.currency);
	}
	for (const material of materialsSpent.treasure ?? []) {
		// material
		const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(material.uuid);
		if (!item) continue;
		totalSpent += coinsToCopperValue(material.value);
	}

	return copperValueToCoins(totalSpent);
}

async function updateSpentTreasure(item: PhysicalItemPF2e, material: TreasureMaterialSpent) {
	switch (material.postUseOperation) {
		case TreasurePostUseOperation.DELETE:
			await deleteItem(item);
			break;
		case TreasurePostUseOperation.DECREASE_VALUE:
			await decreaseTreasureValue(item, material);
			break;
		case TreasurePostUseOperation.NOTHING:
		default:
			break;
	}
}
async function decreaseTreasureValue(item: PhysicalItemPF2e, material: TreasureMaterialSpent) {
	const basePrice = item.price.value;
	const baseCopperPrice = basePrice.copperValue;
	const materialSpent = material.value;
	const materialCopperSpent = coinsToCopperValue(materialSpent);
	const newCopperPrice = Math.max(baseCopperPrice - materialCopperSpent, 0);
	const newPrice = copperValueToCoins(newCopperPrice);
	if (item.quantity == 1) {
		await item.update({ "system.price.value": newPrice });
	} else {
		await item.update({ "system.quantity": item.quantity - 1 });
		const clone = item.clone({
			system: { price: { value: newPrice } },
		});
		await Item.implementation.create(clone.toObject(), { parent: item.actor });
	}
}

async function deleteItem(item: PhysicalItemPF2e<ActorPF2e<TokenDocumentPF2e<ScenePF2e | null> | null> | null>) {
	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}
}

async function useMaterialSpent(actor: ActorPF2e, craftDetails: ProjectCraftDetails): Promise<void> {
	const materialsSpent = craftDetails.materialsSpent;
	if (materialsSpent.generic) {
		const genericCraftingCost = coinsToCopperValue(materialsSpent.generic);
		await addMaterialTroveValue(actor, -genericCraftingCost);
	}
	if (materialsSpent.currency) {
		await actor.inventory.removeCoins(materialsSpent.currency);
	}
	for (const material of materialsSpent.treasure ?? []) {
		const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(material.uuid);
		if (!item) continue;
		await updateSpentTreasure(item, material);
	}
}
