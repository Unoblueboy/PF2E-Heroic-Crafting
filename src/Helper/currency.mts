import { Coins, CoinsPF2e } from "../../types/src/module/item/physical";

export class CoinsPF2eUtility {
	private static coinsToCopperValue(coins: Coins): number {
		return new game.pf2e.Coins(coins).copperValue;
	}

	static copperValueToCoins(copperValue: number): CoinsPF2e {
		return new game.pf2e.Coins({
			cp: copperValue % 10,
			sp: Math.floor((copperValue % 100) / 10),
			gp: Math.floor(copperValue / 100),
			pp: 0,
		});
	}

	static coinsToCoinString(coins: Coins): string {
		return new game.pf2e.Coins(coins).toString();
	}

	static copperValueToCoinString(copperValue: number) {
		return this.copperValueToCoins(copperValue).toString();
	}

	static addCoins(coins1: Coins, coins2: Coins) {
		return new game.pf2e.Coins(coins1).plus(coins2);
	}

	static subCoins(coins1: Coins, coins2: Coins) {
		const copperValue = this.coinsToCopperValue(coins1) - this.coinsToCopperValue(coins2);
		return new game.pf2e.Coins(this.copperValueToCoins(copperValue));
	}

	static multCoins(mult: number, coins: Coins) {
		const copperValue = this.coinsToCopperValue(coins);
		return this.copperValueToCoins(Math.floor(mult * copperValue));
	}

	static minCoins(coins1: Coins, coins2: Coins) {
		if (this.coinsToCopperValue(coins1) <= this.coinsToCopperValue(coins2)) return new game.pf2e.Coins(coins1);
		return new game.pf2e.Coins(coins2);
	}

	static maxCoins(coins1: Coins, coins2: Coins) {
		if (this.coinsToCopperValue(coins1) >= this.coinsToCopperValue(coins2)) return new game.pf2e.Coins(coins1);
		return new game.pf2e.Coins(coins2);
	}
}
