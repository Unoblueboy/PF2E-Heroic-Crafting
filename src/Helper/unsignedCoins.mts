import { DENOMINATIONS, SignedCoins, UnsignedCoins } from "./currency.mjs";
import { SignedCoinsPF2e } from "./signedCoins.mjs";

export class UnsignedCoinsPF2e implements UnsignedCoins {
	declare cp: number;
	declare sp: number;
	declare gp: number;
	declare pp: number;

	constructor(data?: UnsignedCoins | null) {
		data ??= {};
		for (const denomination of DENOMINATIONS) {
			this[denomination] = Math.max(Math.floor(Math.abs(data[denomination] ?? 0)), 0);
		}
	}

	get copperValue(): number {
		const { cp, sp, gp, pp } = this;
		return cp + sp * 10 + gp * 100 + pp * 1000;
	}

	plus(coins: UnsignedCoins): UnsignedCoinsPF2e {
		const other = new UnsignedCoinsPF2e(coins);
		const totalCopperValue = this.copperValue + other.copperValue;
		const includePp = this.pp !== 0 || other.pp !== 0;
		return UnsignedCoinsPF2e.copperValueToCoins(totalCopperValue, includePp);
	}

	subtract(coins: UnsignedCoins): UnsignedCoinsPF2e {
		const other = new UnsignedCoinsPF2e(coins);
		const totalCopperValue = this.copperValue - other.copperValue;
		const includePp = this.pp !== 0 || other.pp !== 0;
		return UnsignedCoinsPF2e.copperValueToCoins(totalCopperValue, includePp);
	}

	multiply(multiplier: number): UnsignedCoinsPF2e {
		if (multiplier < 0) {
			throw new Error(`UnsignedCoinsPF2e cannot be multiplied by negative multiplier ${multiplier}`);
		}
		const copperValue = this.copperValue;
		return UnsignedCoinsPF2e.copperValueToCoins(Math.floor(multiplier * copperValue));
	}

	toObject(): UnsignedCoins {
		return DENOMINATIONS.reduce((result, denomination) => {
			if (this[denomination] !== 0) {
				return { ...result, [denomination]: this[denomination] };
			}
			return result;
		}, {});
	}

	toSignedCoins(): SignedCoins {
		return new SignedCoinsPF2e(this);
	}

	static fromString(coinString: string, quantity = 1): UnsignedCoinsPF2e {
		const pf2eCoins = game.pf2e.Coins.fromString(coinString, quantity);
		return new UnsignedCoinsPF2e(pf2eCoins);
	}

	static copperValueToCoins(copperValue: number, includePp: boolean = false): UnsignedCoinsPF2e {
		if (copperValue < 0) {
			throw new Error(`cannot create UnsignedCoinsPF2e from negative copper value`);
		}
		const pp = includePp ? Math.floor(copperValue / 1000) : 0;
		const gp = Math.floor(copperValue / 100 - pp * 10);
		const sp = Math.floor(copperValue / 10 - pp * 100 - gp * 10);
		const cp = Math.floor(copperValue - pp * 1000 - gp * 100 - sp * 10);

		return new UnsignedCoinsPF2e({
			pp,
			gp,
			sp,
			cp,
		});
	}

	static getCopperValue(coins: UnsignedCoins): number {
		return new UnsignedCoinsPF2e(coins).copperValue;
	}

	static addCoins(coins: UnsignedCoins, otherCoins: UnsignedCoins): UnsignedCoinsPF2e {
		const unsignedCoins = new UnsignedCoinsPF2e(coins);
		const unsignedOtherCoins = new UnsignedCoinsPF2e(otherCoins);
		return unsignedCoins.plus(unsignedOtherCoins);
	}

	static sumCoins(...coinsList: UnsignedCoins[]): UnsignedCoinsPF2e {
		return new UnsignedCoinsPF2e(
			coinsList.reduce((prev, cur) => this.addCoins(prev, cur), new UnsignedCoinsPF2e())
		);
	}

	static subtractCoins(coins: UnsignedCoins, otherCoins: UnsignedCoins): UnsignedCoinsPF2e {
		const unsignedCoins = new UnsignedCoinsPF2e(coins);
		const unsignedOtherCoins = new UnsignedCoinsPF2e(otherCoins);
		return unsignedCoins.subtract(unsignedOtherCoins);
	}

	static multiplyCoins(mult: number, coins: UnsignedCoins): UnsignedCoinsPF2e {
		const unsignedCoins = new UnsignedCoinsPF2e(coins);
		return unsignedCoins.multiply(mult);
	}

	static minCoins(...coinsList: UnsignedCoins[]): UnsignedCoinsPF2e {
		const coinsPF2eList = coinsList.map((x) => new UnsignedCoinsPF2e(x));
		const copperValueList = coinsPF2eList.map((x) => x.copperValue);
		const idx = copperValueList.indexOf(Math.min(...copperValueList));
		return coinsPF2eList[idx];
	}

	static maxCoins(...coinsList: UnsignedCoins[]): UnsignedCoinsPF2e {
		const coinsPF2eList = coinsList.map((x) => new UnsignedCoinsPF2e(x));
		const copperValueList = coinsPF2eList.map((x) => x.copperValue);
		const idx = copperValueList.indexOf(Math.max(...copperValueList));
		return coinsPF2eList[idx];
	}

	toString(): string {
		if (DENOMINATIONS.every((denomination) => !this[denomination])) {
			return `0 ${game.i18n.localize("PF2E.CurrencyAbbreviations.gp")}`;
		}

		const parts: string[] = [];
		for (const denomination of DENOMINATIONS) {
			if (this[denomination]) {
				parts.push(`${this[denomination]} ${game.i18n.localize(`PF2E.CurrencyAbbreviations.${denomination}`)}`);
			}
		}

		return parts.join(", ");
	}
}
