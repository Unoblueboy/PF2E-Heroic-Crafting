import { ActorPF2e } from "../../types/src/module/actor";
import { Coins } from "../../types/src/module/item/physical";
import { coinsToCopperValue } from "../Helper/currency.mjs";
import { addMaterialTroveValue } from "../MaterialTrove/materialTrove.mjs";
import { BeginProjectApplication } from "./Applications/BeginProjectApplication.mjs";
import { ProjectItemDetails } from "./types.mjs";

export async function beginProject(
	actor?: ActorPF2e,
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
	const randomId = foundry.utils.randomID();
	actor.update({ [`flags.pf2eHeroicCrafting.projects.${randomId}`]: itemDetails });
	return true;
}

async function handleStartingValues(actor: ActorPF2e, startingValues: { currency?: Coins; generic?: Coins }) {
	if (startingValues.currency) {
		actor.inventory.removeCoins(startingValues.currency);
	}
	if (startingValues.generic) {
		addMaterialTroveValue(actor, -coinsToCopperValue(startingValues.generic));
	}
}
