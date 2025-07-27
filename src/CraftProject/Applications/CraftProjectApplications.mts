import { ActorPF2e } from "../../../types/src/module/actor";
import { ContainerPF2e, PhysicalItemPF2e } from "../../../types/src/module/item";
import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { ProjectItemDetails } from "../../BeginProject/types.mjs";
import { FORMULA_PRICE, HEROIC_CRAFTING_SPENDING_LIMIT } from "../../Helper/constants.mjs";
import {
	coinsToCoinString,
	coinsToCopperValue,
	copperValueToCoins,
	copperValueToCoinString,
	multCoins,
} from "../../Helper/currency.mjs";
import { fractionToPercent } from "../../Helper/generics.mjs";
import { getCurrentMaterialTroveValue, getMaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import {
	ProjectCraftDetails,
	ProjectCraftDuration,
	TreasureMaterialSpent,
	TreasurePostUseOperation,
} from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type CraftProjectApplicationOptions = {
	actor: ActorPF2e;
	projectId: string;
	callback: (result: ProjectCraftDetails | undefined) => void;
};

export class CraftProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: ActorPF2e;
	projectId: string;
	itemDetails: ProjectItemDetails;
	materialTrove?: PhysicalItemPF2e;
	result?: ProjectCraftDetails;
	callback: (result?: ProjectCraftDetails) => void;

	constructor(options: CraftProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.projectId = options.projectId;
		this.itemDetails = getItemDetails(this.actor, this.projectId);
		this.materialTrove = getMaterialTrove(this.actor, false);
		this.callback = options.callback;
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
			const coins: Coins = CraftProjectApplication.getCoins(_formData, uuid);
			const quantity = Number.parseInt((_formData.object[`${uuid}-quantity`] as string) ?? "") || 0;
			const postUseOperation = _formData.object[`${uuid}-post-use-operation`] as TreasurePostUseOperation;

			if (coinsToCopperValue(coins) == 0 || quantity == 0) continue;

			treasureMaterials.push({
				uuid: uuid,
				value: coins,
				quantity: quantity,
				postUseOperation: postUseOperation,
			});
		}

		const currencyCoins: Coins = CraftProjectApplication.getCoins(_formData, "currency");

		const troveCoins: Coins = CraftProjectApplication.getCoins(_formData, "trove");

		const result: ProjectCraftDetails = {
			projectId: this.projectId,
			materialsSpent: {},
			duration: _formData.object[`duration`] as ProjectCraftDuration,
		};

		if (coinsToCopperValue(currencyCoins) > 0) result.materialsSpent.currency = currencyCoins;
		if (coinsToCopperValue(troveCoins) > 0) result.materialsSpent.generic = troveCoins;
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
		return coins;
	}

	static async getCraftDetails(
		options: Omit<CraftProjectApplicationOptions, "callback">
	): Promise<ProjectCraftDetails | undefined> {
		return new Promise<ProjectCraftDetails | undefined>((resolve) => {
			const applicationOptions: CraftProjectApplicationOptions = Object.assign(options, { callback: resolve });
			const app = new CraftProjectApplication(applicationOptions);
			app.render(true);
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
		const singleCraftMax = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration] ?? 0;
		materialMaxSpan.textContent = copperValueToCoinString(singleCraftMax * this.itemDetails.batchSize);
		materialValueSpan.textContent = "0 gp";
		CraftProjectApplication.resetElements(materialSummaryDiv);
		CraftProjectApplication.updateCurrencyMaterials(materialSummaryDiv, craftDuration == ProjectCraftDuration.HOUR);
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
		materialValueSpan.textContent = copperValueToCoinString(newCurCostsTotal);

		await CraftProjectApplication.UpdateProgressBar(this.element, this.itemDetails, newCurCostsTotal);

		const craftProjectButton = this.element.querySelector<HTMLButtonElement>(
			".footer-button-panel .craft-project-button"
		);
		if (craftProjectButton) {
			craftProjectButton.disabled = newCurCosts.total == 0;
		}
	}

	private static async UpdateProgressBar(
		baseElement: HTMLElement,
		itemDetails: ProjectItemDetails,
		materialCost?: number
	) {
		const projectMax = await getProjectMax(itemDetails);
		const projectMaxCopper = coinsToCopperValue(projectMax);
		const projectValue = itemDetails.value;
		const projectValueCopper = coinsToCopperValue(projectValue);
		materialCost ??= 0;

		const bands = [
			Math.clamp(projectValueCopper - materialCost, 0, projectMaxCopper),
			Math.clamp(projectValueCopper, 0, projectMaxCopper),
			Math.clamp(projectValueCopper + Math.floor(materialCost / 2), 0, projectMaxCopper),
			Math.clamp(projectValueCopper + 2 * materialCost, 0, projectMaxCopper),
		];

		const progressBar = baseElement.querySelector<HTMLDivElement>(".project-summary .progress-bar");
		const invisibleBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.invisible-bar");
		if (invisibleBar) {
			invisibleBar.style = `width:${fractionToPercent(bands[0], projectMaxCopper)}`;
		}
		const criticalFailureBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.criticalFailure-bar");
		if (criticalFailureBar) {
			criticalFailureBar.style = `width:${fractionToPercent(bands[1] - bands[0], projectMaxCopper)}`;
		}
		const failureBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.failure-bar");
		if (failureBar) {
			failureBar.style = `width:${fractionToPercent(bands[2] - bands[1], projectMaxCopper)}`;
		}
		const successBar = progressBar?.querySelector<HTMLDivElement>(".internal-bar.success-bar");
		if (successBar) {
			successBar.style = `width:${fractionToPercent(bands[3] - bands[2], projectMaxCopper)}`;
		}
	}

	private static async EnforceMax(
		this: CraftProjectApplication,
		curValues: { perItem: Record<string, Coins & { quantity?: number }>; total: number },
		inputs: NodeListOf<HTMLInputElement>,
		materialData: Record<string, string | undefined>
	) {
		const isBasic = materialData.type == "basic";

		if (isBasic) {
			CraftProjectApplication.EnforceBasicMax.bind(this)(curValues, inputs, materialData);
		} else {
			CraftProjectApplication.EnforceAdvancedMax.bind(this)(curValues, inputs, materialData);
		}
	}

	private static async EnforceBasicMax(
		this: CraftProjectApplication,
		curValues: { perItem: Record<string, Coins & { quantity?: number }>; total: number },
		inputs: NodeListOf<HTMLInputElement>,
		materialData: Record<string, string | undefined>
	) {
		const craftDurationSelect = this.element.querySelector<HTMLSelectElement>(
			".material-summary .duration-select select"
		);
		if (!craftDurationSelect) return;

		const craftDuration = craftDurationSelect.value as ProjectCraftDuration;
		const singleSpendingLimit = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration] ?? 0;
		const spendingLimit = singleSpendingLimit * this.itemDetails.batchSize;
		const key = materialData.item;
		const moneyGroupData = curValues.perItem[key ?? ""];
		const moneyGroupCopper = coinsToCopperValue(moneyGroupData);

		const preMaterialContribution = curValues.total - moneyGroupCopper;
		const remainingBudgetCopper = spendingLimit - preMaterialContribution;
		let maxSpendCopper = 0;
		switch (materialData.item) {
			case "currency":
				maxSpendCopper = Math.min(this.actor.inventory.coins.copperValue, remainingBudgetCopper);
				break;
			case "trove":
				maxSpendCopper = Math.min(await getCurrentMaterialTroveValue(this.actor), remainingBudgetCopper);
				break;
			default:
				maxSpendCopper = spendingLimit;
				break;
		}
		if (moneyGroupCopper <= maxSpendCopper) return;

		const maxSpend = copperValueToCoins(maxSpendCopper);
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
		curValues: { perItem: Record<string, Coins & { quantity?: number }>; total: number },
		inputs: NodeListOf<HTMLInputElement>,
		materialData: Record<string, string | undefined>
	) {
		const craftDurationSelect = this.element.querySelector<HTMLSelectElement>(
			".material-summary .duration-select select"
		);
		if (!craftDurationSelect) return;

		const craftDuration = craftDurationSelect.value as ProjectCraftDuration;
		const singleSpendingLimit = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration] ?? 0;
		const spendingLimit = singleSpendingLimit * this.itemDetails.batchSize;
		const uuid = materialData.uuid;
		if (!uuid) return;

		const item = (await foundry.utils.fromUuid(uuid)) as PhysicalItemPF2e;
		const moneyGroupData = curValues.perItem[uuid ?? ""];
		const moneyGroupCopper = coinsToCopperValue(moneyGroupData) * (moneyGroupData.quantity ?? 1);

		const preMaterialContribution = curValues.total - moneyGroupCopper;
		const remainingBudgetCopper = spendingLimit - preMaterialContribution;
		const maxSpendCopper = Math.min(
			item.price.value.copperValue * (moneyGroupData.quantity ?? 1),
			remainingBudgetCopper
		);

		if (moneyGroupCopper <= maxSpendCopper && (moneyGroupData.quantity ?? 0) <= item.quantity) return;

		const quantity = Math.min(moneyGroupData.quantity ?? 1, item.quantity);
		const finalSpendCopper = Math.min(moneyGroupCopper, maxSpendCopper);
		const maxSpend = quantity == 0 ? {} : copperValueToCoins(Math.floor(finalSpendCopper / quantity));
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

		let total = 0;
		for (const data of Object.values(itemData)) {
			total += coinsToCopperValue(data) * (data.quantity ?? 1);
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

		const projectCur = this.itemDetails.value;
		const projectMax = await getProjectMax(this.itemDetails);
		const project = {
			cur: coinsToCoinString(projectCur),
			max: coinsToCoinString(projectMax),
			percent: fractionToPercent(coinsToCopperValue(projectCur), coinsToCopperValue(projectMax)),
		};

		const materials: {
			img: string;
			name: string;
			uuid: string;
			quantity: number;
		}[] = [];
		if (this.materialTrove) {
			(this.materialTrove as ContainerPF2e).contents
				.filter(
					(troveItem) =>
						!!troveItem.slug &&
						!["material-trove", "generic-crafting-material", "generic-salvage-material"].includes(
							troveItem.slug
						)
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

		const spendingLimitCopperValue =
			(HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.day ?? 0) * this.itemDetails.batchSize;
		const spendingLimit = copperValueToCoins(spendingLimitCopperValue);
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
			spendingLimit: coinsToCoinString(spendingLimit),
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

export function getItemDetails(actor: ActorPF2e, projectId: string) {
	const projects = actor.flags["pf2eHeroicCrafting"].projects as Record<string, ProjectItemDetails>;
	const itemDetails = projects[projectId];
	return itemDetails;
}

export async function getProjectMax(itemDetails: ProjectItemDetails, item?: PhysicalItemPF2e): Promise<Coins> {
	item ??= (await foundry.utils.fromUuid(itemDetails.itemData.uuid)) as PhysicalItemPF2e;
	return itemDetails.itemData.isFormula
		? copperValueToCoins(FORMULA_PRICE.get(item.level) ?? 0)
		: multCoins(itemDetails.batchSize, item.price.value);
}
