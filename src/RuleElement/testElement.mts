import { DamageDicePF2e, ModifierPF2e } from "../../types/src/module/actor/modifiers";
import { WeaponPF2e } from "../../types/src/module/item";
import { ItemSourcePF2e } from "../../types/src/module/item/base/data";
import { RuleElementPF2e } from "../../types/src/module/rules";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";

export class TestRuleElement extends game.pf2e.RuleElement {
	protected static override validActorTypes: ["character"] = ["character"];

	onApplyActiveEffects() {
		console.log("Heroic Crafting |", "onApplyActiveEffects");
	}

	beforePrepareData() {
		if (this.ignored) return;

		const resolvedValue = this.resolveValue("{actor|spendingLimit.day}");
		console.log("Heroic Crafting |", "beforePrepareData", resolvedValue, typeof resolvedValue);
		// beforePrepareData 3200 gp string
		const predicate = this.resolveInjectedProperties(this.predicate);
		console.log(
			"Heroic Crafting |",
			"Synthetics",
			this.actor.name,
			(this.actor as CharacterPF2eHeroicCrafting).heroicCraftingSynthetics
		);
		const synthetics = ((this.actor as CharacterPF2eHeroicCrafting).heroicCraftingSynthetics.testSynthetic ??= []);
		synthetics.push({ predicate });
	}

	override afterPrepareData() {
		super.afterPrepareData?.();
		console.log("Heroic Crafting |", "afterPrepareData");
	}

	beforeRoll(domains: string[], rollOptions: Set<string>) {
		console.log("Heroic Crafting |", "beforeRoll", domains, rollOptions);
	}

	async afterRoll(params: RuleElementPF2e.AfterRollParams) {
		console.log("Heroic Crafting |", "afterRoll", params);
	}

	async preCreate({ ruleSource, itemSource, pendingItems, operation }: RuleElementPF2e.PreCreateParams) {
		console.log("Heroic Crafting |", "preCreate", ruleSource, itemSource, pendingItems, operation);
	}

	async preDelete({ pendingItems, operation }: RuleElementPF2e.PreDeleteParams) {
		console.log("Heroic Crafting |", "preDelete", pendingItems, operation);
	}

	async preUpdate(changes: DeepPartial<ItemSourcePF2e>) {
		console.log("Heroic Crafting |", "preUpdate", changes);
	}

	onCreate(actorUpdates: Record<string, unknown>) {
		console.log("Heroic Crafting |", "onCreate", actorUpdates);
	}

	async onUpdateEncounter(data: { event: "initiative-roll" | "turn-start"; actorUpdates: Record<string, unknown> }) {
		console.log("Heroic Crafting |", "onUpdateEncounter", data);
	}

	onDelete(actorUpdates: Record<string, unknown>) {
		console.log("Heroic Crafting |", "onDelete", actorUpdates);
	}

	applyDamageExclusion(weapon: WeaponPF2e, modifiers: (DamageDicePF2e | ModifierPF2e)[]) {
		console.log("Heroic Crafting |", "applyDamageExclusion", weapon, modifiers);
	}
}
