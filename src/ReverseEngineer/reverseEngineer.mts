import { CharacterPF2e } from "../../types/src/module/actor";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { BeginProjectApplication } from "../BeginProject/Applications/BeginProjectApplication.mjs";
import { beginProject } from "../BeginProject/beginProject.mjs";
import { createSalvage } from "../Salvage/salvage.mjs";
import { ReverseEngineerApplication } from "./Applications/ReverseEngineerApplication.mjs";

export async function reverseEngineer(actor: CharacterPF2e, item?: PhysicalItemPF2e) {
	if (!actor) {
		return;
	}

	if (!item) {
		const result = await ReverseEngineerApplication.GetItemUuid(actor);
		if (!result) return;
		const resultItem = (await fromUuid(result.uuid)) as PhysicalItemPF2e;
		if (!resultItem) return;
		item = resultItem;
	}

	if (!item.sourceId) {
		return;
	}

	const details = await BeginProjectApplication.GetItemDetails({
		actor,
		itemSettings: {
			formula: {
				defaultValue: true,
				include: false,
			},
			lockItem: true,
			item,
			checkFromInventory: true,
		},
	});

	if (!details) return;
	details.itemDetails.itemData.uuid = item.sourceId;

	if (!(await beginProject(actor, details))) return;
	await createSalvage(item);
}
