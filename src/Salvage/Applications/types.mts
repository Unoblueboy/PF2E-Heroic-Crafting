import { PhysicalItemPF2e } from "../../../types/src/module/item/physical";
import { DegreeOfSuccessString } from "../../../types/src/module/system/degree-of-success";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { UnsignedCoins } from "../../Helper/currency.mjs";

export type SalvageApplicationResult = {
	savvyTeardown: boolean;
	max: UnsignedCoins;
	duration: number;
	income: {
		success: UnsignedCoins;
		failure: UnsignedCoins;
	} & { [x in DegreeOfSuccessString]?: UnsignedCoins };
	actor: CharacterPF2eHeroicCrafting;
	item: PhysicalItemPF2e;
};

export type SalvageApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	item?: PhysicalItemPF2e;
	lockItem?: boolean;
	callback: (result: SalvageApplicationResult | undefined) => void;
};
