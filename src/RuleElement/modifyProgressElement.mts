import type {
	RuleElementSchema,
	DegreeOfSuccessString,
	RollOptionRuleElement,
	ResolvableValueField,
} from "foundry-pf2e";
import type { StringField } from "foundry-pf2e/foundry/common/data/fields.mjs";
import type { CharacterPF2eHeroicCrafting } from "../character.mjs";
import type { ModifyProgressSynthetic } from "./types.js";
import type { UnsignedCoins } from "../Helper/currencyTypes.mjs";
import type {
	HEROIC_CRAFTING_SPENDING_LIMIT_COINS_RECORD,
	HEROIC_CRAFTING_SPENDING_LIMIT_UNSIGNEDCOINSPF2E_RECORD,
} from "../Helper/constants.mjs";

import { HEROIC_CRAFTING_GATHERED_INCOME, HEROIC_CRAFTING_SPENDING_LIMIT } from "../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { objectToString } from "../Helper/generics.mjs";
import { consoleDebug } from "../Helper/log.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";

type ModifyProgressSchema = RuleElementSchema & {
	outcome: StringField;
	operation: StringField;
	value: StringField;
};

const fields = foundry.data.fields;
type ModifyProgressChangeOperation = keyof typeof ModifyProgressRuleElement.CHANGE_OPERATION_DEFAULT_PRIORITIES;

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
		consoleDebug(CONFIG.debug.ruleElement, "ModifyProgressRuleElement", options);
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
				consoleDebug(CONFIG.debug.ruleElement, "beforePrepareData", objectToString(change), typeof change);

				if (typeof change === "string" && Number.isNumeric(change)) {
					change = Number.parseFloat(change);
				}
				if (typeof change !== "number" || !Number.isNumeric(change)) {
					const changeString = objectToString(change);
					this.failValidation(`${this.value} (${changeString}) could not resolve to a number`);
					return;
				}
				const synthetic: ModifyProgressSynthetic = {
					predicate,
					operation: this.operation,
					change,
					outcome: this.outcome,
					label: this.label,
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
				if (!CoinsPF2eUtility.isUnsignedCoin(change)) {
					const changeString = objectToString(change);
					this.failValidation(`${this.value} (${changeString}) could not resolve to Coins`);
					return;
				}
				const synthetic: ModifyProgressSynthetic = {
					predicate,
					operation: this.operation,
					change,
					outcome: this.outcome,
					label: this.label,
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
