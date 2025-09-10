import { PhysicalItemPF2e } from "../../../types/src/module/item/physical";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { UnsignedCoins } from "../../Helper/currency.mjs";

export type SalvageApplicationResult = {
	savvyTeardown: boolean;
	max: UnsignedCoins;
	duration: number;
	income: {
		success: UnsignedCoins;
		failure: UnsignedCoins;
	};
	actor: CharacterPF2eHeroicCrafting;
	item: PhysicalItemPF2e;
};

export type SalvageApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	item?: PhysicalItemPF2e;
	lockItem?: boolean;
	callback: (result: SalvageApplicationResult | undefined) => void;
};
