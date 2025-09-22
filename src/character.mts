import type { CharacterPF2e, RuleElementSynthetics } from "foundry-pf2e";
import type { ModifyProgressSynthetic, ModifyConstantSynthetic } from "./RuleElement/types.js";

interface PF2eHeroicCraftingRuleElementSynthetics {
	modifyProgress?: ModifyProgressSynthetic[];
	modifyConstant?: ModifyConstantSynthetic[];
}

export type CharacterPF2eHeroicCrafting<TActor extends CharacterPF2e = CharacterPF2e> = TActor & {
	synthetics: RuleElementSynthetics<TActor> & PF2eHeroicCraftingRuleElementSynthetics;
};
