const CURRENCY_LIST = ["pp", "gp", "sp", "cp"];

export function coinsToCopperValue(coins) {
	return coins.cp + 10 * coins.sp + 100 * coins.gp + 1000 * coins.pp;
}

export function copperValueToCoins(copperValue) {
	return {
		cp: copperValue % 10,
		sp: Math.floor((copperValue % 100) / 10),
		gp: Math.floor(copperValue / 100),
		pp: 0,
	};
}

export function coinsToCoinString(coins) {
	const result = Object.entries(coins)
		.toSorted(([k1, _1], [k2, _2]) => CURRENCY_LIST.indexOf(k1) - CURRENCY_LIST.indexOf(k2))
		.filter(([_, v]) => !!v)
		.map(([k, v]) => `${v} ${k.toLowerCase()}`)
		.join(", ");
	return result == "" ? "0 gp" : result;
}

export function copperValueToCoinString(copperValue) {
	return coinsToCoinString(copperValueToCoins(copperValue));
}
