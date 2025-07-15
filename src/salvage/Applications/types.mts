import { ActorPF2e } from "../../../types/src/module/actor";
import { Coins, PhysicalItemPF2e } from "../../../types/src/module/item/physical";

export type SalvageApplicationResult = {
	savvyTeardown: boolean;
	max: Coins;
	duration: number;
	income: {
		success: number;
		failure: number;
	};
	actor: ActorPF2e;
	item: PhysicalItemPF2e;
};

export type SalvageApplicationOptions = {
	actor?: ActorPF2e;
	item?: PhysicalItemPF2e;
	lockItem?: boolean;
	callback?: (result: SalvageApplicationResult | undefined) => void;
};
