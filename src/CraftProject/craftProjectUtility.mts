import { PhysicalItemPF2e } from "../../types/src/module/item";
import { SignedCoinsPF2e } from "../Helper/signedCoins.mjs";
import { ProjectCraftMaterialSpent } from "./types.mjs";

export class CraftProjectUtility {
	static async getTotalCost(materialsSpent?: ProjectCraftMaterialSpent): Promise<SignedCoinsPF2e> {
		if (!materialsSpent) return new SignedCoinsPF2e(); // should never happen
		let totalCost = new SignedCoinsPF2e();
		if (materialsSpent.trove) {
			totalCost = totalCost.plus(materialsSpent.trove);
		}
		if (materialsSpent.currency) {
			totalCost = totalCost.plus(materialsSpent.currency);
		}
		for (const material of materialsSpent.treasure ?? []) {
			const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(material.uuid);
			if (!item) continue;
			totalCost = totalCost.plus(SignedCoinsPF2e.multiplyCoins(material.quantity ?? 1, material.value));
		}

		return totalCost;
	}
}
