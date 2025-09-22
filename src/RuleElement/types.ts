import type { Predicate, DegreeOfSuccessString } from "foundry-pf2e";
import type { UnsignedCoins } from "../Helper/currencyTypes.mjs";

// MODIFY PROGRESS TYPES
type ModifyProgressMultDivSynthetic = {
	predicate: Predicate;
	operation: "multiply" | "divide";
	change: number;
	outcome: DegreeOfSuccessString[];
	label: string;
};

type ModifyProgressAddSubSynthetic = {
	predicate: Predicate;
	operation: "add" | "subtract" | "upgrade" | "downgrade" | "override";
	change: UnsignedCoins;
	outcome: DegreeOfSuccessString[];
	label: string;
};

export type ModifyProgressSynthetic = ModifyProgressMultDivSynthetic | ModifyProgressAddSubSynthetic;

// MODIFY CONSTANT TYPES
export type ModifyConstantSpendingLimitMultDivSynthetic = {
	predicate: Predicate;
	constant: "spendingLimit";
	operation: "multiply" | "divide";
	change: number;
};

export type ModifyConstantSpendingLimitOtherSynthetic = {
	predicate: Predicate;
	constant: "spendingLimit";
	operation: "add" | "subtract" | "upgrade" | "downgrade" | "override";
	change: UnsignedCoins;
};

export type ModifyConstantBatchSizeSynthetic = {
	predicate: Predicate;
	constant: "batchSize";
	operation: "add" | "subtract" | "multiply" | "divide" | "upgrade" | "downgrade" | "override";
	change: number;
};

export type ModifyConstantRushCostBooleanSynthetic = {
	predicate: Predicate;
	constant: "rushCost";
	operation: "override" | "and" | "or" | "nand" | "nor" | "xor";
	change: boolean;
};

export type ModifyConstantRushCostUnarySynthetic = {
	predicate: Predicate;
	constant: "rushCost";
	operation: "not";
};

export type ModifyConstantRushCostSynthetic =
	| ModifyConstantRushCostBooleanSynthetic
	| ModifyConstantRushCostUnarySynthetic;

export type ModifyConstantSpendingLimitSynthetic =
	| ModifyConstantSpendingLimitMultDivSynthetic
	| ModifyConstantSpendingLimitOtherSynthetic;

export type ModifyConstantSynthetic =
	| ModifyConstantSpendingLimitSynthetic
	| ModifyConstantBatchSizeSynthetic
	| ModifyConstantRushCostSynthetic;
