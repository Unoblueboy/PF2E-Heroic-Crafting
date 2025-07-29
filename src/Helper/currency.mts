import { Coins, CoinsPF2e } from "../../types/src/module/item/physical";

const DENOMINATION_LIST: readonly ["pp", "gp", "sp", "cp"] = ["pp", "gp", "sp", "cp"];
type Denomination = (typeof DENOMINATION_LIST)[number];

export function coinsToCopperValue(coins: Coins): number {
	return new game.pf2e.Coins(coins).copperValue;
}

export function copperValueToCoins(copperValue: number): CoinsPF2e {
	return new game.pf2e.Coins({
		cp: copperValue % 10,
		sp: Math.floor((copperValue % 100) / 10),
		gp: Math.floor(copperValue / 100),
		pp: 0,
	});
}

export function coinsToCoinString(coins: Coins) {
	const result = Object.entries(coins)
		.toSorted(
			([k1, _v1], [k2, _v2]) =>
				DENOMINATION_LIST.indexOf(k1 as Denomination) - DENOMINATION_LIST.indexOf(k2 as Denomination)
		)
		.filter(([_, v]) => !!v)
		.map(([k, v]) => `${v} ${k.toLowerCase()}`)
		.join(", ");
	return result == "" ? "0 gp" : result;
}

export function copperValueToCoinString(copperValue: number) {
	return coinsToCoinString(copperValueToCoins(copperValue));
}

export function addCoins(coins1: Coins, coins2: Coins) {
	const result: Coins = {};
	for (const denom of DENOMINATION_LIST) {
		if (!(denom in coins1) && !(denom in coins2)) {
			continue;
		}
		result[denom] = (coins1[denom] ?? 0) + (coins2[denom] ?? 0);
	}
	return result;
}

export function subCoins(coins1: Coins, coins2: Coins) {
	const copperValue = coinsToCopperValue(coins1) - coinsToCopperValue(coins2);
	return new game.pf2e.Coins(copperValueToCoins(copperValue));
}

export function multCoins(mult: number, coins: Coins) {
	const copperValue = coinsToCopperValue(coins);
	return copperValueToCoins(mult * copperValue);
}
