import {
	ResolvableValueField,
	RuleElementOptions,
	RuleElementSchema,
	RuleElementSource,
} from "../../types/src/module/rules/rule-element";
import { RollOptionRuleElement } from "../../types/src/module/rules/rule-element/roll-option/rule-element";
import { Predicate } from "../../types/src/module/system/predication";
import { StringField } from "../../types/types/foundry/common/data/fields.mjs";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import {
	HEROIC_CRAFTING_GATHERED_INCOME,
	HEROIC_CRAFTING_SPENDING_LIMIT,
	HEROIC_CRAFTING_SPENDING_LIMIT_COINS_RECORD,
	HEROIC_CRAFTING_SPENDING_LIMIT_UNSIGNEDCOINSPF2E_RECORD,
} from "../Helper/constants.mjs";
import { CoinsPF2eUtility, UnsignedCoins } from "../Helper/currency.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";

type ModifyConstantSchema = RuleElementSchema & {
	constant: StringField;
	operation: StringField;
	value: StringField;
};

const fields = foundry.data.fields;
export type ModifyConstantChangeOperation = keyof typeof ModifyConstantRuleElement.CHANGE_OPERATION_DEFAULT_PRIORITIES;
export type ModifyConstantElementConstant = (typeof ModifyConstantRuleElement.HEROIC_CRAFTING_CONSTANTS)[number];

type ModifyConstantSpendingLimitMultDivSynthetic = {
	predicate: Predicate;
	constant: "spendingLimit";
	operation: "multiply" | "divide";
	change: number;
};

