import { CoinsPF2e } from "../../types/src/module/item/physical";

export const MATERIAL_TROVE_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.wtpSAjQwSyPOglzU`;
export const CRAFTING_MATERIAL_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.UFqgBzSfC8XfuKVg`;
export const SALVAGE_MATERIAL_UUID = "Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.R8QxNha74tYOrccl";

export const MATERIAL_TROVE_SLUG = "material-trove";
export const CRAFTING_MATERIAL_SLUG = "generic-crafting-material";
export const SALVAGE_MATERIAL_SLUG = "generic-salvage-material";

Hooks.on("ready", () => {
	HEROIC_CRAFTING_SPENDING_LIMIT = new Map<number, { hour: CoinsPF2e; day: CoinsPF2e; week: CoinsPF2e }>([
		[
			1,
			{
				hour: new game.pf2e.Coins({ sp: 3 }),
				day: new game.pf2e.Coins({ gp: 1, sp: 2 }),
				week: new game.pf2e.Coins({ gp: 6 }),
			},
		],
		[
			2,
			{
				hour: new game.pf2e.Coins({ sp: 5 }),
				day: new game.pf2e.Coins({ gp: 2 }),
				week: new game.pf2e.Coins({ gp: 10 }),
			},
		],
		[
			3,
			{
				hour: new game.pf2e.Coins({ sp: 8 }),
				day: new game.pf2e.Coins({ gp: 3, sp: 2 }),
				week: new game.pf2e.Coins({ gp: 16 }),
			},
		],
		[
			4,
			{
				hour: new game.pf2e.Coins({ gp: 1, sp: 5 }),
				day: new game.pf2e.Coins({ gp: 6 }),
				week: new game.pf2e.Coins({ gp: 30 }),
			},
		],
		[
			5,
			{
				hour: new game.pf2e.Coins({ gp: 2 }),
				day: new game.pf2e.Coins({ gp: 8 }),
				week: new game.pf2e.Coins({ gp: 40 }),
			},
		],
		[
			6,
			{
				hour: new game.pf2e.Coins({ gp: 3 }),
				day: new game.pf2e.Coins({ gp: 12 }),
				week: new game.pf2e.Coins({ gp: 60 }),
			},
		],
		[
			7,
			{
				hour: new game.pf2e.Coins({ gp: 5 }),
				day: new game.pf2e.Coins({ gp: 20 }),
				week: new game.pf2e.Coins({ gp: 100 }),
			},
		],
		[
			8,
			{
				hour: new game.pf2e.Coins({ gp: 7 }),
				day: new game.pf2e.Coins({ gp: 28 }),
				week: new game.pf2e.Coins({ gp: 140 }),
			},
		],
		[
			9,
			{
				hour: new game.pf2e.Coins({ gp: 10 }),
				day: new game.pf2e.Coins({ gp: 40 }),
				week: new game.pf2e.Coins({ gp: 200 }),
			},
		],
		[
			10,
			{
				hour: new game.pf2e.Coins({ gp: 15 }),
				day: new game.pf2e.Coins({ gp: 60 }),
				week: new game.pf2e.Coins({ gp: 300 }),
			},
		],
		[
			11,
			{
				hour: new game.pf2e.Coins({ gp: 21 }),
				day: new game.pf2e.Coins({ gp: 84 }),
				week: new game.pf2e.Coins({ gp: 420 }),
			},
		],
		[
			12,
			{
				hour: new game.pf2e.Coins({ gp: 30 }),
				day: new game.pf2e.Coins({ gp: 120 }),
				week: new game.pf2e.Coins({ gp: 600 }),
			},
		],
		[
			13,
			{
				hour: new game.pf2e.Coins({ gp: 40 }),
				day: new game.pf2e.Coins({ gp: 160 }),
				week: new game.pf2e.Coins({ gp: 800 }),
			},
		],
		[
			14,
			{
				hour: new game.pf2e.Coins({ gp: 70 }),
				day: new game.pf2e.Coins({ gp: 280 }),
				week: new game.pf2e.Coins({ gp: 1400 }),
			},
		],
		[
			15,
			{
				hour: new game.pf2e.Coins({ gp: 100 }),
				day: new game.pf2e.Coins({ gp: 400 }),
				week: new game.pf2e.Coins({ gp: 2000 }),
			},
		],
		[
			16,
			{
				hour: new game.pf2e.Coins({ gp: 125 }),
				day: new game.pf2e.Coins({ gp: 500 }),
				week: new game.pf2e.Coins({ gp: 2500 }),
			},
		],
		[
			17,
			{
				hour: new game.pf2e.Coins({ gp: 200 }),
				day: new game.pf2e.Coins({ gp: 800 }),
				week: new game.pf2e.Coins({ gp: 4000 }),
			},
		],
		[
			18,
			{
				hour: new game.pf2e.Coins({ gp: 300 }),
				day: new game.pf2e.Coins({ gp: 1200 }),
				week: new game.pf2e.Coins({ gp: 6000 }),
			},
		],
		[
			19,
			{
				hour: new game.pf2e.Coins({ gp: 500 }),
				day: new game.pf2e.Coins({ gp: 2000 }),
				week: new game.pf2e.Coins({ gp: 10000 }),
			},
		],
		[
			20,
			{
				hour: new game.pf2e.Coins({ gp: 800 }),
				day: new game.pf2e.Coins({ gp: 3200 }),
				week: new game.pf2e.Coins({ gp: 16000 }),
			},
		],
	]);

	HEROIC_CRAFTING_GATHERED_INCOME = new Map<number, CoinsPF2e>([
		[0, new game.pf2e.Coins({ sp: 1 })],
		[1, new game.pf2e.Coins({ sp: 4 })],
		[2, new game.pf2e.Coins({ sp: 6 })],
		[3, new game.pf2e.Coins({ gp: 1 })],
		[4, new game.pf2e.Coins({ gp: 1, sp: 6 })],
		[5, new game.pf2e.Coins({ gp: 2 })],
		[6, new game.pf2e.Coins({ gp: 4 })],
		[7, new game.pf2e.Coins({ gp: 5 })],
		[8, new game.pf2e.Coins({ gp: 6 })],
		[9, new game.pf2e.Coins({ gp: 8 })],
		[10, new game.pf2e.Coins({ gp: 10 })],
		[11, new game.pf2e.Coins({ gp: 12 })],
		[12, new game.pf2e.Coins({ gp: 16 })],
		[13, new game.pf2e.Coins({ gp: 24 })],
		[14, new game.pf2e.Coins({ gp: 30 })],
		[15, new game.pf2e.Coins({ gp: 40 })],
		[16, new game.pf2e.Coins({ gp: 60 })],
		[17, new game.pf2e.Coins({ gp: 80 })],
		[18, new game.pf2e.Coins({ gp: 140 })],
		[19, new game.pf2e.Coins({ gp: 200 })],
		[20, new game.pf2e.Coins({ gp: 300 })],
	]);

	FORMULA_PRICE = new Map<number, CoinsPF2e>([
		[0, new game.pf2e.Coins({ sp: 5 })],
		[1, new game.pf2e.Coins({ gp: 1 })],
		[2, new game.pf2e.Coins({ gp: 2 })],
		[3, new game.pf2e.Coins({ gp: 3 })],
		[4, new game.pf2e.Coins({ gp: 5 })],
		[5, new game.pf2e.Coins({ gp: 8 })],
		[6, new game.pf2e.Coins({ gp: 13 })],
		[7, new game.pf2e.Coins({ gp: 18 })],
		[8, new game.pf2e.Coins({ gp: 25 })],
		[9, new game.pf2e.Coins({ gp: 35 })],
		[10, new game.pf2e.Coins({ gp: 50 })],
		[11, new game.pf2e.Coins({ gp: 70 })],
		[12, new game.pf2e.Coins({ gp: 100 })],
		[13, new game.pf2e.Coins({ gp: 150 })],
		[14, new game.pf2e.Coins({ gp: 225 })],
		[15, new game.pf2e.Coins({ gp: 325 })],
		[16, new game.pf2e.Coins({ gp: 500 })],
		[17, new game.pf2e.Coins({ gp: 750 })],
		[18, new game.pf2e.Coins({ gp: 1200 })],
		[19, new game.pf2e.Coins({ gp: 2000 })],
		[20, new game.pf2e.Coins({ gp: 3500 })],
	]);
});

export let HEROIC_CRAFTING_SPENDING_LIMIT: Map<number, { hour: CoinsPF2e; day: CoinsPF2e; week: CoinsPF2e }>;

export let HEROIC_CRAFTING_GATHERED_INCOME: Map<number, CoinsPF2e>;

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

export let FORMULA_PRICE: Map<number, CoinsPF2e>; // prices are in CP
