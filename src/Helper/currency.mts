import { Coins } from "../../types/src/module/item/physical";
import { UnsignedCoins, SignedCoins } from "./currencyTypes.mjs";
import { SignedCoinsPF2e } from "./signedCoins.mjs";
import { UnsignedCoinsPF2e } from "./unsignedCoins.mjs";

export const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;
export type DENOMINATION = (typeof DENOMINATIONS)[number];

export class CoinsPF2eUtility {
	static isCoin(coin: unknown): coin is Coins {
		return typeof coin === "object" && coin !== null;
	}

	static toSignedCoins(coins: UnsignedCoins | SignedCoins) {
		return new SignedCoinsPF2e(coins);
	}

	static toUnsignedCoins(coins: UnsignedCoins | SignedCoins, boundCoins: boolean = true) {
		if (SignedCoinsPF2e.getCopperValue(coins) < 0) {
			console.warn(`${this} converted to UnsignedCoins, sign has been lost in the process`);
		}
		const data = boundCoins ? SignedCoinsPF2e.maxCoins({}, coins) : coins;
		delete data.isNegative;

		return new UnsignedCoinsPF2e(data as UnsignedCoins);
	}
}
