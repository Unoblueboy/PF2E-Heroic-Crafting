import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { SignedCoinsPF2e } from "../Helper/signedCoins.mjs";

export type ProjectCraftMaterialSpent = {
	generic?: SignedCoinsPF2e;
	currency?: SignedCoinsPF2e;
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
	value: SignedCoinsPF2e;
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
