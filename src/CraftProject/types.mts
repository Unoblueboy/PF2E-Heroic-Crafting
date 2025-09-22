import type { DegreeOfSuccessString } from "foundry-pf2e";
import type { UnsignedCoins, SignedCoins } from "../Helper/currencyTypes.mjs";

export type BasicMaterials = {
	trove?: UnsignedCoins;
	currency?: UnsignedCoins;
};

export type ProjectCraftMaterialSpent = BasicMaterials & { materials?: TreasureMaterialSpent[] };

export type ProjectCraftProgress = {
	[x in DegreeOfSuccessString]: SignedCoins;
};

export type ProjectCraftDetails = {
	projectId: string;
	materialsSpent: ProjectCraftMaterialSpent;
	cost: UnsignedCoins;
	progress: ProjectCraftProgress;
	duration: ProjectCraftDuration;
	createItem?: boolean;
	rollOptions: Set<string>;
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
