import type { DegreeOfSuccessString, PhysicalItemPF2e } from "foundry-pf2e";
import type { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import type { UnsignedCoins } from "../../Helper/currencyTypes.mjs";

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
	rollOptions: Set<string>;
};

export type SalvageApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	item?: PhysicalItemPF2e;
	lockItem?: boolean;
	callback: (result: SalvageApplicationResult | undefined) => void;
};
