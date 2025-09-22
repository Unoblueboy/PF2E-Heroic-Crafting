import type { CharacterPF2eHeroicCrafting } from "../character.mjs";
import type { PhysicalItemPF2e } from "foundry-pf2e";

import { BeginProjectApplication } from "../BeginProject/Applications/BeginProjectApplication.mjs";
import { beginProject } from "../BeginProject/beginProject.mjs";
import { createSalvage } from "../Salvage/salvage.mjs";
import { ReverseEngineerApplication } from "./Applications/ReverseEngineerApplication.mjs";

export async function reverseEngineer(actor: CharacterPF2eHeroicCrafting, item?: PhysicalItemPF2e) {
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
		ui.notifications.info("Cannot reverse engineer an item without a sourceId");
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
