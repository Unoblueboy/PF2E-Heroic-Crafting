import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { EditMaterialTroveApplication } from "./Applications/EditMaterialTroveApplication.mjs";
import { EditMaterialTroveApplicationResult } from "./Applications/types.mjs";
import { MaterialTrove, useActorCoins } from "./materialTrove.mjs";

export async function editMaterialTrove(actor: CharacterPF2eHeroicCrafting) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	const materialTrove = await MaterialTrove.getMaterialTrove(actor);
	if (!materialTrove) return;

	// Get new value of Generic Crafting Materials
	const result = (await EditMaterialTroveApplication.EditMaterialTrove({
		actor,
		materialTrove,
	})) as EditMaterialTroveApplicationResult;
	if (!result) return;

	if (!(await useActorCoins(result, materialTrove.value, actor))) {
		ui.notifications.error("Not enough coins in inventory");
		return;
	}

	await materialTrove.updateCraftingMaterials(result.newMaterialTroveValue);
}
