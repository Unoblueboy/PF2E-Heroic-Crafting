import { CharacterPF2e } from "../../types/src/module/actor";
import { Coins, PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { Projects } from "../Projects/projects.mjs";
import { BeginProjectApplication } from "./Applications/BeginProjectApplication.mjs";
import { BeginProjectDetails, BeginProjectDetailsType } from "./types.mjs";

export async function beginProject(actor?: CharacterPF2e, details?: BeginProjectDetails): Promise<boolean> {
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

	const { itemDetails, startingValue } = details;

	handleStartingValues(actor, startingValue);
	const projects = Projects.getProjects(actor);
	await projects?.addProject(itemDetails);
	return true;
}

async function handleStartingValues(actor: CharacterPF2e, startingValues: { currency?: Coins; generic?: Coins }) {
	if (startingValues.currency) {
		actor.inventory.removeCoins(startingValues.currency);
	}
	if (startingValues.generic) {
		MaterialTrove.subtractValue(actor, startingValues.generic);
	}
}
