import { ActorSourcePF2e } from "../types/src/module/actor/data";
import { Coins } from "../types/src/module/item/physical";
import { TokenDocumentPF2e } from "../types/src/module/scene";
import { DegreeOfSuccessString } from "../types/src/module/system/degree-of-success";
import { RollDataPF2e } from "../types/src/module/system/text-editor";
import { DocumentConstructionContext } from "../types/types/foundry/common/_types.mjs";
import { HEROIC_CRAFTING_GATHERED_INCOME } from "./Helper/constants.mjs";
import { SignedCoins } from "./Helper/signedCoins.mjs";
import { MaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { Projects } from "./Projects/projects.mjs";
import { ModifyProgressRuleElement, ModifyProgressSynthetic } from "./RuleElement/modifyProgressElement.mjs";

export class CharacterPF2eHeroicCrafting<
	TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null
> extends CONFIG.PF2E.Actor.documentClasses.character<TParent> {
	declare heroicCraftingSynthetics: PF2eHeroicCraftingRuleElementSynthetics;
	private _projects?: Projects;
	private materialTrove?: MaterialTrove;
	constructor(data: PreCreate<ActorSourcePF2e>, context: DocumentConstructionContext<TParent> = {}) {
		super(data, context);
	}

	protected override _initialize(options?: Record<string, unknown>): void {
		console.log("Heroic Crafting |", `_initialize ${this.name}`, options);
		this.heroicCraftingSynthetics = {};
		super._initialize(options);
		console.log("Heroic Crafting |", `Post _initialize ${this.name}`, options, Object.keys(this.synthetics));
	}

	override reset(): void {
		console.log("Heroic Crafting |", `reset ${this.name}`, this.heroicCraftingSynthetics);
		super.reset();
	}

	override _safePrepareData(): void {
		console.log("Heroic Crafting |", `_safePrepareData ${this.name}`, this.heroicCraftingSynthetics);
		super._safePrepareData();
	}

	override prepareData(): void {
		console.log("Heroic Crafting |", `prepareData ${this.name}`, this.heroicCraftingSynthetics);
		super.prepareData();
		/**
		 	const isTypeData = this.system instanceof foundry.abstract.TypeDataModel;
			if ( isTypeData ) this.system.prepareBaseData();
			this.prepareBaseData();
			this.prepareEmbeddedDocuments();
			if ( isTypeData ) this.system.prepareDerivedData();
			this.prepareDerivedData();
		 */
	}

	override prepareBaseData(): void {
		console.log("Heroic Crafting |", `prepareBaseData ${this.name}`, this.heroicCraftingSynthetics);
		super.prepareBaseData();
	}

	override prepareDerivedData(): void {
		console.log("Heroic Crafting |", `prepareDerivedData ${this.name}`, this.heroicCraftingSynthetics);
		super.prepareDerivedData();
	}

	override prepareEmbeddedDocuments(): void {
		console.log("Heroic Crafting |", `prepareEmbeddedDocuments ${this.name}`, this.heroicCraftingSynthetics);
		super.prepareEmbeddedDocuments();
	}

	override getRollData(): RollDataPF2e {
		const rollData = super.getRollData();

		rollData.gatheredIncome = HEROIC_CRAFTING_GATHERED_INCOME;
		return rollData;
	}

	async getMaterialTrove() {
		this.materialTrove = this.materialTrove ?? (await MaterialTrove.getMaterialTrove(this));
		return this.materialTrove;
	}

	get projects(): Projects | undefined {
		this._projects = this._projects ?? Projects.getProjects(this);
		return this._projects;
	}
}

interface PF2eHeroicCraftingRuleElementSynthetics {
	testSynthetic?: unknown[];
	modifyProgress?: ModifyProgressSynthetic[];
}

export class HeroicCraftingProjectHelper {
	static getProjectProgress(
		actor: CharacterPF2eHeroicCrafting,
		startValues: { [x in DegreeOfSuccessString]: SignedCoins },
		rollOptions: Set<string> | string[]
	): { [x in DegreeOfSuccessString]: SignedCoins } {
		const values = foundry.utils.deepClone(startValues);
		for (const synthetic of actor.heroicCraftingSynthetics.modifyProgress ?? []) {
			if (!synthetic.predicate.test(rollOptions)) continue;
			for (const outcome of ["criticalFailure", "failure", "success", "criticalSuccess"] as [
				"criticalFailure",
				"failure",
				"success",
				"criticalSuccess"
			]) {
				if (!synthetic.outcome.includes(outcome)) continue;

				const tempValue = ModifyProgressRuleElement.getNewValue(
					values[outcome],
					synthetic.operation,
					synthetic.change
				);
				if (tempValue === undefined) continue;
				values[outcome] = tempValue;
			}
		}

		return values;
	}
}
