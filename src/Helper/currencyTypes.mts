import type { Coins } from "foundry-pf2e";

export const DENOMINATIONS = ["pp", "gp", "sp", "cp"] as const;
export type DENOMINATION = (typeof DENOMINATIONS)[number];

export type SignedCoins = Coins & { isNegative?: boolean };
export type UnsignedCoins = Coins & { isNegative?: never };
