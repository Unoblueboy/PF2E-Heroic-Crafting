import { ActorSourcePF2e } from "../types/src/module/actor/data";
import { CoinsPF2e } from "../types/src/module/item/physical";
import { TokenDocumentPF2e } from "../types/src/module/scene";
import { RollDataPF2e } from "../types/src/module/system/text-editor";
import { DocumentConstructionContext } from "../types/types/foundry/common/_types.mjs";
import { HEROIC_CRAFTING_GATHERED_INCOME, HEROIC_CRAFTING_SPENDING_LIMIT } from "./Helper/constants.mjs";
import { MaterialTrove } from "./MaterialTrove/materialTrove.mjs";
import { Projects } from "./Projects/projects.mjs";

export class CharacterPF2eHeroicCrafting<
	TParent extends TokenDocumentPF2e | null = TokenDocumentPF2e | null
> extends CONFIG.PF2E.Actor.documentClasses.character<TParent> {
	private _projects?: Projects;
	private materialTrove?: MaterialTrove;
	constructor(data: PreCreate<ActorSourcePF2e>, context: DocumentConstructionContext<TParent> = {}) {
		super(data, context);
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

	get spendingLimit(): { hour: CoinsPF2e; day: CoinsPF2e; week: CoinsPF2e } {
		const spendingLimit = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.level);
		return {
			hour: new game.pf2e.Coins(spendingLimit!.hour),
			day: new game.pf2e.Coins(spendingLimit!.day),
			week: new game.pf2e.Coins(spendingLimit!.week),
		};
	}
}
