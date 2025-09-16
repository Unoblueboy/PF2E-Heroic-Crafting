import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { ProjectCraftMaterialSpent } from "./types.mjs";

export class CraftProjectUtility {
	static getTotalMaterialSpent(materialsSpent?: ProjectCraftMaterialSpent): UnsignedCoinsPF2e {
		if (!materialsSpent) return new UnsignedCoinsPF2e(); // should never happen

		return UnsignedCoinsPF2e.sumCoins(
			materialsSpent.trove ?? {},
			materialsSpent.currency ?? {},
			...(materialsSpent.treasure ?? []).map((treasure) => treasure.value)
		);
	}
}
