import { ChatMessagePF2e } from "../../types/src/module/chat-message/document";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { fractionToPercent } from "../Helper/generics.mjs";
import { hasFeat } from "../Helper/item.mjs";
import { SignedCoinsPF2e } from "../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { AProject, Projects } from "../Projects/projects.mjs";
import { CraftProjectUtility } from "./craftProjectUtility.mjs";
import { ProjectCraftDetails } from "./types.mjs";

export async function craftProjectChatButtonListener(message: ChatMessagePF2e, html: HTMLElement, _data: unknown) {
	const craftProjectResults = html.querySelector("[data-craft-project-results]");
	if (craftProjectResults)
		craftProjectResults.addEventListener("click", (e: Event) => craftProjectEventListener(e, message));
}

async function craftProjectEventListener(event: Event, message: ChatMessagePF2e) {
	if ((event.target as HTMLElement)?.tagName != "BUTTON") return;

	const generalDiv = event.currentTarget as HTMLElement;

	const generalDataset = generalDiv.dataset;

	const craftDetailsString = generalDataset["craftDetails"];
	if (!craftDetailsString) return;
	const craftDetails = JSON.parse(craftDetailsString) as ProjectCraftDetails;

	const actorUuid = generalDataset.actorUuid;
	if (!actorUuid) return;

	const actor = await foundry.utils.fromUuid<CharacterPF2eHeroicCrafting>(actorUuid);
	if (!actor) return;

	const projectId = generalDataset.projectId as string;
	const project = Projects.getProject(actor, projectId);
	if (!project) return;

	if (Object.hasOwn(generalDataset, "autoCreate")) {
		autoCreateProject(actor, craftDetails, project);
		return;
	}

	await updateProject(event, actor, craftDetails, project, generalDiv, message);
}

async function autoCreateProject(
	actor: CharacterPF2eHeroicCrafting,
	craftDetails: ProjectCraftDetails,
	project: AProject
) {
	await project.createItem();
	await project.delete();
	await CraftProjectUtility.useMaterialSpent(actor, craftDetails);
}

async function updateProject(
	event: Event,
	actor: CharacterPF2eHeroicCrafting,
	craftDetails: ProjectCraftDetails,
	project: AProject,
	generalDiv: HTMLElement,
	message: ChatMessagePF2e
) {
	const button = event.target as HTMLButtonElement;
	const outcome = button.dataset.outcome as DegreeOfSuccessString;
	await CraftProjectUtility.useMaterialSpent(actor, craftDetails);
	await doEfficientCrafting(actor, craftDetails, outcome);

	const newProjectTotal: SignedCoinsPF2e = SignedCoinsPF2e.addCoins(project.value, craftDetails.progress[outcome]);

	const projectMax = new UnsignedCoinsPF2e(await project.max);
	if (newProjectTotal.copperValue < 0) {
		await project.delete(true);
	} else if (newProjectTotal.copperValue >= projectMax.copperValue) {
		await project.createItem();
		await project.delete();
	} else {
		await project.setValue(CoinsPF2eUtility.toUnsignedCoins(newProjectTotal));
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

async function doEfficientCrafting(
	actor: CharacterPF2eHeroicCrafting,
	craftDetails: ProjectCraftDetails,
	outcome: DegreeOfSuccessString
) {
	if (outcome !== "failure" || !hasFeat(actor, "efficient-crafting")) return;

	const materialSpent = foundry.utils.deepClone(craftDetails.materialsSpent);
	const totalSpent = UnsignedCoinsPF2e.sumCoins(
		materialSpent.currency ?? {},
		materialSpent.trove ?? {},
		...(materialSpent.materials?.map((x) => x.value) ?? [])
	);
	const materialBack = totalSpent.multiply(0.5);

	const materialTrove = await MaterialTrove.getMaterialTrove(actor);
	if (materialTrove) {
		await materialTrove.add(materialBack);
		await ChatMessage.create({
			style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
			speaker: ChatMessage.getSpeaker(actor),
			content: `<i>${actor.name} receives ${materialBack} worth of crafting resources back from Efficient Crafting (added to Material Trove)</i>`,
		});
	} else {
		await actor.inventory.addCoins(materialBack);
		await ChatMessage.create({
			style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
			speaker: ChatMessage.getSpeaker(actor),
			content: `<i>${actor.name} receives ${materialBack} worth of crafting resources back from Efficient Crafting (added to currency)</i>`,
		});
	}
}

function setHtmlElementText(generalDiv: HTMLElement, selector: string, newProjectTotal: string) {
	const textElement = generalDiv.querySelector<HTMLElement>(selector);
	if (textElement) {
		textElement.textContent = newProjectTotal;
	}
}
