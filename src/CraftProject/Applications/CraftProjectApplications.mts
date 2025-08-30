import { PhysicalItemPF2e } from "../../../types/src/module/item";
import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting, HeroicCraftingProjectHelper } from "../../character.mjs";
import {
	CRAFTING_MATERIAL_SLUG,
	HEROIC_CRAFTING_SPENDING_LIMIT,
	MATERIAL_TROVE_SLUG,
	SALVAGE_MATERIAL_SLUG,
} from "../../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../../Helper/currency.mjs";
import { fractionToPercent } from "../../Helper/generics.mjs";
import { DENOMINATION, SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { MaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import { AProject, Projects } from "../../Projects/projects.mjs";
import { CraftProjectUtility } from "../craftProjectUtility.mjs";
import {
	ProjectCraftDetails,
	ProjectCraftDuration,
	ProjectCraftMaterialSpent,
	TreasureMaterialSpent,
	TreasurePostUseOperation,
} from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type CraftProjectApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	projectId: string;
	callback: (result: ProjectCraftDetails | undefined) => void;
};

type CraftProjectApplicationTeasureRecord = {
	value: Coins;
	quantity: number;
	postUseOperation: TreasurePostUseOperation;
};

export class CraftProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	project: AProject;
	materialTrove?: MaterialTrove;
	result?: ProjectCraftDetails;
	callback: (result?: ProjectCraftDetails) => void;

	formData: {
		craftDuration: ProjectCraftDuration;
		materialList: {
			currency: Coins;
			trove: Coins;
			treasures: Record<string, CraftProjectApplicationTeasureRecord>;
		};
	};
	treasures: PhysicalItemPF2e[];
	private constructor(options: CraftProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.project = getProject(this.actor, options.projectId);
		this.callback = options.callback;

		this.formData = {
			craftDuration: ProjectCraftDuration.DAY,
			materialList: {
				currency: new game.pf2e.Coins(),
				trove: new game.pf2e.Coins(),
				treasures: {},
			},
		};
		this.treasures = [];
	}

	private async initializeTreasureData() {
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor);
		if (!this.materialTrove) return;

		this.treasures = this.materialTrove.contents.filter(
			(troveItem) =>
				!!troveItem.slug &&
				![MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(troveItem.slug)
		);

		this.formData.materialList.treasures = Object.fromEntries(
			this.treasures.map((treasure) => [
				treasure.uuid,
				{
					value: new game.pf2e.Coins(),
					quantity: 0,
					postUseOperation: TreasurePostUseOperation.DECREASE_VALUE,
				},
			])
		);
	}

	private async updateTreasureData() {
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor);
		if (!this.materialTrove) {
			this.treasures = [];
			this.formData.materialList.treasures = {};
			return;
		}

		this.treasures = this.materialTrove.contents.filter(
			(troveItem) =>
				!!troveItem.slug &&
				![MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(troveItem.slug)
		);

		const treasureUuids = new Set(this.treasures.map((x) => x.uuid));
		const treasureFormDataUuids = new Set(Object.keys(this.formData.materialList.treasures));

		const newUuids = treasureUuids.difference(treasureFormDataUuids);
		const deletedUuids = treasureFormDataUuids.difference(treasureUuids);

		for (const uuid of newUuids) {
			this.formData.materialList.treasures[uuid] = {
				value: new game.pf2e.Coins(),
				quantity: 0,
				postUseOperation: TreasurePostUseOperation.DECREASE_VALUE,
			};
		}

		for (const uuid of deletedUuids) {
			delete this.formData.materialList.treasures[uuid];
		}
	}

	static override readonly DEFAULT_OPTIONS = {
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
		"material-summary": {
			template: "modules/pf2e-heroic-crafting/templates/craftProject/material-summary.hbs",
			scrollable: [".material-list"],
		},
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	private static async handler(
		this: CraftProjectApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		const treasureMaterials: TreasureMaterialSpent[] = Object.entries(this.formData.materialList.treasures)
			.filter(([_, record]) => SignedCoinsPF2e.getCopperValue(record.value) > 0 && record.quantity > 0)
			.map(([uuid, record]) => {
				return { uuid, ...record };
			});

		const materialsSpent: ProjectCraftMaterialSpent = {};

		if (SignedCoinsPF2e.getCopperValue(this.formData.materialList.currency) > 0)
			materialsSpent.currency = this.formData.materialList.currency;
		if (SignedCoinsPF2e.getCopperValue(this.formData.materialList.trove) > 0)
			materialsSpent.trove = this.formData.materialList.trove;
		if (treasureMaterials.length > 0) materialsSpent.treasure = treasureMaterials;

		const totalCost = await CraftProjectUtility.getTotalCost(materialsSpent);
		const duration = _formData.object[`duration`] as ProjectCraftDuration;
		const progress = HeroicCraftingProjectHelper.getProjectProgress(
			this.actor,
			{
				criticalSuccess: totalCost.multiply(2),
				success: totalCost.multiply(2),
				failure: totalCost.multiply(0.5),
				criticalFailure: totalCost.negate(),
			},
			new Set([
				...(await this.project.getRollOptions()),
				"action:craft",
				"action:craft-project",
				`heroic:crafting:duration:${duration}`,
			])
		);

		const result: ProjectCraftDetails = {
			projectId: this.project.id,
			materialsSpent: materialsSpent,
			progress: {
				criticalFailure: new SignedCoinsPF2e(progress.criticalFailure),
				failure: new SignedCoinsPF2e(progress.failure),
				success: new SignedCoinsPF2e(progress.success),
				criticalSuccess: new SignedCoinsPF2e(progress.criticalSuccess),
			},
			duration: this.formData.craftDuration,
		};

		this.result = result;
	}

	static async getCraftDetails(
		options: Omit<CraftProjectApplicationOptions, "callback">
	): Promise<ProjectCraftDetails | undefined> {
		return new Promise<ProjectCraftDetails | undefined>((resolve) => {
			const applicationOptions: CraftProjectApplicationOptions = Object.assign(options, { callback: resolve });
			const app = new CraftProjectApplication(applicationOptions);
			app.initializeTreasureData().then(() => app.render(true));
		});
	}

	resetFormData() {
		this.formData.materialList = {
			currency: new game.pf2e.Coins(),
			trove: new game.pf2e.Coins(),
			treasures: Object.fromEntries(
				this.treasures.map((treasure) => [
					treasure.uuid,
					{
						value: new game.pf2e.Coins(),
						quantity: 0,
						postUseOperation: TreasurePostUseOperation.DECREASE_VALUE,
					},
				])
			),
		};
	}

	protected override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & CraftProjectApplicationOptions
	): ApplicationConfiguration {
		const data = super._initializeApplicationOptions(options);
		data.uniqueId = `craft-project-Actor-${options.actor.id}-Project-${options.projectId}`;
		return data;
	}

	override async render(options?: boolean | ApplicationRenderOptions): Promise<this> {
		await this.updateTreasureData();
		return await super.render(options);
	}

	override async _onFirstRender(context: object, options: ApplicationRenderOptions) {
		await super._onFirstRender(context, options);
		this.actor.apps[this.id] = this;
	}

	override async _onRender(context: object, options: ApplicationRenderOptions) {
		await super._onRender(context, options);
		for (const input of this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
			'[data-action="update-input-manual"]'
		)) {
			input.addEventListener(input.type === "checkbox" ? "click" : "change", this.manualUpdateInput.bind(this));
		}
	}

	private async manualUpdateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const totalPath = target.name;
		const pathSegments = totalPath.split(".");

		console.debug(
			"Heroic Crafting | Craft Project Application: Manual Update",
			pathSegments,
			target?.value,
			event.target
		);

		switch (pathSegments[0]) {
			case "duration": {
				this.formData.craftDuration = target.value as ProjectCraftDuration;
				this.resetFormData();
				break;
			}
			case "materialList": {
				await this.updateMaterialList(target.value, pathSegments);
				break;
			}
			default:
				break;
		}

		this.render();
	}

	private async updateMaterialList(value: string, pathSegments: string[]) {
		switch (pathSegments[1]) {
			case "currency":
			case "trove":
				this.updateBasicMaterial(value, pathSegments[1], pathSegments[2] as DENOMINATION);
				break;
			case "treasures":
				await this.updateAdvancedMaterial(value, pathSegments.slice(2));
				break;
			default:
				break;
		}
	}

	private updateBasicMaterial(value: string, basicMaterial: "currency" | "trove", basicMaterialKey: DENOMINATION) {
		this.formData.materialList[basicMaterial][basicMaterialKey] = Number.parseInt(value) || 0;

		const maxSpend = this.getMaxSpend(basicMaterial);
		if (SignedCoinsPF2e.getCopperValue(this.formData.materialList[basicMaterial]) <= maxSpend.copperValue) return;

		this.formData.materialList[basicMaterial] = maxSpend;
	}

	private getMaxSpend(basicMaterial: "currency" | "trove") {
		const spendingLimit = new game.pf2e.Coins(
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[this.formData.craftDuration]
		);
		const scaledSpendingLimit = spendingLimit.scale(this.project.batchSize);

		const preMaterialContribution = SignedCoinsPF2e.subtractCoins(
			this.getTotalMaterialCost(),
			this.formData.materialList[basicMaterial]
		);

		const remainingBudget = SignedCoinsPF2e.subtractCoins(scaledSpendingLimit, preMaterialContribution);

		switch (basicMaterial) {
			case "currency":
				return SignedCoinsPF2e.minCoins(this.actor.inventory.coins, remainingBudget);
			case "trove":
				return SignedCoinsPF2e.minCoins(this.materialTrove?.value ?? {}, remainingBudget);
			default:
				return scaledSpendingLimit;
		}
	}

	private getTotalMaterialCost() {
		return SignedCoinsPF2e.sumCoins(
			this.formData.materialList.trove,
			this.formData.materialList.currency,
			...Object.values(this.formData.materialList.treasures).map((treasure) => treasure.value)
		);
	}

	private async updateAdvancedMaterial(value: string, pathSegments: string[]) {
		const treasureUuid = pathSegments[0];
		const treasureKey = pathSegments[1] as DENOMINATION | "quantity" | "postUseOperation";

		const treasureFromData = this.formData.materialList.treasures[treasureUuid];
		if (!treasureFromData) return;

		switch (treasureKey) {
			case "cp":
			case "sp":
			case "gp":
			case "pp":
				treasureFromData.value[treasureKey] = Number.parseInt(value) || 0;
				break;
			case "quantity":
				treasureFromData.quantity = Number.parseInt(value) || 0;
				break;
			case "postUseOperation":
				treasureFromData.postUseOperation = value as TreasurePostUseOperation;
				return;

			default:
				return;
		}

		const craftDuration = this.formData.craftDuration;
		const spendingLimit = new game.pf2e.Coins(
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[craftDuration]
		);
		const scaledSpendingLimit = spendingLimit.scale(this.project.batchSize);

		const item = (await foundry.utils.fromUuid(treasureUuid)) as PhysicalItemPF2e;
		const treasureCoinsTotal = SignedCoinsPF2e.multiplyCoins(
			treasureFromData.quantity ?? 1,
			treasureFromData.value
		);

		const preTreasureContribution = SignedCoinsPF2e.subtractCoins(this.getTotalMaterialCost(), treasureCoinsTotal);
		const remainingBudget = SignedCoinsPF2e.subtractCoins(scaledSpendingLimit, preTreasureContribution);
		const maxSpendTotal = SignedCoinsPF2e.minCoins(
			item.price.value.scale(treasureFromData.quantity ?? 1),
			remainingBudget
		);

		if (
			treasureCoinsTotal.copperValue <= maxSpendTotal.copperValue &&
			(treasureFromData.quantity ?? 0) <= item.quantity
		)
			return;

		const quantity = Math.min(treasureFromData.quantity ?? 1, item.quantity);
		const finalSpend = CoinsPF2eUtility.minCoins(treasureCoinsTotal, maxSpendTotal);
		const maxSpendPer: Coins = quantity === 0 ? {} : CoinsPF2eUtility.multCoins(1 / quantity, finalSpend);
		treasureFromData.value = maxSpendPer;
		treasureFromData.quantity = quantity;
	}

	private async getProgressBarWidths() {
		const totalMaterialCost = new SignedCoinsPF2e(this.getTotalMaterialCost());
		const projectMax = await this.project.max;
		const projectValue = new SignedCoinsPF2e(this.project.value);

		if (totalMaterialCost.copperValue === 0) {
			return {
				invisible: fractionToPercent(0, 1),
				criticalFailure: fractionToPercent(0, 1),
				failure: fractionToPercent(0, 1),
				success: fractionToPercent(0, 1),
				criticalSuccess: fractionToPercent(0, 1),
				current: fractionToPercent(projectValue.copperValue, projectMax.copperValue),
			};
		}

		const craftDuration = this.formData.craftDuration;

		const progress = HeroicCraftingProjectHelper.getProjectProgress(
			this.actor,
			{
				criticalSuccess: totalMaterialCost.multiply(2),
				success: totalMaterialCost.multiply(2),
				failure: totalMaterialCost.multiply(0.5),
				criticalFailure: totalMaterialCost.negate(),
			},
			new Set([
				...(await this.project.getRollOptions()),
				"action:craft",
				"action:craft-project",
				`heroic:crafting:duration:${craftDuration}`,
			])
		);

		const bands = [
			Math.clamp(projectValue.plus(progress.criticalFailure).copperValue, 0, projectMax.copperValue),
			Math.clamp(projectValue.plus(progress.failure).copperValue, 0, projectMax.copperValue),
			Math.clamp(projectValue.plus(progress.success).copperValue, 0, projectMax.copperValue),
			Math.clamp(projectValue.plus(progress.criticalSuccess).copperValue, 0, projectMax.copperValue),
		];

		{
			let curValIdx = 4;
			for (let i = 0; i < bands.length; i++) {
				if (bands[i] > projectValue.copperValue) {
					curValIdx = i;
					break;
				}
			}
			bands.splice(curValIdx, 0, projectValue.copperValue);
		}

		console.log("Heroic Crafting |", bands, progress);

		return {
			invisible: fractionToPercent(bands[0], projectMax.copperValue),
			criticalFailure: fractionToPercent(bands[1] - bands[0], projectMax.copperValue),
			failure: fractionToPercent(bands[2] - bands[1], projectMax.copperValue),
			success: fractionToPercent(bands[3] - bands[2], projectMax.copperValue),
			criticalSuccess: fractionToPercent(bands[4] - bands[3], projectMax.copperValue),
			current: fractionToPercent(projectValue.copperValue, projectMax.copperValue),
		};
	}

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		this.callback(this.result);
		delete this.actor.apps[this.id];
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const materials: {
			img: string;
			name: string;
			uuid: string;
			quantity: number;
			formData: CraftProjectApplicationTeasureRecord;
		}[] = [];

		this.treasures.forEach((troveItem) =>
			materials.push({
				img: troveItem.img,
				name: troveItem.name,
				uuid: troveItem.uuid,
				quantity: troveItem.quantity,
				formData: this.formData.materialList.treasures[troveItem.uuid],
			})
		);

		const spendingLimitCoins = CoinsPF2eUtility.multCoins(
			this.project.batchSize,
			HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level)?.[this.formData.craftDuration] ?? {}
		);
		const spendingLimit = spendingLimitCoins;
		const totalMaterialCost = this.getTotalMaterialCost();
		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-hammer",
				cssClass: "craft-project-button",
				label: "Craft Project",
				disabled: SignedCoinsPF2e.getCopperValue(totalMaterialCost) === 0,
			},
			{
				type: "button",
				icon: "fa-solid fa-xmark",
				label: "Cancel",
				action: "close",
			},
		];

		return {
			...data,
			id: this.id,
			project: await this.project.getContextData(),
			formData: this.formData,
			buttons,
			materials,
			spendingLimit: spendingLimit,
			hasMaterialTrove: !!this.materialTrove,
			totalMaterial: {
				value: totalMaterialCost,
				max: spendingLimit,
			},
			progressBarWidths: await this.getProgressBarWidths(),
			hideCurrencyMaterials: this.formData.craftDuration === ProjectCraftDuration.HOUR,
		};
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

export function getProject(actor: CharacterPF2eHeroicCrafting, projectId: string): AProject {
	return Projects.getProject(actor, projectId)!;
}
