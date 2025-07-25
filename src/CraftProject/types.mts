import { Coins } from "../../types/src/module/item/physical";

export type ProjectCraftDetails = {
	projectId: string;
	materialsSpent: {
		generic?: Coins;
		currency?: Coins;
		treasure?: TreasureMaterialSpent[];
	};
	duration: ProjectCraftDuration;
	createItem?: boolean;
};

export type TreasureMaterialSpent = {
	uuid: string;
	value: Coins;
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

// delete, decrease value, Do Nothing
