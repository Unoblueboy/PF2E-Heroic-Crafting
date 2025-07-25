import { ActorFlagsPF2e } from "../../types/src/module/actor/data/base";
import { Coins } from "../../types/src/module/item/physical";

export type ProjectItemDetails = {
	dc: number;
	batchSize: number;
	itemData: itemDataUuid;
	value: Coins;
};

type itemDataUuid = {
	isFormula: boolean;
	uuid: string;
} & EmbeddedSpell;

type EmbeddedSpell = {
	spellUuid?: string;
	heightenedLevel?: number;
};

export type BeginProjectUpdateDetailsOptions = { itemDropped?: boolean };

type _ActorFlagsPF2eHeroicCrafting = ActorFlagsPF2e & { pf2eHeroicCrafting?: { projects: ProjectItemDetails[] } };
