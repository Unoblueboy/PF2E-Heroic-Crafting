import { ActorPF2e, CharacterPF2e } from "../../types/src/module/actor";
import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { Rarity } from "../../types/src/module/data";
import { PhysicalItemPF2e, SpellPF2e } from "../../types/src/module/item";
import { Coins } from "../../types/src/module/item/physical";
import { TokenDocumentPF2e, ScenePF2e } from "../../types/src/module/scene";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { ItemUUID } from "../../types/types/foundry/common/documents/_module.mjs";
import { ProjectItemDetails } from "../BeginProject/types.mjs";
import {
	addCoins,
	coinsToCoinString,
	coinsToCopperValue,
	copperValueToCoins,
	multCoins,
	subCoins,
} from "../Helper/currency.mjs";
import { Either, fractionToPercent } from "../Helper/generics.mjs";
import { addMaterialTroveValue } from "../MaterialTrove/materialTrove.mjs";
import { CraftProjectApplication, getItemDetails, getProjectMax } from "./Applications/CraftProjectApplications.mjs";
import {
	ProjectCraftDetails,
	ProjectCraftDuration,
	TreasureMaterialSpent,
	TreasurePostUseOperation,
} from "./types.mjs";

export async function craftProject(actor: ActorPF2e, projectId?: string) {
	if (!actor) return;
	if (!projectId) return;

	const craftDetails = await CraftProjectApplication.getCraftDetails({ actor, projectId });
	if (!craftDetails) return;

	const itemDetails = getItemDetails(actor, projectId);
	const totalSpent = await getTotalMaterialSpent(craftDetails);
	const item = (await foundry.utils.fromUuid(itemDetails.itemData.uuid)) as PhysicalItemPF2e;

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			const materials = await getMaterialsSpent();

			const baseItemLink = item.link;
			const craftItemLink = itemDetails.itemData.spellUuid
				? baseItemLink.replace(
						/(?<={).*(?=})/,
						await getWandOrScrollName(item, { spellUuid: itemDetails.itemData.spellUuid })
				  )
				: baseItemLink;
			const projectMax = await getProjectMax(itemDetails, item);
			const projectCur = itemDetails.value;
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/result.hbs",
				{
					item: item,
					actorUuid: actor.uuid,
					project: {
						id: projectId,
						max: coinsToCoinString(projectMax),
						cur: coinsToCoinString(projectCur),
						percent: fractionToPercent(coinsToCopperValue(projectCur), coinsToCopperValue(projectMax)),
					},
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(craftItemLink, {
						rollData: item.getRollData(),
					}),
					craftDetails: JSON.stringify(craftDetails),
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
			console.error("PF2E Heroic Crafting | Unable to amend chat message with craft result.", message);
		}
	}

	actor.skills?.crafting?.check?.roll({
		dc: { value: itemDetails.dc, visible: true },
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

	async function getMaterialsSpent() {
		if (!craftDetails) return [];
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
				quantity: treasureSpent.quantity,
				spent: coinsToCoinString(treasureSpent.value),
			});
		}
		return materials;
	}
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
		totalSpent += coinsToCopperValue(material.value) * (material.quantity ?? 1);
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

	const baseQuantity = item.quantity;
	const quantitySpent = material.quantity ?? 1;
	if (newCopperPrice == 0 && baseQuantity == quantitySpent) {
		await item.delete();
	} else if (newCopperPrice != 0 && baseQuantity == quantitySpent) {
		await item.update({ "system.price.value": newPrice });
	} else if (newCopperPrice == 0 && baseQuantity != quantitySpent) {
		await item.update({ "system.quantity": baseQuantity - quantitySpent });
	} else {
		await item.update({ "system.quantity": baseQuantity - quantitySpent });
		const clone = item.clone({
			system: { price: { value: newPrice }, quantity: quantitySpent },
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

export async function craftProjectChatButtonListener(message: ChatMessagePF2e, html: HTMLElement, _data: unknown) {
	const craftProjectResults = html.querySelector("[data-craft-project-results]");
	if (craftProjectResults) craftProjectResults.addEventListener("click", (e: Event) => updateProject(e, message));
}

async function updateProject(event: Event, message: ChatMessagePF2e) {
	if ((event.target as HTMLElement)?.tagName != "BUTTON") return;
	const button = event.target as HTMLButtonElement;
	const generalDiv = event.currentTarget as HTMLElement;

	const craftDetailsString = generalDiv.dataset["craftDetails"];
	if (!craftDetailsString) return;
	const craftDetails = JSON.parse(craftDetailsString ?? "") as ProjectCraftDetails;

	const actorUuid = generalDiv.dataset.actorUuid;
	if (!actorUuid) return;
	const actor = (await foundry.utils.fromUuid(actorUuid ?? "")) as ActorPF2e;

	const projectId = generalDiv.dataset.projectId as string;
	const outcome = button.dataset.outcome as DegreeOfSuccessString;
	const itemDetails = getItemDetails(actor, projectId);

	await useMaterialSpent(actor, craftDetails);

	const totalSpent = await getTotalMaterialSpent(craftDetails);
	let newProjectTotal: Coins = {};
	switch (outcome) {
		case "criticalFailure":
			newProjectTotal = subCoins(itemDetails.value, totalSpent);
			break;
		case "failure":
			newProjectTotal = addCoins(itemDetails.value, multCoins(0.5, totalSpent));
			break;
		case "criticalSuccess":
		case "success":
			newProjectTotal = addCoins(itemDetails.value, multCoins(2, totalSpent));
			break;
		default:
			break;
	}

	console.log(outcome, itemDetails.value, totalSpent, newProjectTotal);
	const item = (await foundry.utils.fromUuid(itemDetails.itemData.uuid)) as PhysicalItemPF2e;
	const newProjectTotalCopper = coinsToCopperValue(newProjectTotal);
	const projectMaxCopper = coinsToCopperValue(await getProjectMax(itemDetails, item));
	if (newProjectTotalCopper < 0) {
		actor.update({ [`flags.pf2eHeroicCrafting.projects.-=${projectId}`]: null });
		ui.notifications.info("Project Destroyed lol, git gud");
	} else if (newProjectTotalCopper >= projectMaxCopper) {
		await finishProject(item, itemDetails, actor as CharacterPF2e, projectId);
	} else {
		actor.update({ [`flags.pf2eHeroicCrafting.projects.${projectId}.value`]: newProjectTotal });
	}

	const projectProgressPercent = fractionToPercent(newProjectTotalCopper, projectMaxCopper);
	const internalBar = generalDiv.querySelector<HTMLDivElement>(".project-progress .progress-bar .internal-bar");
	if (internalBar) {
		internalBar.style = `width:${projectProgressPercent};`;
	}
	const internalBarSpan = generalDiv.querySelector<HTMLSpanElement>(
		".project-progress .progress-bar .internal-bar span"
	);
	if (internalBarSpan) {
		internalBarSpan.textContent = projectProgressPercent;
	}

	const curValueSpan = generalDiv.querySelector<HTMLSpanElement>(
		".project-progress .project-progress-line .project-cur-value"
	);
	if (curValueSpan) {
		curValueSpan.textContent = coinsToCoinString(newProjectTotal);
	}

	generalDiv.querySelectorAll<HTMLButtonElement>(".card-buttons button").forEach((button) => {
		button.disabled = true;
	});
	const flavorHtml = generalDiv.closest("span.flavor-text")?.innerHTML;
	if (flavorHtml) message.update({ flavor: flavorHtml });
}

async function finishProject(
	item: PhysicalItemPF2e,
	itemDetails: ProjectItemDetails,
	actor: CharacterPF2e,
	projectId: string
) {
	if (itemDetails.itemData.isFormula) {
		const formulas = actor.system.crafting?.formulas;
		if (!formulas) {
			return;
		}
		const uuid = itemDetails.itemData.uuid as ItemUUID;
		formulas.push({ uuid: uuid });
		actor.update({ "system.crafting.formulas": formulas });
		const newFormula = (await foundry.utils.fromUuid(uuid)) as PhysicalItemPF2e;
		ui.notifications.info(`Project Done, ${newFormula.name} Formula Created`);
	} else {
		const clone = item.clone();
		if (itemDetails.itemData.spellUuid) {
			const spell = (await foundry.utils.fromUuid(itemDetails.itemData.spellUuid)) as SpellPF2e;
			const spellObject = spell.toObject();
			spellObject.system.location.heightenedLevel = itemDetails.itemData.heightenedLevel;
			const description = clone.system.description.value;
			clone.updateSource({
				name: await getWandOrScrollName(item, { spell }),
				"system.spell": spellObject,
				"system.description.value": `<p>${spell.link}</p><hr />${description}`,
				"system.traits.value": [...item.traits.union(spell.traits)],
				"system.traits.rarity": getWandOrScrollRarity(item, spell),
			});
		}
		clone.updateSource({ "system.quantity": itemDetails.batchSize });
		const newItem = await Item.implementation.create(clone.toObject(), { parent: actor });
		ui.notifications.info(`Project Done, ${newItem!.name} Created`);
	}
	actor.update({ [`flags.pf2eHeroicCrafting.projects.-=${projectId}`]: null });
}

async function getWandOrScrollName(
	item: PhysicalItemPF2e,
	spellOptions: Either<
		{
			spell: SpellPF2e;
		},
		{
			spellUuid: string;
		}
	>
): Promise<string> {
	const itemSlug = item.slug;
	const spell = spellOptions.spell ?? ((await foundry.utils.fromUuid(spellOptions.spellUuid)) as SpellPF2e);
	const spellName = spell.name;
	if (itemSlug?.startsWith("magic-wand")) {
		const rank = (item.level - 1) / 2;
		return `Wand of ${spell.name} (Rank ${rank})`;
	}
	if (itemSlug?.startsWith("scroll-of")) {
		const rank = (item.level + 1) / 2;
		return `Scroll of ${spell.name} (Rank ${rank})`;
	}

	return item.name + ` (${spellName})`;
}

const RARITIES: readonly ["common", "uncommon", "rare", "unique"] = ["common", "uncommon", "rare", "unique"];
function getWandOrScrollRarity(item: PhysicalItemPF2e, spell: SpellPF2e): Rarity {
	const itemRarity = item.rarity;
	const itemRarityIndex = RARITIES.indexOf(itemRarity);
	const spellRarity = spell.rarity;
	const spellRarityIndex = RARITIES.indexOf(spellRarity);
	const rarityIndex = Math.max(itemRarityIndex, spellRarityIndex);
	return RARITIES[rarityIndex];
}
