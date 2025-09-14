import { CharacterPF2e } from "../types/src/module/actor";
import { RuleElementSynthetics } from "../types/src/module/rules";
import { ModifyProgressSynthetic, ModifyConstantSynthetic } from "./RuleElement/types";

interface PF2eHeroicCraftingRuleElementSynthetics {
	modifyProgress?: ModifyProgressSynthetic[];
	modifyConstant?: ModifyConstantSynthetic[];
}

export type CharacterPF2eHeroicCrafting<TActor extends CharacterPF2e = CharacterPF2e> = TActor & {
	synthetics: RuleElementSynthetics<TActor> & PF2eHeroicCraftingRuleElementSynthetics;
};
