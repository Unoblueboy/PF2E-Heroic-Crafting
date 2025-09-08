import { SignedCoins } from "../../Helper/signedCoins.mjs";

export type EditMaterialTroveApplicationResult = {
	newMaterialTroveValue: SignedCoins;
	updateActorCoins: boolean;
};
