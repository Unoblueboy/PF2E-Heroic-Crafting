import { CharacterPF2e } from "../../../types/src/module/actor";
import { PhysicalItemPF2e } from "../../../types/src/module/item";
import { Coins, CoinsPF2e } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { ProjectItemDetails } from "../../BeginProject/types.mjs";
import {
	CRAFTING_MATERIAL_SLUG,
	FORMULA_PRICE,
	HEROIC_CRAFTING_SPENDING_LIMIT,
	MATERIAL_TROVE_SLUG,
	MODULE_ID,
	SALVAGE_MATERIAL_SLUG,
} from "../../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../../Helper/currency.mjs";
import { fractionToPercent } from "../../Helper/generics.mjs";
import { MaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import {
	ProjectCraftDetails,
	ProjectCraftDuration,
	TreasureMaterialSpent,
	TreasurePostUseOperation,
} from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type CraftProjectApplicationOptions = {
	actor: CharacterPF2e;
	projectId: string;
	callback: (result: ProjectCraftDetails | undefined) => void;
};

// TODO: refactor to update on actor update
export class CraftProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2e;
	projectId: string;
	itemDetails: ProjectItemDetails;
	materialTrove?: MaterialTrove;
	result?: ProjectCraftDetails;
	callback: (result?: ProjectCraftDetails) => void;

	private constructor(options: CraftProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.projectId = options.projectId;
		this.itemDetails = getItemDetails(this.actor, this.projectId);
		this.callback = options.callback;
	}

	private async initializeData() {
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor);
	}

	static override readonly DEFAULT_OPTIONS = {
		id: "craft-project",
		classes: ["craft-project-dialog"],
		position: { width: 400, height: 485 },
		tag: "form",
		window: {
			title: "Craft a Project",
			icon: "fa-solid fa-hammer",
			resizable: true,
		},
		form: {
			handler: CraftProjectApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	static override readonly PARTS = {
		"item-summary": { template: "modules/pf2e-heroic-crafting/templates/craftProject/item-summary.hbs" },
		"project-summary": { template: "modules/pf2e-heroic-crafting/templates/craftProject/project-summary.hbs" },
		"material-summary": { template: "modules/pf2e-heroic-crafting/templates/craftProject/material-summary.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	private static async handler(
		this: CraftProjectApplication,
		_event: Event,
		form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		const treasureUuids: string[] = [];
		form.querySelectorAll<HTMLDivElement>(
			".material-summary .treasure-material [data-type='advanced'].money-group"
		).forEach((x) => treasureUuids.push(x.dataset.uuid ?? ""));

		const treasureMaterials: TreasureMaterialSpent[] = [];
		for (const uuid of treasureUuids) {
			const coins: CoinsPF2e = CraftProjectApplication.getCoins(_formData, uuid);
			const quantity = Number.parseInt((_formData.object[`${uuid}-quantity`] as string) ?? "") || 0;
			const postUseOperation = _formData.object[`${uuid}-post-use-operation`] as TreasurePostUseOperation;

			if (coins.copperValue === 0 || quantity === 0) continue;

			treasureMaterials.push({
				uuid: uuid,
				value: coins,
				quantity: quantity,
				postUseOperation: postUseOperation,
			});
		}

		const currencyCoins: CoinsPF2e = CraftProjectApplication.getCoins(_formData, "currency");

		const troveCoins: CoinsPF2e = CraftProjectApplication.getCoins(_formData, "trove");

		const result: ProjectCraftDetails = {
			projectId: this.projectId,
			materialsSpent: {},
			duration: _formData.object[`duration`] as ProjectCraftDuration,
		};

		if (currencyCoins.copperValue > 0) result.materialsSpent.currency = currencyCoins;
		if (troveCoins.copperValue > 0) result.materialsSpent.generic = troveCoins;
		if (treasureMaterials.length > 0) result.materialsSpent.treasure = treasureMaterials;

		this.result = result;
	}

	private static getCoins(_formData: FormDataExtended, prefix: string) {
		const coins: Coins = {};
		if (_formData.object[`${prefix}-pp`]) {
			coins.pp = Number.parseInt((_formData.object[`${prefix}-pp`] as string) ?? "") || 0;
		}
		if (_formData.object[`${prefix}-gp`]) {
			coins.gp = Number.parseInt((_formData.object[`${prefix}-gp`] as string) ?? "") || 0;
		}
		if (_formData.object[`${prefix}-sp`]) {
			coins.sp = Number.parseInt((_formData.object[`${prefix}-sp`] as string) ?? "") || 0;
		}
		if (_formData.object[`${prefix}-cp`]) {
			coins.cp = Number.parseInt((_formData.object[`${prefix}-cp`] as string) ?? "") || 0;
		}
		return new game.pf2e.Coins(coins);
	}

	static async getCraftDetails(
		options: Omit<CraftProjectApplicationOptions, "callback">
	): Promise<ProjectCraftDetails | undefined> {
		return new Promise<ProjectCraftDetails | undefined>((resolve) => {
			const applicationOptions: CraftProjectApplicationOptions = Object.assign(options, { callback: resolve });
			const app = new CraftProjectApplication(applicationOptions);
			app.initializeData().then(() => app.render(true));
		});
	}

	static async updateCraftDuration(this: CraftProjectApplication, _event: Event) {
		const materialSummaryDiv = this.element.querySelector<HTMLDivElement>(".material-summary");
		if (!materialSummaryDiv) return;
		const materialMaxSpan = materialSummaryDiv.querySelector<HTMLSpanElement>(".total-material span.material-max");
		if (!materialMaxSpan) return;
		const materialValueSpan = materialSummaryDiv.querySelector<HTMLSpanElement>(
			".total-material span.material-value"
		);
		if (!materialValueSpan) return;

		const craftDurationSelect = _event.currentTarget as HTMLSelectElement;
		const craftDuration = craftDurationSelect.value as ProjectCraftDuration;
		const singleCraftMax =
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration] ?? new game.pf2e.Coins();
		materialMaxSpan.textContent = CoinsPF2eUtility.multCoins(this.itemDetails.batchSize, singleCraftMax).toString();
		materialValueSpan.textContent = new game.pf2e.Coins().toString();
		CraftProjectApplication.resetElements(materialSummaryDiv);
		CraftProjectApplication.updateCurrencyMaterials(
			materialSummaryDiv,
			craftDuration === ProjectCraftDuration.HOUR
		);
		await CraftProjectApplication.UpdateProgressBar(this.element, this.itemDetails);
		const craftProjectButton = this.element.querySelector<HTMLButtonElement>(
			".footer-button-panel .craft-project-button"
		);
		if (craftProjectButton) {
			craftProjectButton.disabled = true;
		}
	}

	static resetElements(materialSummaryDiv: HTMLDivElement) {
		for (const input of materialSummaryDiv.querySelectorAll<HTMLInputElement>(".money-group input")) {
			input.value = input.min;
		}
		for (const select of materialSummaryDiv.querySelectorAll<HTMLSelectElement>(
			".post-use-operation-select select"
		)) {
			select.value = TreasurePostUseOperation.DECREASE_VALUE;
		}
	}

	static async updateMoneyGroup(this: CraftProjectApplication, event: Event) {
		const materialSummaryDiv = this.element.querySelector<HTMLDivElement>(".material-summary");
		if (!materialSummaryDiv) return;
		const curCosts = CraftProjectApplication.GetCurCosts(materialSummaryDiv);

		const currentTargetDiv = event.currentTarget as HTMLElement;
		const inputs = currentTargetDiv.querySelectorAll("input");

		const materialData = currentTargetDiv.dataset;
		await CraftProjectApplication.EnforceMax.bind(this)(curCosts, inputs, materialData);

		const newCurCosts = CraftProjectApplication.GetCurCosts(materialSummaryDiv);
		const materialValueSpan = materialSummaryDiv.querySelector<HTMLSpanElement>(
			".total-material span.material-value"
		);
		if (!materialValueSpan) return;

		const newCurCostsTotal = newCurCosts.total;
		materialValueSpan.textContent = newCurCostsTotal.toString();

		await CraftProjectApplication.UpdateProgressBar(this.element, this.itemDetails, newCurCostsTotal);

		const craftProjectButton = this.element.querySelector<HTMLButtonElement>(
			".footer-button-panel .craft-project-button"
		);
		if (craftProjectButton) {
			craftProjectButton.disabled = newCurCosts.total.copperValue === 0;
		}
	}

	private static async UpdateProgressBar(
		baseElement: HTMLElement,
		itemDetails: ProjectItemDetails,
		materialCost?: CoinsPF2e
	) {
		const projectMax = await getProjectMax(itemDetails);
		const projectValue = new game.pf2e.Coins(itemDetails.value);
		materialCost ??= new game.pf2e.Coins();

		const bands = [
			Math.clamp(projectValue.copperValue - materialCost.copperValue, 0, projectMax.copperValue),
			Math.clamp(projectValue.copperValue, 0, projectMax.copperValue),
			Math.clamp(projectValue.copperValue + Math.floor(materialCost.copperValue / 2), 0, projectMax.copperValue),
			Math.clamp(projectValue.copperValue + 2 * materialCost.copperValue, 0, projectMax.copperValue),
		];

		const progressBar = baseElement.querySelector<HTMLDivElement>(".project-summary .progress-bar");
		const invisibleBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.invisible-bar");
		if (invisibleBar) {
			invisibleBar.style = `width:${fractionToPercent(bands[0], projectMax.copperValue)}`;
		}
		const criticalFailureBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.criticalFailure-bar");
		if (criticalFailureBar) {
			criticalFailureBar.style = `width:${fractionToPercent(bands[1] - bands[0], projectMax.copperValue)}`;
		}
		const failureBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.failure-bar");
		if (failureBar) {
			failureBar.style = `width:${fractionToPercent(bands[2] - bands[1], projectMax.copperValue)}`;
		}
		const successBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.success-bar");
		if (successBar) {
			successBar.style = `width:${fractionToPercent(bands[3] - bands[2], projectMax.copperValue)}`;
		}
	}

	private static async EnforceMax(
		this: CraftProjectApplication,
		curValues: { perItem: Record<string, Coins & { quantity?: number }>; total: CoinsPF2e },
		inputs: NodeListOf<HTMLInputElement>,
		materialData: Record<string, string | undefined>
	) {
		const isBasic = materialData.type === "basic";

		if (isBasic) {
			CraftProjectApplication.EnforceBasicMax.bind(this)(curValues, inputs, materialData);
		} else {
			CraftProjectApplication.EnforceAdvancedMax.bind(this)(curValues, inputs, materialData);
		}
	}

	private static async EnforceBasicMax(
		this: CraftProjectApplication,
		curValues: { perItem: Record<string, Coins & { quantity?: number }>; total: CoinsPF2e },
		inputs: NodeListOf<HTMLInputElement>,
		materialData: Record<string, string | undefined>
	) {
		const craftDurationSelect = this.element.querySelector<HTMLSelectElement>(
			".material-summary .duration-select select"
		);
		if (!craftDurationSelect) return;

		const craftDuration = craftDurationSelect.value as ProjectCraftDuration;
		const singleSpendingLimit = new game.pf2e.Coins(
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration]
		);
		const spendingLimit = singleSpendingLimit.scale(this.itemDetails.batchSize);
		const moneyGroupCoins = new game.pf2e.Coins(curValues.perItem[materialData.item ?? ""]);

		const preMaterialContribution = CoinsPF2eUtility.subCoins(curValues.total, moneyGroupCoins);
		const remainingBudget = CoinsPF2eUtility.subCoins(spendingLimit, preMaterialContribution);
		let maxSpend;
		switch (materialData.item) {
			case "currency":
				maxSpend = CoinsPF2eUtility.minCoins(this.actor.inventory.coins, remainingBudget);
				break;
			case "trove":
				maxSpend = CoinsPF2eUtility.minCoins(
					this.materialTrove?.value ?? new game.pf2e.Coins(),
					remainingBudget
				);
				break;
			default:
				maxSpend = spendingLimit;
				break;
		}
		if (moneyGroupCoins.copperValue <= maxSpend.copperValue) return;

		for (const input of inputs) {
			const name = input.name.toLowerCase();
			if (name.endsWith("pp")) {
				input.value = `${maxSpend.pp ?? 0}`;
			} else if (name.endsWith("gp")) {
				input.value = `${maxSpend.gp ?? 0}`;
			} else if (name.endsWith("sp")) {
				input.value = `${maxSpend.sp ?? 0}`;
			} else if (name.endsWith("cp")) {
				input.value = `${maxSpend.cp ?? 0}`;
			}
		}
	}

	private static async EnforceAdvancedMax(
		this: CraftProjectApplication,
		curValues: { perItem: Record<string, Coins & { quantity?: number }>; total: CoinsPF2e },
		inputs: NodeListOf<HTMLInputElement>,
		materialData: Record<string, string | undefined>
	) {
		const craftDurationSelect = this.element.querySelector<HTMLSelectElement>(
			".material-summary .duration-select select"
		);
		if (!craftDurationSelect) return;

		const craftDuration = craftDurationSelect.value as ProjectCraftDuration;
		const singleSpendingLimit = new game.pf2e.Coins(
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration]
		);
		const spendingLimit = singleSpendingLimit.scale(this.itemDetails.batchSize);
		const uuid = materialData.uuid;
		if (!uuid) return;

		const item = (await foundry.utils.fromUuid(uuid)) as PhysicalItemPF2e;
		const moneyGroupData = curValues.perItem[uuid ?? ""];
		const moneyGroupCoins = CoinsPF2eUtility.multCoins(moneyGroupData.quantity ?? 1, moneyGroupData);

		const preMaterialContribution = CoinsPF2eUtility.subCoins(curValues.total, moneyGroupCoins);
		const remainingBudget = CoinsPF2eUtility.subCoins(spendingLimit, preMaterialContribution);
		const maxSpendTotal = CoinsPF2eUtility.minCoins(
			item.price.value.scale(moneyGroupData.quantity ?? 1),
			remainingBudget
		);

		if (moneyGroupCoins.copperValue <= maxSpendTotal.copperValue && (moneyGroupData.quantity ?? 0) <= item.quantity)
			return;

		const quantity = Math.min(moneyGroupData.quantity ?? 1, item.quantity);
		const finalSpend = CoinsPF2eUtility.minCoins(moneyGroupCoins, maxSpendTotal);
		const maxSpendPer: Coins = quantity === 0 ? {} : CoinsPF2eUtility.multCoins(1 / quantity, finalSpend);
		for (const input of inputs) {
			const name = input.name.toLowerCase();
			if (name.endsWith("pp")) {
				input.value = `${maxSpendPer.pp ?? 0}`;
			} else if (name.endsWith("gp")) {
				input.value = `${maxSpendPer.gp ?? 0}`;
			} else if (name.endsWith("sp")) {
				input.value = `${maxSpendPer.sp ?? 0}`;
			} else if (name.endsWith("cp")) {
				input.value = `${maxSpendPer.cp ?? 0}`;
			} else if (name.endsWith("quantity")) {
				input.value = `${quantity}`;
			}
		}
	}

	static GetCurCosts(materialSummaryDiv: HTMLDivElement) {
		const itemData: Record<string, Coins & { quantity?: number }> = {};
		for (const input of materialSummaryDiv.querySelectorAll<HTMLInputElement>(".money-group input")) {
			const path = input.name.split("-");
			const id = path[0];
			if (!itemData[id]) itemData[id] = {};
			const key = path[1].toLowerCase();
			switch (key) {
				case "pp":
					itemData[id].pp = Number.parseInt(input.value) || 0;
					break;
				case "gp":
					itemData[id].gp = Number.parseInt(input.value) || 0;
					break;
				case "sp":
					itemData[id].sp = Number.parseInt(input.value) || 0;
					break;
				case "cp":
					itemData[id].cp = Number.parseInt(input.value) || 0;
					break;
				default:
					itemData[id].quantity = Number.parseInt(input.value) || 0;
					break;
			}
		}

		let total = new game.pf2e.Coins();
		for (const data of Object.values(itemData)) {
			const coinData = new game.pf2e.Coins(data);
			total = total.plus(coinData.scale(data.quantity ?? 1));
		}

		return {
			perItem: itemData,
			total,
		};
	}

	static updateCurrencyMaterials(materialSummaryDiv: HTMLDivElement, hideDiv: boolean) {
		const basicCurrencyDiv = materialSummaryDiv.querySelector<HTMLDivElement>(".basic-material.currency");
		if (!basicCurrencyDiv) return;
		if (hideDiv) {
			basicCurrencyDiv.classList.add("hide");
		} else {
			basicCurrencyDiv.classList.remove("hide");
		}
	}

	override async _onRender(_context: object, _options: ApplicationRenderOptions) {
		for (const input of this.element.querySelectorAll('[data-action="update-craft-duration"]')) {
			input.addEventListener("change", CraftProjectApplication.updateCraftDuration.bind(this));
		}

		for (const input of this.element.querySelectorAll('[data-action="update-money-group"]')) {
			input.addEventListener("change", CraftProjectApplication.updateMoneyGroup.bind(this));
		}
		//update-money-group
	}

	protected override _onClose(_options: ApplicationClosingOptions): void {
		this.callback(this.result);
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);
		const item = (await foundry.utils.fromUuid(this.itemDetails.itemData.uuid)) as PhysicalItemPF2e;

		const projectCur = new game.pf2e.Coins(this.itemDetails.value);
		const projectMax = await getProjectMax(this.itemDetails);
		const project = {
			cur: projectCur,
			max: projectMax,
			percent: fractionToPercent(projectCur.copperValue, projectMax.copperValue),
		};

		const materials: {
			img: string;
			name: string;
			uuid: string;
			quantity: number;
		}[] = [];
		if (this.materialTrove) {
			this.materialTrove.contents
				.filter(
					(troveItem) =>
						!!troveItem.slug &&
						![MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(troveItem.slug)
				)
				.forEach((troveItem) =>
					materials.push({
						img: troveItem.img,
						name: troveItem.name,
						uuid: troveItem.uuid,
						quantity: troveItem.quantity,
					})
				);
		}

		const spendingLimitCoins = CoinsPF2eUtility.multCoins(
			this.itemDetails.batchSize,
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.day ?? new game.pf2e.Coins()
		);
		const spendingLimit = spendingLimitCoins;
		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-hammer",
				cssClass: "craft-project-button",
				label: "Craft Project",
				disabled: true,
			},
			{
				type: "button",
				icon: "fa-solid fa-xmark",
				label: "Cancel",
				action: "close",
			},
		];
		return foundry.utils.mergeObject(data, {
			item: {
				name: item.name,
				level: item.level,
				img: item.img,
				quantity: this.itemDetails.batchSize,
			},
			buttons,
			project,
			materials,
			spendingLimit: spendingLimit,
			hasMaterialTrove: !!this.materialTrove,
		});
	}

	override async _preparePartContext(
		partId: string,
		context: Record<string, unknown>,
		options: HandlebarsRenderOptions
	) {
		super._preparePartContext(partId, context, options);
		context.partId = `${this.id}-${partId}`;
		return context;
	}
}

export function getItemDetails(actor: CharacterPF2e, projectId: string) {
	const projects = actor.flags[MODULE_ID].projects as Record<string, ProjectItemDetails>;
	const itemDetails = projects[projectId];
	return itemDetails;
}

export async function getProjectMax(itemDetails: ProjectItemDetails, item?: PhysicalItemPF2e): Promise<CoinsPF2e> {
	item ??= (await foundry.utils.fromUuid(itemDetails.itemData.uuid)) as PhysicalItemPF2e;
	return itemDetails.itemData.isFormula
		? new game.pf2e.Coins(FORMULA_PRICE.get(item.level))
		: CoinsPF2eUtility.multCoins(itemDetails.batchSize, item.price.value);
}
