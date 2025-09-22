import type { ConsumablePF2e } from "foundry-pf2e";

import { hasFeat } from "../Helper/item.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { createSalvage } from "../Salvage/salvage.mjs";

export async function junkCollectorOnConsume(item: ConsumablePF2e) {
	if (!item.actor) return;
	if (!hasFeat(item.actor, "junk-collector")) return;
	if (item.isTemporary) return;
	if (!item.system.uses.autoDestroy) return;

	await createSalvage(item, UnsignedCoinsPF2e.multiplyCoins(1 / 4, item.price.value));
}
