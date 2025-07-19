import { ActorPF2e } from "../../types/src/module/actor";
import { BeginProjectApplication } from "./Applications/BeginProjectApplication.mjs";
import { ProjectItemDetails } from "./types.mjs";

export async function beginProject(actor?: ActorPF2e, itemDetails?: ProjectItemDetails): Promise<boolean> {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return false;
	}

	itemDetails ??= await BeginProjectApplication.GetItemDetails({ actor });

	if (!itemDetails) {
		return false;
	}

	const randomId = foundry.utils.randomID();
	actor.update({ [`flags.pf2eHeroicCrafting.projects.${randomId}`]: itemDetails });
	return true;
}
