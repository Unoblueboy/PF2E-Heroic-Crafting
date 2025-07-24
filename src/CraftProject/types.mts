import { Coins } from "../../types/src/module/item/physical";
import { ProjectItemDetails } from "../BeginProject/types.mjs";

export type ProjectCraftDetails = {
	itemDetails: ProjectItemDetails;
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
