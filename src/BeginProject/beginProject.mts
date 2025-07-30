import { CharacterPF2e } from "../../types/src/module/actor";
import { Coins } from "../../types/src/module/item/physical";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { Projects } from "../Projects/projects.mjs";
import { BeginProjectApplication } from "./Applications/BeginProjectApplication.mjs";
import { ProjectItemDetails } from "./types.mjs";

export async function beginProject(
	actor?: CharacterPF2e,
	details?: [ProjectItemDetails, { currency?: Coins; generic?: Coins }]
): Promise<boolean> {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return false;
	}

	details ??= await BeginProjectApplication.GetItemDetails({ actor });
	if (!details) {
		return false;
	}
	const itemDetails = details[0];
	const startingValues = details[1];

	handleStartingValues(actor, startingValues);
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
