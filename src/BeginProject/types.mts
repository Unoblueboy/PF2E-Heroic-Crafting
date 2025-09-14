import { PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { UnsignedCoins } from "../Helper/currencyTypes.mjs";
import { Either } from "../Helper/generics.mjs";

export interface ProjectItemDetails {
	dc: number;
	batchSize: number;
	itemData: itemDataUuid;
	value: UnsignedCoins;
}

export type itemDataUuid = {
	isFormula: boolean;
	uuid: string;
} & EmbeddedSpell;

export type EmbeddedSpell = {
	spellUuid?: string;
	heightenedLevel?: number;
};

export type BeginProjectUpdateDetailsOptions = { itemDropped?: boolean };
export enum BeginProjectDetailsType {
	FULL,
	PARTIAL,
}
export type BeginProjectFullDetails = {
	type: BeginProjectDetailsType.FULL;
	itemDetails: ProjectItemDetails;
	startingValue: BeginProjectStartingValues;
};
export type BeginProjectStartingValues = {
	currency?: UnsignedCoins;
	trove?: UnsignedCoins;
};
export type BeginProjectPartialDetails = {
	type: BeginProjectDetailsType.PARTIAL;
} & Either<{ itemUuid: string }, { item: PhysicalItemPF2e }>;
export type BeginProjectDetails = BeginProjectFullDetails | BeginProjectPartialDetails;
