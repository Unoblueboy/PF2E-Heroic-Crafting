import { DegreeOfSuccessString } from "../../../types/src/module/system/degree-of-success";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { DEGREE_OF_SUCCESS_STRINGS } from "../../Helper/constants.mjs";
import { SignedCoins } from "../../Helper/currency.mjs";
import { consoleDebug } from "../../Helper/log.mjs";
import { SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";
import { ModifyProgressSynthetic } from "../modifyProgressElement.mjs";

type ProjectProgress = {
	[x in DegreeOfSuccessString]: SignedCoins;
};

type ProjectRundown = {
	[x in DegreeOfSuccessString]: string[];
};

type ProjectProgressAndRundown = {
	[x in DegreeOfSuccessString]: SignedCoins;
} & { rundownSummary: ProjectRundown };

export class ModifyProgressRuleElementHelper {
	static getNewValue(current: SignedCoins, synthetic: ModifyProgressSynthetic): SignedCoins | undefined {
		switch (synthetic.operation) {
			case "multiply":
				return new SignedCoinsPF2e(current).multiply(synthetic.change);
			case "divide":
				if (synthetic.change === 0) return;
				return new SignedCoinsPF2e(current).multiply(1 / synthetic.change);
			case "add":
				if (synthetic.change === null) return;
				return new SignedCoinsPF2e(current).plus(synthetic.change);
			case "subtract":
				if (synthetic.change === null) return;
				return new SignedCoinsPF2e(current).subtract(synthetic.change);
			case "downgrade":
				if (synthetic.change === null) return;
				return SignedCoinsPF2e.minCoins(current, synthetic.change);
			case "upgrade":
				if (synthetic.change === null) return;
				return SignedCoinsPF2e.maxCoins(current, synthetic.change);
			case "override":
				if (synthetic.change === null) return;
				return synthetic.change;
			default:
				break;
		}
		return {};
	}

	static getSyntheticSummary(synthetic: ModifyProgressSynthetic): string | undefined {
		switch (synthetic.operation) {
			case "multiply":
				return `${synthetic.label}: ×${synthetic.change}`;
			case "divide":
				return `${synthetic.label}: /${synthetic.change}`;
			case "add":
				return `${synthetic.label}: +${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "subtract":
				return `${synthetic.label}: -${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "downgrade":
				return `${synthetic.label}: ↓${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "upgrade":
				return `${synthetic.label}: ↑${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "override":
				return `${synthetic.label}: =${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			default:
				return;
		}
	}

	static getProgress<
		B extends boolean | undefined,
		T = B extends false ? ProjectProgress : ProjectProgressAndRundown
	>(
		actor: CharacterPF2eHeroicCrafting,
		startValues: { [x in DegreeOfSuccessString]: SignedCoins },
		rollOptions: Set<string> | string[],
		includeRundownSummary?: B
	): T {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getProgress`);
		consoleDebug(
			CONFIG.debug.ruleElement,
			`HEROIC CRAFTING | DEBUG |`,
			actor,
			startValues,
			rollOptions,
			includeRundownSummary
		);
		return (
			includeRundownSummary
				? ModifyProgressRuleElementHelper.getProgressWithRundownSummary(actor, startValues, rollOptions)
				: ModifyProgressRuleElementHelper.getProgressWithoutRundownSummary(actor, startValues, rollOptions)
		) as T;
	}

	private static getProgressWithoutRundownSummary(
		actor: CharacterPF2eHeroicCrafting,
		startValues: { [x in DegreeOfSuccessString]: SignedCoins },
		rollOptions: Set<string> | string[]
	): ProjectProgress {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getProgressWithoutRundownSummary`);
		const values: ProjectProgress = foundry.utils.deepClone(startValues);
		for (const synthetic of actor.synthetics.modifyProgress ?? []) {
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | Modify Progress Synthetic`);
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG |`, synthetic);

			if (!synthetic.predicate.test(rollOptions)) continue;
			for (const outcome of DEGREE_OF_SUCCESS_STRINGS) {
				if (!synthetic.outcome.includes(outcome)) continue;

				const tempValue = ModifyProgressRuleElementHelper.getNewValue(values[outcome], synthetic);
				if (tempValue === undefined) continue;
				values[outcome] = tempValue;
			}
		}

		return values;
	}

	private static getProgressWithRundownSummary(
		actor: CharacterPF2eHeroicCrafting,
		startValues: { [x in DegreeOfSuccessString]: SignedCoins },
		rollOptions: Set<string> | string[]
	): ProjectProgressAndRundown {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getProgressWithRundownSummary`);
		const values: ProjectProgressAndRundown = {
			...foundry.utils.deepClone(startValues),
			rundownSummary: {
				criticalFailure: [],
				failure: [],
				success: [],
				criticalSuccess: [],
			},
		};
		for (const synthetic of actor.synthetics.modifyProgress ?? []) {
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | Modify Progress Synthetic`);
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG |`, synthetic);

			if (!synthetic.predicate.test(rollOptions)) continue;
			for (const outcome of DEGREE_OF_SUCCESS_STRINGS) {
				if (!synthetic.outcome.includes(outcome)) continue;

				const tempValue = ModifyProgressRuleElementHelper.getNewValue(values[outcome], synthetic);
				if (tempValue === undefined) continue;
				values[outcome] = tempValue;

				const syntheticSummary = ModifyProgressRuleElementHelper.getSyntheticSummary(synthetic);
				if (!syntheticSummary) continue;
				values.rundownSummary[outcome].push(syntheticSummary);
			}
		}

		return values;
	}
}
