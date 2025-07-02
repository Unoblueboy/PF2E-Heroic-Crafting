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
