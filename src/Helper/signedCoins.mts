import { Coins } from "../../types/src/module/item/physical";

const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;
export type DENOMINATION = (typeof DENOMINATIONS)[number];
export type SignedCoins = Coins & { isNegative?: boolean };

export class SignedCoinsPF2e {
	declare cp: number;
	declare sp: number;
	declare gp: number;
	declare pp: number;
	isNegative: boolean;

	constructor(data?: SignedCoins | null) {
		data ??= {};
		for (const denomination of DENOMINATIONS) {
			this[denomination] = Math.max(Math.floor(Math.abs(data[denomination] ?? 0)), 0);
		}
		this.isNegative = data?.isNegative ?? false;
	}

	get copperValue(): number {
		const { cp, sp, gp, pp } = this;
		const copperValue = cp + sp * 10 + gp * 100 + pp * 1000;
		return this.isNegative ? -copperValue : copperValue;
	}

	plus(coins: SignedCoins): SignedCoinsPF2e {
		const other = new SignedCoinsPF2e(coins);
		const totalCopperValue = this.copperValue + other.copperValue;
		const includePp = this.pp !== 0 || other.pp !== 0;
		return SignedCoinsPF2e.copperValueToSignedCoins(totalCopperValue, includePp);
	}

	subtract(coins: SignedCoins) {
		return this.plus({ ...coins, isNegative: !coins.isNegative });
	}

	scale(factor: number): SignedCoinsPF2e {
		const coinPF2eResult = new game.pf2e.Coins(this).scale(Math.abs(factor));
		return new SignedCoinsPF2e({ ...coinPF2eResult, isNegative: factor < 0 ? !this.isNegative : this.isNegative });
	}

	multiply(multiplier: number) {
		const copperValue = this.copperValue;
		return SignedCoinsPF2e.copperValueToSignedCoins(Math.floor(multiplier * copperValue));
	}

	negate() {
		return new SignedCoinsPF2e({ ...this, isNegative: !this.isNegative });
	}

	toObject(): SignedCoins {
		return DENOMINATIONS.reduce(
			(result, denomination) => {
				if (this[denomination] !== 0) {
					return { ...result, [denomination]: this[denomination] };
				}
				return result;
			},
			{ isNegative: this.isNegative }
		);
	}

	static fromString(coinString: string, quantity = 1): SignedCoinsPF2e {
		const coins = game.pf2e.Coins.fromString(coinString, quantity);
		return new SignedCoinsPF2e({ ...coins, isNegative: coinString.startsWith("-") });
	}

	static copperValueToSignedCoins(copperValue: number, includePp: boolean = false): SignedCoinsPF2e {
		const isNegative = copperValue < 0;
		const absCopperValue = Math.abs(copperValue);
		const pp = includePp ? Math.floor(absCopperValue / 1000) : 0;
		const gp = Math.floor(absCopperValue / 100 - pp * 10);
		const sp = Math.floor(absCopperValue / 10 - pp * 100 - gp * 10);
		const cp = Math.floor(absCopperValue - pp * 1000 - gp * 100 - sp * 10);

		return new SignedCoinsPF2e({
			pp,
			gp,
			sp,
			cp,
			isNegative: isNegative,
		});
	}

	static addCoins(coins: SignedCoins, otherCoins: SignedCoins) {
		const signedCoins = new SignedCoinsPF2e(coins);
		const signedOtherCoins = new SignedCoinsPF2e(otherCoins);
		return signedCoins.plus(signedOtherCoins);
	}

	static subtractCoins(coins: SignedCoins, otherCoins: SignedCoins) {
		const signedCoins = new SignedCoinsPF2e(coins);
		const signedOtherCoins = new SignedCoinsPF2e(otherCoins);
		return signedCoins.subtract(signedOtherCoins);
	}

	static multiplyCoins(mult: number, coins: SignedCoins) {
		const copperValue = new SignedCoinsPF2e(coins).copperValue;
		return this.copperValueToSignedCoins(Math.floor(mult * copperValue));
	}

	static minCoins(...coinsList: SignedCoins[]): SignedCoinsPF2e {
		const coinsPF2eList = coinsList.map((x) => new SignedCoinsPF2e(x));
		const copperValueList = coinsPF2eList.map((x) => x.copperValue);
		const idx = copperValueList.indexOf(Math.min(...copperValueList));
		return coinsPF2eList[idx];
	}

	static maxCoins(...coinsList: SignedCoins[]): SignedCoinsPF2e {
		const coinsPF2eList = coinsList.map((x) => new SignedCoinsPF2e(x));
		const copperValueList = coinsPF2eList.map((x) => x.copperValue);
		const idx = copperValueList.indexOf(Math.max(...copperValueList));
		return coinsPF2eList[idx];
	}

	toString(): string {
		const baseCoin = new game.pf2e.Coins(this);
		return this.isNegative ? `-${baseCoin.toString()}` : baseCoin.toString();
	}
}
