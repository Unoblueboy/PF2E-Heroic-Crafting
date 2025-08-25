import { Coins, CoinsPF2e } from "../../types/src/module/item/physical";
import { ResolvableValueField, RuleElementSchema } from "../../types/src/module/rules/rule-element";
import { RollOptionRuleElement } from "../../types/src/module/rules/rule-element/roll-option/rule-element";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { Predicate } from "../../types/src/module/system/predication";
import { StringField } from "../../types/types/foundry/common/data/fields.mjs";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import {
	HEROIC_CRAFTING_GATHERED_INCOME,
	HEROIC_CRAFTING_SPENDING_LIMIT,
	HEROIC_CRAFTING_SPENDING_LIMIT_COINS_RECORD,
	HEROIC_CRAFTING_SPENDING_LIMIT_COINSPF2E_RECORD,
} from "../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";

type ModifyProgressSchema = RuleElementSchema & {
	outcome: StringField;
	operation: StringField;
	value: StringField;
};

const fields = foundry.data.fields;
type ModifyProgressChangeOperation = keyof typeof ModifyProgressRuleElement.CHANGE_OPERATION_DEFAULT_PRIORITIES;

type ModifyProgressMultDivSynthetic = {
	predicate: Predicate;
	operation: "multiply" | "divide";
	change: number;
	outcome: DegreeOfSuccessString[];
};

type ModifyProgressAddSubSynthetic = {
	predicate: Predicate;
	operation: "add" | "subtract" | "upgrade" | "downgrade" | "override";
	change: Coins;
	outcome: DegreeOfSuccessString[];
};

export type ModifyProgressSynthetic = ModifyProgressMultDivSynthetic | ModifyProgressAddSubSynthetic;

export class ModifyProgressRuleElement extends game.pf2e.RuleElement<ModifyProgressSchema> {
	protected static override validActorTypes: ["character"] = ["character"];

	declare operation: ModifyProgressChangeOperation;
	declare value: unknown;
	declare outcome: DegreeOfSuccessString[];

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
			outcome: new fields.ArrayField(
				new fields.StringField({
					required: true,
					blank: false,
					choices: ["criticalSuccess", "success", "failure", "criticalFailure"],
				}),
				{ required: true, nullable: false, initial: undefined }
			),
			operation: new fields.StringField({
				required: true,
				nullable: false,
				blank: false,
				choices: ["multiply", "divide", "add", "subtract", "downgrade", "upgrade", "override"],
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

	override resolveInjectedProperties<T extends string | number | object | null | undefined>(
		source: T,
		options?: { injectables?: Record<string, unknown>; warn?: boolean } | undefined
	): T {
		const heroicCraftingInjectables: {
			spendingLimit: Map<number, HEROIC_CRAFTING_SPENDING_LIMIT_COINSPF2E_RECORD>;
			gatheredIncome: Map<number, CoinsPF2e>;
			actor?: { spendingLimit: HEROIC_CRAFTING_SPENDING_LIMIT_COINSPF2E_RECORD; gatheredIncome: CoinsPF2e };
		} = {
			spendingLimit: new Map(
				[...HEROIC_CRAFTING_SPENDING_LIMIT.entries()].map(([k, record]) => [k, coinsToCoinsPF2eRecord(record)])
			),
			gatheredIncome: new Map(
				[...HEROIC_CRAFTING_GATHERED_INCOME.entries()].map(([k, record]) => [k, new game.pf2e.Coins(record)])
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
				gatheredIncome: new game.pf2e.Coins(HEROIC_CRAFTING_GATHERED_INCOME.get(this.actor.level) ?? {}),
			};
		}

		options = foundry.utils.mergeObject(options ?? {}, {
			injectables: { heroiccrafting: heroicCraftingInjectables },
		});
		console.log("Heroic Crafting | ModifyProgressRuleElement", options);
		return super.resolveInjectedProperties(source, options);
	}

	beforePrepareData() {
		if (this.ignored) return;

		const predicate = this.resolveInjectedProperties(this.predicate);
		const synthetics = ((this.actor as CharacterPF2eHeroicCrafting).synthetics.modifyProgress ??= []);

		let change = this.resolveValue(this.value);

		switch (this.operation) {
			case "multiply":
			case "divide": {
				console.log(`Heroic Crafting | change ${change} ${typeof change}`);
				if (typeof change === "string" && Number.isNumeric(change)) {
					change = Number.parseFloat(change);
				}
				if (typeof change !== "number" || !Number.isNumeric(change)) {
					this.failValidation(`${this.value} (${change}) could not resolve to a number`);
					return;
				}
				const synthetic: ModifyProgressSynthetic = {
					predicate,
					operation: this.operation,
					change,
					outcome: this.outcome,
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
					change = game.pf2e.Coins.fromString(change);
				}
				if (!CoinsPF2eUtility.isCoin(change)) {
					this.failValidation(`${this.value} (${change}) could not resolve to Coins`);
					return;
				}
				const synthetic: ModifyProgressSynthetic = {
					predicate,
					operation: this.operation,
					change,
					outcome: this.outcome,
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
): HEROIC_CRAFTING_SPENDING_LIMIT_COINSPF2E_RECORD {
	return {
		hour: new game.pf2e.Coins(record.hour),
		day: new game.pf2e.Coins(record.day),
		week: new game.pf2e.Coins(record.week),
	};
}
