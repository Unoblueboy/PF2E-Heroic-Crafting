import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { UnsignedCoins, SignedCoins } from "../Helper/currency.mjs";

export type ProjectCraftMaterialSpent = {
	trove?: UnsignedCoins;
	currency?: UnsignedCoins;
	treasure?: TreasureMaterialSpent[];
};

type ProjectCraftProgress = {
	[x in DegreeOfSuccessString]: SignedCoins;
};

export type ProjectCraftDetails = {
	projectId: string;
	materialsSpent: ProjectCraftMaterialSpent;
	progress: ProjectCraftProgress;
	duration: ProjectCraftDuration;
	createItem?: boolean;
};

export type TreasureMaterialSpent = {
	uuid: string;
	value: UnsignedCoins;
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
