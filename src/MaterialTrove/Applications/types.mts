import { UnsignedCoins } from "../../Helper/currency.mjs";

export type EditMaterialTroveApplicationResult = {
	newMaterialTroveValue: UnsignedCoins;
	updateActorCoins: boolean;
};
