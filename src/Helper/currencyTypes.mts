import { Coins } from "../../types/src/module/item/physical";

export type SignedCoins = Coins & { isNegative?: boolean };
export type UnsignedCoins = Coins & { isNegative?: never };
