import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { DEGREE_OF_SUCCESS_STRINGS } from "../Helper/constants.mjs";
import { SignedCoins } from "../Helper/currency.mjs";
import { ModifyProgressRuleElementHelper } from "../RuleElement/Helpers/ModifyProgressRuleElementHelper.mjs";

export type ProjectProgress = {
	[x in DegreeOfSuccessString]: SignedCoins;
};

export type ProjectProgressAndRundown = {
	[x in DegreeOfSuccessString]: SignedCoins;
} & {
	rundownSummary: {
		[x in DegreeOfSuccessString]: string[];
	};
};

export class HeroicCraftingProjectHelper {
	static getProjectProgress<
		B extends boolean | undefined,
		T = B extends false ? ProjectProgress : ProjectProgressAndRundown
	>(
		actor: CharacterPF2eHeroicCrafting,
		startValues: { [x in DegreeOfSuccessString]: SignedCoins },
		rollOptions: Set<string> | string[],
		includeRundownSummary?: B
	): T {
		if (CONFIG.debug.ruleElement) {
			console.debug(`HEROIC CRAFTING | DEBUG | getProjectProgress`);
			console.debug(`HEROIC CRAFTING | DEBUG |`, actor, startValues, rollOptions, includeRundownSummary);
		}
		const values: ProjectProgress | ProjectProgressAndRundown = foundry.utils.deepClone(startValues);
		const rundownSummary: { [x in DegreeOfSuccessString]: string[] } = {
			criticalFailure: [],
			failure: [],
			success: [],
			criticalSuccess: [],
		};
		for (const synthetic of actor.synthetics.modifyProgress ?? []) {
			if (CONFIG.debug.ruleElement) {
				console.debug(`HEROIC CRAFTING | DEBUG | Modify Progress Synthetic`);
				console.debug(`HEROIC CRAFTING | DEBUG |`, synthetic);
			}
			if (!synthetic.predicate.test(rollOptions)) continue;
			for (const outcome of DEGREE_OF_SUCCESS_STRINGS) {
				if (!synthetic.outcome.includes(outcome)) continue;

				const tempValue = ModifyProgressRuleElementHelper.getNewValue(values[outcome], synthetic);
				if (tempValue === undefined) continue;
				values[outcome] = tempValue;

				if (includeRundownSummary) {
					const syntheticSummary = ModifyProgressRuleElementHelper.getSyntheticSummary(synthetic);
					if (!syntheticSummary) continue;
					rundownSummary[outcome].push(syntheticSummary);
				}
			}
		}

		if (includeRundownSummary as B) {
			(values as ProjectProgressAndRundown).rundownSummary = rundownSummary;
		}

		return values as T;
	}
}
