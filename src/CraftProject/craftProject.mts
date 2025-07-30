import { CharacterPF2e } from "../../types/src/module/actor";
import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { CoinsPF2e } from "../../types/src/module/item/physical";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { fractionToPercent } from "../Helper/generics.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { Projects } from "../Projects/projects.mjs";
import { CraftProjectApplication } from "./Applications/CraftProjectApplications.mjs";
import {
	ProjectCraftDetails,
	ProjectCraftDuration,
	TreasureMaterialSpent,
	TreasurePostUseOperation,
} from "./types.mjs";

export async function craftProject(actor: CharacterPF2e, projectId?: string) {
	if (!actor) return;
	if (!projectId) return;
	const projects = Projects.getProjects(actor);
	if (!projects) return;
	const project = projects.getProject(projectId);
	if (!project) return;

	const craftDetails = await CraftProjectApplication.getCraftDetails({ actor, projectId });
	if (!craftDetails) return;

	const totalSpent = await getTotalMaterialSpent(craftDetails);
	const item = (await foundry.utils.fromUuid(project.itemData.uuid)) as PhysicalItemPF2e;

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			if (!project) return; // this should never happen
			const materials = await getMaterialsSpent(craftDetails);

			const projectMax = await project.max;
			const projectCur = project.value;
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/result.hbs",
				{
					item: item,
					actorUuid: actor.uuid,
					project: {
						id: project.id,
						max: await project.max,
						cur: projectCur,
						percent: fractionToPercent(projectCur.copperValue, projectMax.copperValue),
					},
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(await project.itemLink, {
						rollData: item.getRollData(),
					}),
					craftDetails: JSON.stringify(craftDetails),
					materials,
					totalMaterialsSpent: totalSpent,
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
		dc: { value: project.dc, visible: true },
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
		traits: [craftDetails.duration === ProjectCraftDuration.HOUR ? "exploration" : "downtime", "manipulate"],
		createMessage: false,
		callback: getStatisticRollCallback,
	});
}

async function getMaterialsSpent(craftDetails?: ProjectCraftDetails) {
	if (!craftDetails) return [];
	const materials = [];
	if (craftDetails.materialsSpent.generic) {
		materials.push({
			item: {
				name: "Generic Crafting Material",
				img: "icons/tools/fasteners/nails-steel-brown.webp",
			},
			spent: craftDetails.materialsSpent.generic,
		});
	}
	if (craftDetails.materialsSpent.currency) {
		materials.push({
			item: {
				name: "Currency",
				img: "systems/pf2e/icons/equipment/treasure/currency/gold-pieces.webp",
			},
			spent: craftDetails.materialsSpent.currency,
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
			spent: treasureSpent.value,
		});
	}
	return materials;
}

async function getTotalMaterialSpent(craftDetails: ProjectCraftDetails): Promise<CoinsPF2e> {
	const materialsSpent = craftDetails.materialsSpent;
	let totalSpent = new game.pf2e.Coins();
	if (materialsSpent.generic) {
		totalSpent = totalSpent.plus(materialsSpent.generic);
	}
	if (materialsSpent.currency) {
		totalSpent = totalSpent.plus(materialsSpent.currency);
	}
	for (const material of materialsSpent.treasure ?? []) {
		const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(material.uuid);
		if (!item) continue;
		totalSpent = totalSpent.plus(CoinsPF2eUtility.multCoins(material.quantity ?? 1, material.value));
	}

	return totalSpent;
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
	const materialSpent = material.value;
	const newPrice = CoinsPF2eUtility.maxCoins(
		CoinsPF2eUtility.subCoins(basePrice, materialSpent),
		new game.pf2e.Coins()
	);

	const baseQuantity = item.quantity;
	const quantitySpent = material.quantity ?? 1;
	if (newPrice.copperValue === 0 && baseQuantity === quantitySpent) {
		await item.delete();
	} else if (newPrice.copperValue != 0 && baseQuantity === quantitySpent) {
		await item.update({ "system.price.value": newPrice });
	} else if (newPrice.copperValue === 0 && baseQuantity != quantitySpent) {
		await item.update({ "system.quantity": baseQuantity - quantitySpent });
	} else {
		await item.update({ "system.quantity": baseQuantity - quantitySpent });
		const clone = item.clone({
			system: { price: { value: newPrice }, quantity: quantitySpent },
		});
		await Item.implementation.create(clone.toObject(), { parent: item.actor });
	}
}

async function deleteItem(item: PhysicalItemPF2e) {
	if (item.quantity > 1) {
		await item.update({ "system.quantity": item.quantity - 1 });
	} else {
		await item.delete();
	}
}

async function useMaterialSpent(actor: CharacterPF2e, craftDetails: ProjectCraftDetails): Promise<void> {
	const materialsSpent = craftDetails.materialsSpent;
	if (materialsSpent.generic) {
		await MaterialTrove.subtractValue(actor, materialsSpent.generic);
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
	const actor = (await foundry.utils.fromUuid(actorUuid ?? "")) as CharacterPF2e;

	const projectId = generalDiv.dataset.projectId as string;
	const outcome = button.dataset.outcome as DegreeOfSuccessString;
	const project = Projects.getProject(actor, projectId);
	if (!project) return;

	await useMaterialSpent(actor, craftDetails);

	const totalSpent = await getTotalMaterialSpent(craftDetails);
	let newProjectTotal: CoinsPF2e = new game.pf2e.Coins();
	switch (outcome) {
		case "criticalFailure":
			newProjectTotal = CoinsPF2eUtility.subCoins(project.value, totalSpent);
			break;
		case "failure":
			newProjectTotal = CoinsPF2eUtility.addCoins(project.value, CoinsPF2eUtility.multCoins(0.5, totalSpent));
			break;
		case "criticalSuccess":
		case "success":
			newProjectTotal = CoinsPF2eUtility.addCoins(project.value, CoinsPF2eUtility.multCoins(2, totalSpent));
			break;
		default:
			break;
	}

	const projectMax = await project.max;
	if (newProjectTotal.copperValue < 0) {
		await Projects.deleteProject(actor, projectId);
	} else if (newProjectTotal.copperValue >= projectMax.copperValue) {
		await project.createItem();
		await project.delete();
	} else {
		await project.setValue(newProjectTotal);
	}

	const projectProgressPercent = fractionToPercent(newProjectTotal.copperValue, projectMax.copperValue);
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
		curValueSpan.textContent = newProjectTotal.toString();
	}

	generalDiv.querySelectorAll<HTMLButtonElement>(".card-buttons button").forEach((button) => {
		button.disabled = true;
	});
	const flavorHtml = generalDiv.closest("span.flavor-text")?.innerHTML;
	if (flavorHtml) message.update({ flavor: flavorHtml });
}
