import type { UnsignedCoins } from "../../Helper/currencyTypes.mjs";

export type EditMaterialTroveApplicationResult = {
	newMaterialTroveValue: UnsignedCoins;
	updateActorCoins: boolean;
};
