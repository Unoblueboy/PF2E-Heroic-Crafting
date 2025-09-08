import { PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { Projects } from "../Projects/projects.mjs";
import { BeginProjectApplication } from "./Applications/BeginProjectApplication.mjs";
import { BeginProjectDetails, BeginProjectDetailsType, BeginProjectStartingValues } from "./types.mjs";

export async function beginProject(
	actor?: CharacterPF2eHeroicCrafting,
	details?: BeginProjectDetails
): Promise<boolean> {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return false;
	}

	switch (details?.type) {
		case BeginProjectDetailsType.FULL:
			break;
		case BeginProjectDetailsType.PARTIAL: {
			const item = details.item ?? (await foundry.utils.fromUuid<PhysicalItemPF2e>(details.itemUuid));
			if (!item) return false;
			details = await BeginProjectApplication.GetItemDetails({
				actor,
				itemSettings: {
					lockItem: true,
					item: item,
				},
			});
			break;
		}
		default:
			details = await BeginProjectApplication.GetItemDetails({ actor });
			break;
	}
	if (details?.type !== BeginProjectDetailsType.FULL) {
		return false;
	}
	console.debug("Heroic Crafting | Begin Project Details", details);

	const { itemDetails, startingValue } = details;

	await handleStartingValues(actor, startingValue);
	const projects = Projects.getProjects(actor);
	const project = await projects.addProject(itemDetails);
	const chatMessageData: DeepPartial<ChatMessage["_source"]> = {
		content: await foundry.applications.handlebars.renderTemplate(
			"modules/pf2e-heroic-crafting/templates/chat/beginProject/message.hbs",
			{
				project: await project.getContextData(),
				actor,
			}
		),
		speaker: { actor: actor.id },
		author: game.userId,
		style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
	};
	ChatMessage.create<ChatMessage>(chatMessageData);
	return true;
}

async function handleStartingValues(actor: CharacterPF2eHeroicCrafting, startingValues: BeginProjectStartingValues) {
	if (startingValues.currency) {
		await actor.inventory.removeCoins(startingValues.currency);
	}
	if (startingValues.trove) {
		await MaterialTrove.subtractValue(actor, startingValues.trove, false);
	}
}
