import { Coins } from "../../types/src/module/item/physical";

const CURRENCY_LIST = ["pp", "gp", "sp", "cp"];

export function coinsToCopperValue(coins: Coins) {
	return (coins.cp ?? 0) + 10 * (coins.sp ?? 0) + 100 * (coins.gp ?? 0) + 1000 * (coins.pp ?? 0);
}

export function copperValueToCoins(copperValue: number): Coins {
	return {
		cp: copperValue % 10,
		sp: Math.floor((copperValue % 100) / 10),
		gp: Math.floor(copperValue / 100),
		pp: 0,
	};
}

export function coinsToCoinString(coins: Coins) {
	const result = Object.entries(coins)
		.toSorted(([k1, _1], [k2, _2]) => CURRENCY_LIST.indexOf(k1) - CURRENCY_LIST.indexOf(k2))
		.filter(([_, v]) => !!v)
		.map(([k, v]) => `${v} ${k.toLowerCase()}`)
		.join(", ");
	return result == "" ? "0 gp" : result;
}

export function copperValueToCoinString(copperValue: number) {
	return coinsToCoinString(copperValueToCoins(copperValue));
}
