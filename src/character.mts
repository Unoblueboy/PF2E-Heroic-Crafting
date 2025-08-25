console.log("Heroic Crafting |", `Begin Importing ${import.meta.url.replace(/.*\//g, "")}`);

import { CharacterPF2e } from "../types/src/module/actor";
import { RuleElementSynthetics } from "../types/src/module/rules";
import { DegreeOfSuccessString } from "../types/src/module/system/degree-of-success";
import { SignedCoins } from "./Helper/signedCoins.mjs";
import { ModifyProgressSynthetic } from "./RuleElement/modifyProgressElement.mjs";
import { ModifyProgressRuleElementHelper } from "./RuleElement/Helpers/ModifyProgressRuleElementHelper.mjs";

interface PF2eHeroicCraftingRuleElementSynthetics {
	testSynthetic?: unknown[];
	modifyProgress?: ModifyProgressSynthetic[];
}

export type CharacterPF2eHeroicCrafting<TActor extends CharacterPF2e = CharacterPF2e> = TActor & {
	synthetics: RuleElementSynthetics<TActor> & PF2eHeroicCraftingRuleElementSynthetics;
};

export class HeroicCraftingProjectHelper {
	static getProjectProgress(
		actor: CharacterPF2eHeroicCrafting,
		startValues: { [x in DegreeOfSuccessString]: SignedCoins },
		rollOptions: Set<string> | string[]
	): { [x in DegreeOfSuccessString]: SignedCoins } {
		const values = foundry.utils.deepClone(startValues);
		for (const synthetic of actor.synthetics.modifyProgress ?? []) {
			if (!synthetic.predicate.test(rollOptions)) continue;
			for (const outcome of ["criticalFailure", "failure", "success", "criticalSuccess"] as [
				"criticalFailure",
				"failure",
				"success",
				"criticalSuccess"
			]) {
				if (!synthetic.outcome.includes(outcome)) continue;

				const tempValue = ModifyProgressRuleElementHelper.getNewValue(values[outcome], synthetic);
				if (tempValue === undefined) continue;
				values[outcome] = tempValue;
			}
		}

		return values;
	}
}
