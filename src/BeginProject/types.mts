import { Coins } from "../../types/src/module/item/physical";

export interface ProjectItemDetails {
	dc: number;
	batchSize: number;
	itemData: itemDataUuid;
	value: Coins;
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
