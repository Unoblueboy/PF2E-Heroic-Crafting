import { DamageDicePF2e, ModifierPF2e } from "../../types/src/module/actor/modifiers";
import { WeaponPF2e } from "../../types/src/module/item";
import { ItemSourcePF2e } from "../../types/src/module/item/base/data";
import { RuleElementPF2e } from "../../types/src/module/rules";

export class TestRuleElement extends game.pf2e.RuleElement {
	protected static override validActorTypes: ["character"] = ["character"];

	onApplyActiveEffects() {
		console.log("onApplyActiveEffects");
	}

	beforePrepareData() {
		console.log("beforePrepareData");
	}

	afterPrepareData() {
		console.log("afterPrepareData");
	}

	beforeRoll(domains: string[], rollOptions: Set<string>) {
		console.log("beforeRoll", domains, rollOptions);
	}

	async afterRoll(params: RuleElementPF2e.AfterRollParams) {
		console.log("afterRoll", params);
	}

	async preCreate({ ruleSource, itemSource, pendingItems, operation }: RuleElementPF2e.PreCreateParams) {
		console.log("preCreate", ruleSource, itemSource, pendingItems, operation);
	}

	async preDelete({ pendingItems, operation }: RuleElementPF2e.PreDeleteParams) {
		console.log("preDelete", pendingItems, operation);
	}

	async preUpdate(changes: DeepPartial<ItemSourcePF2e>) {
		console.log("preUpdate", changes);
	}

	onCreate(actorUpdates: Record<string, unknown>) {
		console.log("onCreate", actorUpdates);
	}

	async onUpdateEncounter(data: { event: "initiative-roll" | "turn-start"; actorUpdates: Record<string, unknown> }) {
		console.log("onUpdateEncounter", data);
	}

	onDelete(actorUpdates: Record<string, unknown>) {
		console.log("onDelete", actorUpdates);
	}

	applyDamageExclusion(weapon: WeaponPF2e, modifiers: (DamageDicePF2e | ModifierPF2e)[]) {
		console.log("applyDamageExclusion", weapon, modifiers);
	}
}
