import { Rarity } from "../../types/src/module/data";
import { Coins } from "../../types/src/module/item/physical";

export type ProjectItemDetails = {
	dc: number;
	batchSize: number;
	itemData: itemDataCustom | itemDataUuid;
};

type itemDataCustom = {
	type: "custom";
	name: string;
	level: number;
	rarity: Rarity;
	price: Coins;
	description?: string;
	bulk?: string;
};

type itemDataUuid = {
	type: "uuid";
	uuid: string;
};