type ModifyConstantSpendingLimitOtherSynthetic = {
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

export class ModifyConstantRuleElement extends game.pf2e.RuleElement<ModifyConstantSchema> {
	protected static override validActorTypes: ["character"] = ["character"];

	declare constant: ModifyConstantElementConstant;
	declare operation: ModifyConstantChangeOperation;
	declare value: unknown;

	constructor(source: ModifyConstantSource, options: RuleElementOptions) {
		super(source, options);
		if (this.invalid) return;

		if (
			this.constant === "spendingLimit" &&
			!["add", "subtract", "multiply", "divide", "upgrade", "downgrade", "override"].includes(this.operation)
		) {
			this.failValidation(
				`Spending Limit: Operation must be one of ("override", "and", "or", "nand", "nor", "xor", "not")`
			);
		}

		if (
			this.constant === "batchSize" &&
			!["add", "subtract", "multiply", "divide", "upgrade", "downgrade", "override"].includes(this.operation)
		) {
			this.failValidation(
				`Batch Size: Operation must be one of ("override", "and", "or", "nand", "nor", "xor", "not")`
			);
		}

		if (
			this.constant === "rushCost" &&
			!["override", "and", "or", "nand", "nor", "xor", "not"].includes(this.operation)
		) {
			this.failValidation(
				`Rush Cost: Operation must be one of ("override", "and", "or", "nand", "nor", "xor", "not")`
			);
		}

		if (this.constant === "rushCost" && typeof this.resolveValue(this.value) !== "boolean") {
			this.failValidation("Rush Cost: Value must resolve to a boolean");
		}
	}

	static defineSchema() {
		const baseSchema = super.defineSchema();

		const PRIORITIES: Record<string, number | undefined> = this.CHANGE_OPERATION_DEFAULT_PRIORITIES;
		baseSchema.priority.initial = (d) => PRIORITIES[String(d.operation)] ?? 50;

		const RollOptionRuleElementClass = game.pf2e.RuleElements.builtin.RollOption! as typeof RollOptionRuleElement;
		const rollOptionSchema = RollOptionRuleElementClass.defineSchema();
		const ResolvableValueFieldConstructor = rollOptionSchema.value.constructor as ConstructorOf<
			ResolvableValueField<true, true>
		>;

		return {
			...baseSchema,
			constant: new fields.StringField({
				required: true,
				blank: false,
				choices: this.HEROIC_CRAFTING_CONSTANTS,
			}),
			operation: new fields.StringField({
				required: true,
				nullable: false,
				blank: false,
				choices: [
					"multiply",
					"divide",
					"add",
					"subtract",
					"downgrade",
					"upgrade",
					"override",
					"and",
					"or",
					"nand",
					"nor",
					"xor",
					"not",
				],
			}),
			value: new ResolvableValueFieldConstructor({
				required: true,
				nullable: false,
				initial: undefined,
			}),
		};
	}

	static readonly CHANGE_OPERATION_DEFAULT_PRIORITIES = {
		multiply: 10,
		divide: 10,
		add: 20,
		subtract: 20,
		downgrade: 30,
		upgrade: 40,
		override: 50,
	};

	static readonly HEROIC_CRAFTING_CONSTANTS = ["spendingLimit", "batchSize", "rushCost"] as const;

	override resolveInjectedProperties<T extends string | number | object | null | undefined>(
		source: T,
		options?: { injectables?: Record<string, unknown>; warn?: boolean } | undefined
	): T {
		const heroicCraftingInjectables: {
			spendingLimit: Map<number, HEROIC_CRAFTING_SPENDING_LIMIT_UNSIGNEDCOINSPF2E_RECORD>;
			gatheredIncome: Map<number, UnsignedCoins>;
			actor?: {
				spendingLimit: HEROIC_CRAFTING_SPENDING_LIMIT_UNSIGNEDCOINSPF2E_RECORD;
				gatheredIncome: UnsignedCoins;
			};
		} = {
			spendingLimit: new Map(
				[...HEROIC_CRAFTING_SPENDING_LIMIT.entries()].map(([k, record]) => [k, coinsToCoinsPF2eRecord(record)])
			),
			gatheredIncome: new Map(
				[...HEROIC_CRAFTING_GATHERED_INCOME.entries()].map(([k, record]) => [k, new UnsignedCoinsPF2e(record)])
			),
		};

		if (this.actor) {
			heroicCraftingInjectables.actor = {
				spendingLimit: coinsToCoinsPF2eRecord(
					HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level) ?? {
						hour: {},
						day: {},
						week: {},
					}
				),
				gatheredIncome: new UnsignedCoinsPF2e(HEROIC_CRAFTING_GATHERED_INCOME.get(this.actor.level) ?? {}),
			};
		}

		options = foundry.utils.mergeObject(options ?? {}, {
			injectables: { heroiccrafting: heroicCraftingInjectables },
		});
		if (CONFIG.debug.ruleElement) console.debug("HEROIC CRAFTING | DEBUG | ModifyConstantRuleElement", options);
		return super.resolveInjectedProperties(source, options);
	}

	beforePrepareData() {
		if (this.ignored) return;

		switch (this.constant) {
			case "batchSize":
				this.CreateBatchSizeSynthetic();
				break;
			case "rushCost":
				this.CreateRushCostSynthetic();
				break;
			case "spendingLimit":
				this.CreateSpendingLimitSynthetic();
				break;
			default:
				this.failValidation(`${this.constant} is not a valid constant`);
				break;
		}
	}
	CreateBatchSizeSynthetic() {
		if (this.constant !== "batchSize") return;

		const predicate = this.resolveInjectedProperties(this.predicate);
		const synthetics = ((this.actor as CharacterPF2eHeroicCrafting).synthetics.modifyConstant ??= []);

		let change = this.resolveValue(this.value);

		switch (this.operation) {
			case "add":
			case "subtract":
			case "multiply":
			case "divide":
			case "upgrade":
			case "downgrade":
			case "override": {
				if (CONFIG.debug.ruleElement)
					console.debug(`HEROIC CRAFTING | DEBUG | change ${change} ${typeof change}`);
				if (typeof change === "string" && Number.isNumeric(change)) {
					change = Number.parseFloat(change);
				}
				if (typeof change !== "number" || !Number.isNumeric(change)) {
					this.failValidation(`${this.value} (${change}) could not resolve to a number`);
					return;
				}
				const synthetic: ModifyConstantBatchSizeSynthetic = {
					predicate,
					constant: this.constant,
					operation: this.operation,
					change,
				};
				synthetics.push(synthetic);
				break;
			}
			default:
				this.failValidation(`${this.operation} is not a valid operation`);
				return;
		}
	}

	CreateRushCostSynthetic() {
		if (this.constant !== "rushCost") return;

		const predicate = this.resolveInjectedProperties(this.predicate);
		const synthetics = ((this.actor as CharacterPF2eHeroicCrafting).synthetics.modifyConstant ??= []);

		const change = this.resolveValue(this.value);

		switch (this.operation) {
			case "override": {
				console.debug(`HEROIC CRAFTING | DEBUG | change ${change} ${typeof change}`);
				if (typeof change !== "boolean") {
					this.failValidation(`${this.value} (${change}) could not resolve to a boolean`);
					return;
				}
				const synthetic: ModifyConstantRushCostSynthetic = {
					predicate,
					constant: this.constant,
					operation: this.operation,
					change,
				};
				synthetics.push(synthetic);
				break;
			}
			default:
				this.failValidation(`${this.operation} is not a valid operation`);
				return;
		}
	}

	CreateSpendingLimitSynthetic() {
		if (this.constant !== "spendingLimit") return;

		const predicate = this.resolveInjectedProperties(this.predicate);
		const synthetics = ((this.actor as CharacterPF2eHeroicCrafting).synthetics.modifyConstant ??= []);

		let change = this.resolveValue(this.value);

		switch (this.operation) {
			case "multiply":
			case "divide": {
				console.debug(`HEROIC CRAFTING | DEBUG | change ${change} ${typeof change}`);
				if (typeof change === "string" && Number.isNumeric(change)) {
					change = Number.parseFloat(change);
				}
				if (typeof change !== "number" || !Number.isNumeric(change)) {
					this.failValidation(`${this.value} (${change}) could not resolve to a number`);
					return;
				}
				const synthetic: ModifyConstantSpendingLimitMultDivSynthetic = {
					predicate,
					constant: this.constant,
					operation: this.operation,
					change,
				};
				synthetics.push(synthetic);
				break;
			}
			case "add":
			case "subtract":
			case "upgrade":
			case "downgrade":
			case "override": {
				if (
					typeof change === "string" &&
					["pp", "gp", "sp", "cp"].some((x) => (change as string).includes(x))
				) {
					change = UnsignedCoinsPF2e.fromString(change);
				}
				if (!CoinsPF2eUtility.isCoin(change)) {
					this.failValidation(`${this.value} (${change}) could not resolve to Coins`);
					return;
				}
				const synthetic: ModifyConstantSpendingLimitOtherSynthetic = {
					predicate,
					constant: this.constant,
					operation: this.operation,
					change,
				};
				synthetics.push(synthetic);
				break;
			}
			default:
				this.failValidation(`${this.operation} is not a valid operation`);
				return;
		}
	}
}

function coinsToCoinsPF2eRecord(
	record: HEROIC_CRAFTING_SPENDING_LIMIT_COINS_RECORD
): HEROIC_CRAFTING_SPENDING_LIMIT_UNSIGNEDCOINSPF2E_RECORD {
	return {
		hour: new UnsignedCoinsPF2e(record.hour),
		day: new UnsignedCoinsPF2e(record.day),
		week: new UnsignedCoinsPF2e(record.week),
	};
}

interface ModifyConstantSource extends RuleElementSource {
	constant?: JSONValue;
	operation?: JSONValue;
	value?: JSONValue;
}
