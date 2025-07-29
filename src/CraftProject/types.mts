import { CoinsPF2e } from "../../types/src/module/item/physical";

export type ProjectCraftDetails = {
	projectId: string;
	materialsSpent: {
		generic?: CoinsPF2e;
		currency?: CoinsPF2e;
		treasure?: TreasureMaterialSpent[];
	};
	duration: ProjectCraftDuration;
	createItem?: boolean;
};

export type TreasureMaterialSpent = {
	uuid: string;
	value: CoinsPF2e;
	quantity?: number;
	postUseOperation: TreasurePostUseOperation;
};

export enum TreasurePostUseOperation {
	DECREASE_VALUE = "decrease-value",
	DELETE = "delete",
	NOTHING = "nothing",
}

export enum ProjectCraftDuration {
	HOUR = "hour",
	DAY = "day",
	WEEK = "week",
}
