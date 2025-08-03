import { Coins } from "../../types/src/module/item/physical";

export const MATERIAL_TROVE_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.wtpSAjQwSyPOglzU`;
export const CRAFTING_MATERIAL_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.UFqgBzSfC8XfuKVg`;
export const SALVAGE_MATERIAL_UUID = "Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.R8QxNha74tYOrccl";

export const MATERIAL_TROVE_SLUG = "material-trove";
export const CRAFTING_MATERIAL_SLUG = "generic-crafting-material";
export const SALVAGE_MATERIAL_SLUG = "generic-salvage-material";

export const RARITIES: readonly ["common", "uncommon", "rare", "unique"] = ["common", "uncommon", "rare", "unique"];
export const MODULE_ID = "pf2e-heroic-crafting";

export const HEROIC_CRAFTING_SPENDING_LIMIT: Map<number, { hour: Coins; day: Coins; week: Coins }> = new Map<
	number,
	{ hour: Coins; day: Coins; week: Coins }
>([
	[
		1,
		{
			hour: { sp: 3 },
			day: { gp: 1, sp: 2 },
			week: { gp: 6 },
		},
	],
	[
		2,
		{
			hour: { sp: 5 },
			day: { gp: 2 },
			week: { gp: 10 },
		},
	],
	[
		3,
		{
			hour: { sp: 8 },
			day: { gp: 3, sp: 2 },
			week: { gp: 16 },
		},
	],
	[
		4,
		{
			hour: { gp: 1, sp: 5 },
			day: { gp: 6 },
			week: { gp: 30 },
		},
	],
	[
		5,
		{
			hour: { gp: 2 },
			day: { gp: 8 },
			week: { gp: 40 },
		},
	],
	[
		6,
		{
			hour: { gp: 3 },
			day: { gp: 12 },
			week: { gp: 60 },
		},
	],
	[
		7,
		{
			hour: { gp: 5 },
			day: { gp: 20 },
			week: { gp: 100 },
		},
	],
	[
		8,
		{
			hour: { gp: 7 },
			day: { gp: 28 },
			week: { gp: 140 },
		},
	],
	[
		9,
		{
			hour: { gp: 10 },
			day: { gp: 40 },
			week: { gp: 200 },
		},
	],
	[
		10,
		{
			hour: { gp: 15 },
			day: { gp: 60 },
			week: { gp: 300 },
		},
	],
	[
		11,
		{
			hour: { gp: 21 },
			day: { gp: 84 },
			week: { gp: 420 },
		},
	],
	[
		12,
		{
			hour: { gp: 30 },
			day: { gp: 120 },
			week: { gp: 600 },
		},
	],
	[
		13,
		{
			hour: { gp: 40 },
			day: { gp: 160 },
			week: { gp: 800 },
		},
	],
	[
		14,
		{
			hour: { gp: 70 },
			day: { gp: 280 },
			week: { gp: 1400 },
		},
	],
	[
		15,
		{
			hour: { gp: 100 },
			day: { gp: 400 },
			week: { gp: 2000 },
		},
	],
	[
		16,
		{
			hour: { gp: 125 },
			day: { gp: 500 },
			week: { gp: 2500 },
		},
	],
	[
		17,
		{
			hour: { gp: 200 },
			day: { gp: 800 },
			week: { gp: 4000 },
		},
	],
	[
		18,
		{
			hour: { gp: 300 },
			day: { gp: 1200 },
			week: { gp: 6000 },
		},
	],
	[
		19,
		{
			hour: { gp: 500 },
			day: { gp: 2000 },
			week: { gp: 10000 },
		},
	],
	[
		20,
		{
			hour: { gp: 800 },
			day: { gp: 3200 },
			week: { gp: 16000 },
		},
	],
]);

export const HEROIC_CRAFTING_GATHERED_INCOME: Map<number, Coins> = new Map<number, Coins>([
	[0, { sp: 1 }],
	[1, { sp: 4 }],
	[2, { sp: 6 }],
	[3, { gp: 1 }],
	[4, { gp: 1, sp: 6 }],
	[5, { gp: 2 }],
	[6, { gp: 4 }],
	[7, { gp: 5 }],
	[8, { gp: 6 }],
	[9, { gp: 8 }],
	[10, { gp: 10 }],
	[11, { gp: 12 }],
	[12, { gp: 16 }],
	[13, { gp: 24 }],
	[14, { gp: 30 }],
	[15, { gp: 40 }],
	[16, { gp: 60 }],
	[17, { gp: 80 }],
	[18, { gp: 140 }],
	[19, { gp: 200 }],
	[20, { gp: 300 }],
]);

export const LEVEL_BASED_DC = new Map<number, number>([
	[-1, 13],
	[0, 14],
	[1, 15],
	[2, 16],
	[3, 18],
	[4, 19],
	[5, 20],
	[6, 22],
	[7, 23],
	[8, 24],
	[9, 26],
	[10, 27],
	[11, 28],
	[12, 30],
	[13, 31],
	[14, 32],
	[15, 34],
	[16, 35],
	[17, 36],
	[18, 38],
	[19, 39],
	[20, 40],
	[21, 42],
	[22, 44],
	[23, 46],
	[24, 48],
	[25, 50],
]);

export const FORMULA_PRICE: Map<number, Coins> = new Map<number, Coins>([
	[0, { sp: 5 }],
	[1, { gp: 1 }],
	[2, { gp: 2 }],
	[3, { gp: 3 }],
	[4, { gp: 5 }],
	[5, { gp: 8 }],
	[6, { gp: 13 }],
	[7, { gp: 18 }],
	[8, { gp: 25 }],
	[9, { gp: 35 }],
	[10, { gp: 50 }],
	[11, { gp: 70 }],
	[12, { gp: 100 }],
	[13, { gp: 150 }],
	[14, { gp: 225 }],
	[15, { gp: 325 }],
	[16, { gp: 500 }],
	[17, { gp: 750 }],
	[18, { gp: 1200 }],
	[19, { gp: 2000 }],
	[20, { gp: 3500 }],
]);
