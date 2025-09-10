import { Coins } from "../../types/src/module/item/physical";

export const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;
export type DENOMINATION = (typeof DENOMINATIONS)[number];

export type SignedCoins = Coins & { isNegative?: boolean };
export type UnsignedCoins = Coins & { isNegative?: never };

export class CoinsPF2eUtility {
	static isCoin(coin: unknown): coin is Coins {
		return typeof coin === "object" && coin !== null;
	}
}
