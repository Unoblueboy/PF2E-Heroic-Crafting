import { DENOMINATIONS, SignedCoins, UnsignedCoins } from "./currency.mjs";
import { UnsignedCoinsPF2e } from "./unsignedCoins.mjs";

export class SignedCoinsPF2e implements SignedCoins {
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
		return SignedCoinsPF2e.copperValueToCoins(totalCopperValue, includePp);
	}

	subtract(coins: SignedCoins): SignedCoinsPF2e {
		return this.plus({ ...coins, isNegative: !coins.isNegative });
	}

	multiply(multiplier: number): SignedCoinsPF2e {
		const copperValue = this.copperValue;
		return SignedCoinsPF2e.copperValueToCoins(Math.floor(multiplier * copperValue));
	}

	negate(): SignedCoinsPF2e {
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

	toUnsignedCoins(boundCoins: boolean = true): UnsignedCoins {
		if (this.copperValue < 0) {
			console.warn(`${this} converted to UnsignedCoins, sign has been lost in the process`);
		}
		const data = (boundCoins ? SignedCoinsPF2e.maxCoins({}, this) : this).toObject();
		delete data.isNegative;

		return new UnsignedCoinsPF2e(data as UnsignedCoins);
	}

	clone() {
		return new SignedCoinsPF2e(this);
	}

	static fromString(coinString: string, quantity = 1): SignedCoinsPF2e {
		const coins = game.pf2e.Coins.fromString(coinString, quantity);
		return new SignedCoinsPF2e({ ...coins, isNegative: coinString.startsWith("-") });
	}

	static copperValueToCoins(copperValue: number, includePp: boolean = false): SignedCoinsPF2e {
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

	static getCopperValue(coins: SignedCoins): number {
		return new SignedCoinsPF2e(coins).copperValue;
	}

	static negate(coins: SignedCoins): SignedCoinsPF2e {
		return new SignedCoinsPF2e(coins).negate();
	}

	static addCoins(coins: SignedCoins, otherCoins: SignedCoins): SignedCoinsPF2e {
		const signedCoins = new SignedCoinsPF2e(coins);
		const signedOtherCoins = new SignedCoinsPF2e(otherCoins);
		return signedCoins.plus(signedOtherCoins);
	}

	static sumCoins(...coinsList: SignedCoins[]): SignedCoinsPF2e {
		return new SignedCoinsPF2e(coinsList.reduce((prev, cur) => this.addCoins(prev, cur), new SignedCoinsPF2e()));
	}

	static subtractCoins(coins: SignedCoins, otherCoins: SignedCoins): SignedCoinsPF2e {
		const signedCoins = new SignedCoinsPF2e(coins);
		const signedOtherCoins = new SignedCoinsPF2e(otherCoins);
		return signedCoins.subtract(signedOtherCoins);
	}

	static multiplyCoins(mult: number, coins: SignedCoins): SignedCoinsPF2e {
		const copperValue = new SignedCoinsPF2e(coins).copperValue;
		return this.copperValueToCoins(Math.floor(mult * copperValue));
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

	static boundCoins(coin: SignedCoins, min: SignedCoins, max: SignedCoins) {
		const boundedCopperValue = Math.min(
			Math.max(SignedCoinsPF2e.getCopperValue(coin), SignedCoinsPF2e.getCopperValue(min)),
			SignedCoinsPF2e.getCopperValue(max)
		);

		return SignedCoinsPF2e.copperValueToCoins(boundedCopperValue);
	}

	static equal(coins: SignedCoins, otherCoins: SignedCoins, strict: boolean = false): boolean {
		if (!strict) return SignedCoinsPF2e.getCopperValue(coins) === SignedCoinsPF2e.getCopperValue(otherCoins);
		return (
			DENOMINATIONS.every((d) => (coins[d] || 0) === (otherCoins[d] || 0)) &&
			!!coins.isNegative === !!otherCoins.isNegative
		);
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

		const string = parts.join(", ");
		return this.isNegative ? `-${string}` : string;
	}

	static toString(coins: SignedCoins) {
		return new SignedCoinsPF2e(coins).toString();
	}

	static readonly INFINITY = new SignedCoinsPF2e({ pp: Infinity, gp: Infinity, sp: Infinity, cp: Infinity });
}
