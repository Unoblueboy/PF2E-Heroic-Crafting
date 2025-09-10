import { ActorPF2e } from "../../types/src/module/actor";
import { ConsumablePF2e } from "../../types/src/module/item";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { createSalvage } from "../Salvage/salvage.mjs";

export async function junkCollectorOnConsume(item: ConsumablePF2e) {
	if (!item.actor) return;
	if (!CheckFeat(item.actor, "junk-collector")) return;
	if (item.isTemporary) return;
	if (!item.system.uses.autoDestroy) return;

	await createSalvage(item, UnsignedCoinsPF2e.multiplyCoins(1 / 4, item.price.value));
}

export function CheckFeat(actor: ActorPF2e, slug: string) {
	return actor.itemTypes.feat.some((i) => i.slug === slug || game.pf2e.system.sluggify(i.name) === slug);
}
