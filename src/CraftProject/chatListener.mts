import { ChatMessagePF2e } from "../../types/src/module/chat-message/document";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { fractionToPercent } from "../Helper/generics.mjs";
import { SignedCoins, SignedCoinsPF2e } from "../Helper/signedCoins.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { AProject, Projects } from "../Projects/projects.mjs";
import { CraftProjectUtility } from "./craftProjectUtility.mjs";
import { ProjectCraftDetails, TreasureMaterialSpent, TreasurePostUseOperation } from "./types.mjs";

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
	const craftDetails = JSON.parse(craftDetailsString) as ProjectCraftDetails;

	const actorUuid = generalDiv.dataset.actorUuid;
	if (!actorUuid) return;

	const actor = await foundry.utils.fromUuid<CharacterPF2eHeroicCrafting>(actorUuid);
	if (!actor) return;

	const projectId = generalDiv.dataset.projectId as string;
	const outcome = button.dataset.outcome as DegreeOfSuccessString;
	const project = Projects.getProject(actor, projectId);
	if (!project) return;

	await useMaterialSpent(actor, craftDetails);

	const totalSpent = await CraftProjectUtility.getTotalCost(craftDetails.materialsSpent);
	const newProjectTotal: SignedCoinsPF2e = getNewProjectTotal(outcome, project, totalSpent);

	const projectMax = new game.pf2e.Coins(await project.max);
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

	setHtmlElementText(generalDiv, ".project-progress .progress-bar .internal-bar span", projectProgressPercent);

	setHtmlElementText(
		generalDiv,
		".project-progress .project-progress-line .project-cur-value",
		newProjectTotal.toString()
	);

	generalDiv.querySelectorAll<HTMLButtonElement>(".card-buttons button").forEach((button) => {
		button.disabled = true;
	});
	const flavorHtml = generalDiv.closest("span.flavor-text")?.innerHTML;
	if (flavorHtml) message.update({ flavor: flavorHtml });
}

function getNewProjectTotal(outcome: string, project: AProject, totalSpent: SignedCoins): SignedCoinsPF2e {
	switch (outcome) {
		case "criticalFailure":
			return SignedCoinsPF2e.subtractCoins(project.value, totalSpent);
		case "failure":
			return SignedCoinsPF2e.addCoins(project.value, SignedCoinsPF2e.multiplyCoins(0.5, totalSpent));
		case "criticalSuccess":
		case "success":
			return SignedCoinsPF2e.addCoins(project.value, SignedCoinsPF2e.multiplyCoins(2, totalSpent));
		default:
			return new SignedCoinsPF2e();
	}
}

async function useMaterialSpent(actor: CharacterPF2eHeroicCrafting, craftDetails: ProjectCraftDetails): Promise<void> {
	const materialsSpent = craftDetails.materialsSpent;
	if (materialsSpent.trove) {
		await MaterialTrove.subtractValue(actor, materialsSpent.trove);
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

function setHtmlElementText(generalDiv: HTMLElement, selector: string, newProjectTotal: string) {
	const textElement = generalDiv.querySelector<HTMLElement>(selector);
	if (textElement) {
		textElement.textContent = newProjectTotal;
	}
}
