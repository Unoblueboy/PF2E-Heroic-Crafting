import { ActorFlagsPF2e } from "../../types/src/module/actor/data/base";
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
} & EmbeddedSpell;

type itemDataUuid = {
	type: "uuid";
	uuid: string;
} & EmbeddedSpell;

type EmbeddedSpell = {
	spellUuid?: string;
};

type _ActorFlagsPF2eHeroicCrafting = ActorFlagsPF2e & { pf2eHeroicCrafting?: { projects: ProjectItemDetails[] } };
