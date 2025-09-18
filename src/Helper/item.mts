import { ActorPF2e } from "../../types/src/module/actor";
import { ConsumablePF2e, FeatPF2e, PhysicalItemPF2e, WeaponPF2e } from "../../types/src/module/item";
import { HEROIC_CRAFTING_ROLL_OPTION_PREFIX } from "./constants.mjs";

export function getHeroicItemRollOptions(item: PhysicalItemPF2e | undefined): Set<string> {
	if (!item) return new Set();
	return new Set([...item.getRollOptions("item").map((trait) => `${HEROIC_CRAFTING_ROLL_OPTION_PREFIX}:${trait}`)]);
}

const consumableMagicSlugs = [
	"scroll-of",
	"magic-wand",
	"wand-of-mercy",
	"wand-of-legerdemain",
	"wand-of-reaching",
	"wand-of-widening",
	"wand-of-continuation",
];

export function isGenericScrollOrWand(item: PhysicalItemPF2e | undefined) {
	if (!item) {
		return false;
	}
	if (!["wand", "scroll"].includes((item as ConsumablePF2e).category)) {
		return false;
	}
	if (!consumableMagicSlugs.some((slugStart) => item.slug?.startsWith(slugStart))) {
		return false;
	}
	return true;
}

export function getGenericScrollOrWandRank(item: ConsumablePF2e) {
	const containedSpellRankString = /(\d{1,2})(?=((st)|(nd)|(rd)|(th)))/.exec(item.name) ?? ["1"];
	const containedSpellRank = Number.parseInt(containedSpellRankString[0]) || 1;
	return containedSpellRank;
}

export function getMaxBatchSize(item: PhysicalItemPF2e | undefined): number {
	if (!item) return 1;
	const isAmmo = item.isOfType("consumable") && (item as ConsumablePF2e).isAmmo;
	const isMundaneAmmo = isAmmo && !item.isMagical;
	const isConsumable =
		(item.isOfType("consumable") && (item as ConsumablePF2e).category !== "wand") ||
		(item.isOfType("weapon") && (item as WeaponPF2e).baseType === "alchemical-bomb");

	const magicalAmmo = isConsumable && !isAmmo ? 4 : 1;
	const batchSize = Math.max(
		item.system.price.per,
		isMundaneAmmo ? Math.clamp(item.system.price.per, 1, 10) : magicalAmmo
	);
	return batchSize;
}

export function hasFeat(actor: ActorPF2e, slug: string) {
	return actor.itemTypes.feat.some(
		(feat: FeatPF2e) => feat.slug === slug || game.pf2e.system.sluggify(feat.name) === slug
	);
}
