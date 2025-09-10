import { PhysicalItemPF2e } from "../../types/src/module/item";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { ProjectCraftMaterialSpent } from "./types.mjs";

export class CraftProjectUtility {
	static async getTotalCost(materialsSpent?: ProjectCraftMaterialSpent): Promise<UnsignedCoinsPF2e> {
		if (!materialsSpent) return new UnsignedCoinsPF2e(); // should never happen
		let totalCost = new UnsignedCoinsPF2e();
		if (materialsSpent.trove) {
			totalCost = totalCost.plus(materialsSpent.trove);
		}
		if (materialsSpent.currency) {
			totalCost = totalCost.plus(materialsSpent.currency);
		}
		for (const material of materialsSpent.treasure ?? []) {
			const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(material.uuid);
			if (!item) continue;
			totalCost = totalCost.plus(UnsignedCoinsPF2e.multiplyCoins(material.quantity ?? 1, material.value));
		}

		return totalCost;
	}
}
