import { Rarity } from "../../types/src/module/data";
import { LEVEL_BASED_DC } from "./constants.mjs";

export function calculateDC(level: number, rarity: Rarity = "common"): number {
	// assume level 0 if garbage comes in. We cast level to number because the backing data may actually have it
	// stored as a string, which we can't catch at compile time
	const dc = LEVEL_BASED_DC.get(level) ?? 14;

	switch (rarity) {
		case "uncommon":
			return dc + 2;
		case "rare":
			return dc + 5;
		case "unique":
			return dc + 10;
		default:
			return dc;
	}
}
