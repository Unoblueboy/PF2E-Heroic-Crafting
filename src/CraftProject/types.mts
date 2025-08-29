import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { SignedCoins, SignedCoinsPF2e } from "../Helper/signedCoins.mjs";

export type ProjectCraftMaterialSpent = {
	trove?: SignedCoins;
	currency?: SignedCoins;
	treasure?: TreasureMaterialSpent[];
};

type ProjectCraftProgress = {
	[x in DegreeOfSuccessString]: SignedCoinsPF2e;
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
	value: SignedCoins;
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
