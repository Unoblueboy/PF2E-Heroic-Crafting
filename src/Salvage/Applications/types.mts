import { CharacterPF2e } from "../../../types/src/module/actor";
import { CoinsPF2e, PhysicalItemPF2e } from "../../../types/src/module/item/physical";

export type SalvageApplicationResult = {
	savvyTeardown: boolean;
	max: CoinsPF2e;
	duration: number;
	income: {
		success: CoinsPF2e;
		failure: CoinsPF2e;
	};
	actor: CharacterPF2e;
	item: PhysicalItemPF2e;
};

export type SalvageApplicationOptions = {
	actor?: CharacterPF2e;
	item?: PhysicalItemPF2e;
	lockItem?: boolean;
	callback?: (result: SalvageApplicationResult | undefined) => void;
};
