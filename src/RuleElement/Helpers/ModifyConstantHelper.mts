import type { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import type { UnsignedCoins } from "../../Helper/currencyTypes.mjs";
import type { Either } from "../../Helper/generics.mjs";
import type { ModifyConstantElementConstant } from "../modifyConstantElement.mjs";
import type {
	ModifyConstantBatchSizeSynthetic,
	ModifyConstantSpendingLimitSynthetic,
	ModifyConstantRushCostSynthetic,
	ModifyConstantSynthetic,
} from "../types.js";
import type { PhysicalItemPF2e } from "foundry-pf2e";
import type { ProjectCraftDuration } from "../../CraftProject/types.mjs";

import { HEROIC_CRAFTING_SPENDING_LIMIT } from "../../Helper/constants.mjs";
import { getMaxBatchSize } from "../../Helper/item.mjs";
import { consoleDebug } from "../../Helper/log.mjs";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";

type BatchSizeRetrievalData = Either<
	{
		value: number;
	},
	{ item: PhysicalItemPF2e }
>;

type SpendingLimitRetrievalData = {
	level?: number;
	duration: ProjectCraftDuration;
};

type RushCostRetrievalData = {
	value?: boolean;
};

type RetrievalData = BatchSizeRetrievalData | SpendingLimitRetrievalData | RushCostRetrievalData;

export class ModifyConstantRuleElementHelper {
	private static getNewValue(current: number, synthetic: ModifyConstantBatchSizeSynthetic): number | undefined;
	private static getNewValue(
		current: UnsignedCoins,
		synthetic: ModifyConstantSpendingLimitSynthetic
	): UnsignedCoins | undefined;
	private static getNewValue(current: boolean, synthetic: ModifyConstantRushCostSynthetic): boolean | undefined;
	private static getNewValue(
		current: number | UnsignedCoins | boolean,
		synthetic: ModifyConstantSynthetic
	): number | UnsignedCoins | boolean | undefined {
		switch (synthetic.constant) {
			case "batchSize":
				return ModifyConstantRuleElementHelper.getNewBatchSize(current as number, synthetic);
			case "spendingLimit":
				return ModifyConstantRuleElementHelper.getNewSpendingLimit(current as UnsignedCoins, synthetic);
			case "rushCost":
				return ModifyConstantRuleElementHelper.getNewRushCost(current as boolean, synthetic);
			default:
				return;
		}
	}

	private static getNewSpendingLimit(
		current: UnsignedCoins,
		synthetic: ModifyConstantSpendingLimitSynthetic
	): UnsignedCoins | undefined {
		switch (synthetic.operation) {
			case "multiply":
				return new UnsignedCoinsPF2e(current).multiply(synthetic.change);
			case "divide":
				if (synthetic.change === 0) return;
				return new UnsignedCoinsPF2e(current).multiply(1 / synthetic.change);
			case "add":
				if (synthetic.change === null) return;
				return new UnsignedCoinsPF2e(current).plus(synthetic.change);
			case "subtract":
				if (synthetic.change === null) return;
				return new UnsignedCoinsPF2e(current).subtract(synthetic.change);
			case "downgrade":
				if (synthetic.change === null) return;
				return UnsignedCoinsPF2e.minCoins(current, synthetic.change);
			case "upgrade":
				if (synthetic.change === null) return;
				return UnsignedCoinsPF2e.maxCoins(current, synthetic.change);
			case "override":
				if (synthetic.change === null) return;
				return synthetic.change;
			default:
				return;
		}
	}

	private static getNewBatchSize(current: number, synthetic: ModifyConstantBatchSizeSynthetic): number | undefined {
		switch (synthetic.operation) {
			case "multiply":
				return current * synthetic.change;
			case "divide":
				if (synthetic.change === 0) return;
				return current / synthetic.change;
			case "add":
				return current + synthetic.change;
			case "subtract":
				return current - synthetic.change;
			case "downgrade":
				return Math.min(current, synthetic.change);
			case "upgrade":
				return Math.max(current, synthetic.change);
			case "override":
				return synthetic.change;
			default:
				return;
		}
	}

	private static getNewRushCost(current: boolean, synthetic: ModifyConstantRushCostSynthetic): boolean | undefined {
		switch (synthetic.operation) {
			case "override":
				return synthetic.change;
			case "and":
				return current && synthetic.change;
			case "or":
				return current || synthetic.change;
			case "nand":
				return !(current && synthetic.change);
			case "nor":
				return !(current || synthetic.change);
			case "xor":
				return current !== synthetic.change;
			case "not":
				return !current;
			default:
				return;
		}
	}

	static getConstant(
		actor: CharacterPF2eHeroicCrafting,
		constant: "batchSize",
		retrievalData: BatchSizeRetrievalData,
		rollOptions: Set<string> | string[]
	): number;
	static getConstant(
		actor: CharacterPF2eHeroicCrafting,
		constant: "spendingLimit",
		retrievalData: SpendingLimitRetrievalData,
		rollOptions: Set<string> | string[]
	): UnsignedCoins;
	static getConstant(
		actor: CharacterPF2eHeroicCrafting,
		constant: "rushCost",
		retrievalData: RushCostRetrievalData,
		rollOptions: Set<string> | string[]
	): boolean;
	static getConstant(
		actor: CharacterPF2eHeroicCrafting,
		constant: ModifyConstantElementConstant,
		retrievalData: RetrievalData,
		rollOptions: Set<string> | string[]
	): boolean | number | UnsignedCoins | undefined {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getConstant`);
		consoleDebug(
			CONFIG.debug.ruleElement,
			`HEROIC CRAFTING | DEBUG |`,
			actor,
			constant,
			retrievalData,
			rollOptions
		);
		switch (constant) {
			case "rushCost":
				return ModifyConstantRuleElementHelper.getRushCost(
					actor,
					retrievalData as RushCostRetrievalData,
					rollOptions
				);
			case "batchSize":
				return ModifyConstantRuleElementHelper.getBatchSize(
					actor,
					retrievalData as BatchSizeRetrievalData,
					rollOptions
				);
			case "spendingLimit":
				return ModifyConstantRuleElementHelper.getSpendingLimit(
					actor,
					retrievalData as SpendingLimitRetrievalData,
					rollOptions
				);
			default:
				break;
		}
	}

	private static getRushCost(
		actor: CharacterPF2eHeroicCrafting,
		retrievalData: RushCostRetrievalData,
		rollOptions: Set<string> | string[]
	): boolean {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getRushCost`);
		let value = retrievalData.value ?? false;
		for (const synthetic of actor.synthetics.modifyConstant ?? []) {
			if (synthetic.constant !== "rushCost") continue;
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | Modify Constant Synthetic`);
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG |`, synthetic);

			if (!synthetic.predicate.test(rollOptions)) continue;
			const tempValue = ModifyConstantRuleElementHelper.getNewValue(value, synthetic);
			if (tempValue === undefined) continue;
			value = tempValue;
		}

		return value;
	}

	private static getBatchSize(
		actor: CharacterPF2eHeroicCrafting,
		retrievalData: BatchSizeRetrievalData,
		rollOptions: Set<string> | string[]
	): number {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getBatchSize`);
		let value = retrievalData.value ?? getMaxBatchSize(retrievalData.item) ?? 1;
		for (const synthetic of actor.synthetics.modifyConstant ?? []) {
			if (synthetic.constant !== "batchSize") continue;
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | Modify Constant Synthetic`);
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG |`, synthetic);

			if (!synthetic.predicate.test(rollOptions)) continue;
			const tempValue = ModifyConstantRuleElementHelper.getNewValue(value, synthetic);
			if (tempValue === undefined) continue;
			value = tempValue;
		}

		return value;
	}

	private static getSpendingLimit(
		actor: CharacterPF2eHeroicCrafting,
		retrievalData: SpendingLimitRetrievalData,
		rollOptions: Set<string> | string[]
	): UnsignedCoins {
		consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | getSpendingLimit`);
		let value: UnsignedCoins =
			HEROIC_CRAFTING_SPENDING_LIMIT.get(retrievalData.level ?? actor.level)?.[retrievalData.duration] ?? {};
		for (const synthetic of actor.synthetics.modifyConstant ?? []) {
			if (synthetic.constant !== "spendingLimit") continue;
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG | Modify Constant Synthetic`);
			consoleDebug(CONFIG.debug.ruleElement, `HEROIC CRAFTING | DEBUG |`, synthetic);

			if (!synthetic.predicate.test(rollOptions)) continue;
			const tempValue = ModifyConstantRuleElementHelper.getNewValue(value, synthetic);
			if (tempValue === undefined) continue;
			value = tempValue;
		}

		return value;
	}
}
