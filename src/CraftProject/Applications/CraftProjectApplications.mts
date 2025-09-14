import { PhysicalItemPF2e } from "../../../types/src/module/item";
import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { CRAFTING_MATERIAL_SLUG, MATERIAL_TROVE_SLUG, SALVAGE_MATERIAL_SLUG } from "../../Helper/constants.mjs";
import { DENOMINATION } from "../../Helper/currencyTypes.mjs";
import { UnsignedCoins } from "../../Helper/currencyTypes.mjs";
import { fractionToPercent } from "../../Helper/generics.mjs";
import { SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import { AProject, Projects } from "../../Projects/projects.mjs";
import { ModifyConstantRuleElementHelper } from "../../RuleElement/Helpers/ModifyConstantHelper.mjs";
import { ModifyProgressRuleElementHelper } from "../../RuleElement/Helpers/ModifyProgressHelper.mjs";
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
	value: UnsignedCoins;
	quantity: number;
	postUseOperation: TreasurePostUseOperation;
};

export class CraftProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	private readonly actor: CharacterPF2eHeroicCrafting;
	private readonly project: AProject;
	private materialTrove?: MaterialTrove;
	private result?: ProjectCraftDetails;
	private readonly callback: (result?: ProjectCraftDetails) => void;

	private readonly formData: {
		craftDuration: ProjectCraftDuration;
		materialList: {
			currency: UnsignedCoins;
			trove: UnsignedCoins;
			materials: Record<string, CraftProjectApplicationTeasureRecord>;
		};
	};
	private materials: PhysicalItemPF2e[];
	private constructor(options: CraftProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.project = getProject(this.actor, options.projectId);
		this.callback = options.callback;

		this.formData = {
			craftDuration: ProjectCraftDuration.DAY,
			materialList: {
				currency: new UnsignedCoinsPF2e(),
				trove: new UnsignedCoinsPF2e(),
				materials: {},
			},
		};
		this.materials = [];
	}

	private async initializeTreasureData() {
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor);
		if (!this.materialTrove) return;

		this.materials = this.materialTrove.contents.filter(
			(troveItem) =>
				!!troveItem.slug &&
				![MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(troveItem.slug)
		);

		this.formData.materialList.materials = Object.fromEntries(
			this.materials.map((treasure) => [
				treasure.uuid,
				{
					value: new UnsignedCoinsPF2e(),
					quantity: 0,
					postUseOperation: TreasurePostUseOperation.DECREASE_VALUE,
				},
			])
		);
	}

	private async updateTreasureData() {
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor);
		if (!this.materialTrove) {
			this.materials = [];
			this.formData.materialList.materials = {};
			return;
		}

		this.materials = this.materialTrove.contents.filter(
			(troveItem) =>
				!!troveItem.slug &&
				![MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(troveItem.slug)
		);

		const treasureUuids = new Set(this.materials.map((x) => x.uuid));
		const treasureFormDataUuids = new Set(Object.keys(this.formData.materialList.materials));

		const newUuids = treasureUuids.difference(treasureFormDataUuids);
		const deletedUuids = treasureFormDataUuids.difference(treasureUuids);

		for (const uuid of newUuids) {
			this.formData.materialList.materials[uuid] = {
				value: new UnsignedCoinsPF2e(),
				quantity: 0,
				postUseOperation: TreasurePostUseOperation.DECREASE_VALUE,
			};
		}

		for (const uuid of deletedUuids) {
			delete this.formData.materialList.materials[uuid];
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
		const treasureMaterials: TreasureMaterialSpent[] = Object.entries(this.formData.materialList.materials)
			.filter(([_, record]) => UnsignedCoinsPF2e.getCopperValue(record.value) > 0 && record.quantity > 0)
			.map(([uuid, record]) => {
				return { uuid, ...record };
			});

		const materialsSpent: ProjectCraftMaterialSpent = {};

		if (UnsignedCoinsPF2e.getCopperValue(this.formData.materialList.currency) > 0)
			materialsSpent.currency = this.formData.materialList.currency;
		if (UnsignedCoinsPF2e.getCopperValue(this.formData.materialList.trove) > 0)
			materialsSpent.trove = this.formData.materialList.trove;
		if (treasureMaterials.length > 0) materialsSpent.treasure = treasureMaterials;

		const totalCost = await CraftProjectUtility.getTotalCost(materialsSpent);
		const duration = _formData.object[`duration`] as ProjectCraftDuration;
		const progress = ModifyProgressRuleElementHelper.getProgress(
			this.actor,
			{
				criticalSuccess: SignedCoinsPF2e.multiplyCoins(2, totalCost),
				success: SignedCoinsPF2e.multiplyCoins(2, totalCost),
				failure: SignedCoinsPF2e.multiplyCoins(0.5, totalCost),
				criticalFailure: SignedCoinsPF2e.negate(totalCost),
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
			currency: new UnsignedCoinsPF2e(),
			trove: new UnsignedCoinsPF2e(),
			materials: Object.fromEntries(
				this.materials.map((treasure) => [
					treasure.uuid,
					{
						value: new UnsignedCoinsPF2e(),
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
				await this.updateBasicMaterial(value, pathSegments[1], pathSegments[2] as DENOMINATION);
				break;
			case "treasures":
				await this.updateAdvancedMaterial(value, pathSegments.slice(2));
				break;
			default:
				break;
		}
	}

	private async updateBasicMaterial(
		value: string,
		basicMaterial: "currency" | "trove",
		basicMaterialKey: DENOMINATION
	) {
		this.formData.materialList[basicMaterial][basicMaterialKey] = Number.parseInt(value) || 0;

		const maxSpend = await this.getMaxSpend(basicMaterial);
		if (UnsignedCoinsPF2e.getCopperValue(this.formData.materialList[basicMaterial]) <= maxSpend.copperValue) return;

		this.formData.materialList[basicMaterial] = maxSpend;
	}

	private async getMaxSpend(basicMaterial: "currency" | "trove"): Promise<UnsignedCoinsPF2e> {
		const spendingLimit = ModifyConstantRuleElementHelper.getConstant(
			this.actor,
			"spendingLimit",
			{ duration: this.formData.craftDuration },
			await this.project.getRollOptions()
		);
		const scaledSpendingLimit = UnsignedCoinsPF2e.multiplyCoins(this.project.batchSize, spendingLimit);

		const preMaterialContribution = UnsignedCoinsPF2e.subtractCoins(
			this.getTotalMaterialCost(),
			this.formData.materialList[basicMaterial]
		);

		const remainingBudget = UnsignedCoinsPF2e.subtractCoins(scaledSpendingLimit, preMaterialContribution);

		switch (basicMaterial) {
			case "currency":
				return UnsignedCoinsPF2e.minCoins(this.actor.inventory.coins, remainingBudget);
			case "trove":
				return UnsignedCoinsPF2e.minCoins(this.materialTrove?.value ?? {}, remainingBudget);
			default:
				return scaledSpendingLimit;
		}
	}

	private getTotalMaterialCost(): UnsignedCoinsPF2e {
		return UnsignedCoinsPF2e.sumCoins(
			this.formData.materialList.trove,
			this.formData.materialList.currency,
			...Object.values(this.formData.materialList.materials).map((treasure) => treasure.value)
		);
	}

	private async updateAdvancedMaterial(value: string, pathSegments: string[]) {
		const treasureUuid = pathSegments[0];
		const treasureKey = pathSegments[1] as DENOMINATION | "quantity" | "postUseOperation";

		const treasureFromData = this.formData.materialList.materials[treasureUuid];
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

		const spendingLimit = ModifyConstantRuleElementHelper.getConstant(
			this.actor,
			"spendingLimit",
			{ duration: this.formData.craftDuration },
			await this.project.getRollOptions()
		);
		const scaledSpendingLimit = UnsignedCoinsPF2e.multiplyCoins(this.project.batchSize, spendingLimit);

		const item = (await foundry.utils.fromUuid(treasureUuid)) as PhysicalItemPF2e;
		const treasureCoinsTotal = UnsignedCoinsPF2e.multiplyCoins(
			treasureFromData.quantity ?? 1,
			treasureFromData.value
		);

		const preTreasureContribution = UnsignedCoinsPF2e.subtractCoins(
			this.getTotalMaterialCost(),
			treasureCoinsTotal
		);
		const remainingBudget = UnsignedCoinsPF2e.subtractCoins(scaledSpendingLimit, preTreasureContribution);
		const maxSpendTotal = UnsignedCoinsPF2e.minCoins(
			item.price.value.scale(treasureFromData.quantity ?? 1),
			remainingBudget
		);

		if (
			treasureCoinsTotal.copperValue <= maxSpendTotal.copperValue &&
			(treasureFromData.quantity ?? 0) <= item.quantity
		)
			return;

		const quantity = Math.min(treasureFromData.quantity ?? 1, item.quantity);
		const finalSpend = UnsignedCoinsPF2e.minCoins(treasureCoinsTotal, maxSpendTotal);
		const maxSpendPer: UnsignedCoins =
			quantity === 0 ? {} : UnsignedCoinsPF2e.multiplyCoins(1 / quantity, finalSpend);
		treasureFromData.value = maxSpendPer;
		treasureFromData.quantity = quantity;
	}

	private async getProgressBarWidths() {
		const totalMaterialCost = this.getTotalMaterialCost();
		const projectMax = await this.project.max;
		const projectValue = this.project.value;

		if (totalMaterialCost.copperValue === 0) {
			return {
				invisible: fractionToPercent(0, 1),
				criticalFailure: fractionToPercent(0, 1),
				failure: fractionToPercent(0, 1),
				success: fractionToPercent(0, 1),
				criticalSuccess: fractionToPercent(0, 1),
				current: fractionToPercent(
					UnsignedCoinsPF2e.getCopperValue(projectValue),
					UnsignedCoinsPF2e.getCopperValue(projectMax)
				),
			};
		}

		const craftDuration = this.formData.craftDuration;

		const progress = ModifyProgressRuleElementHelper.getProgress(
			this.actor,
			{
				criticalSuccess: SignedCoinsPF2e.multiplyCoins(2, totalMaterialCost),
				success: SignedCoinsPF2e.multiplyCoins(2, totalMaterialCost),
				failure: SignedCoinsPF2e.multiplyCoins(0.5, totalMaterialCost),
				criticalFailure: SignedCoinsPF2e.negate(totalMaterialCost),
			},
			new Set([
				...(await this.project.getRollOptions()),
				"action:craft",
				"action:craft-project",
				`heroic:crafting:duration:${craftDuration}`,
			])
		);

		const bands = [
			Math.clamp(
				SignedCoinsPF2e.getCopperValue(SignedCoinsPF2e.addCoins(projectValue, progress.criticalFailure)),
				0,
				SignedCoinsPF2e.getCopperValue(projectMax)
			),
			Math.clamp(
				SignedCoinsPF2e.getCopperValue(SignedCoinsPF2e.addCoins(projectValue, progress.failure)),
				0,
				SignedCoinsPF2e.getCopperValue(projectMax)
			),
			Math.clamp(
				SignedCoinsPF2e.getCopperValue(SignedCoinsPF2e.addCoins(projectValue, progress.success)),
				0,
				SignedCoinsPF2e.getCopperValue(projectMax)
			),
			Math.clamp(
				SignedCoinsPF2e.getCopperValue(SignedCoinsPF2e.addCoins(projectValue, progress.criticalSuccess)),
				0,
				SignedCoinsPF2e.getCopperValue(projectMax)
			),
		];

		{
			let curValIdx = 4;
			for (let i = 0; i < bands.length; i++) {
				if (bands[i] > UnsignedCoinsPF2e.getCopperValue(projectValue)) {
					curValIdx = i;
					break;
				}
			}
			bands.splice(curValIdx, 0, UnsignedCoinsPF2e.getCopperValue(projectValue));
		}

		console.log("Heroic Crafting |", bands, progress);

		return {
			invisible: fractionToPercent(bands[0], UnsignedCoinsPF2e.getCopperValue(projectMax)),
			criticalFailure: fractionToPercent(bands[1] - bands[0], UnsignedCoinsPF2e.getCopperValue(projectMax)),
			failure: fractionToPercent(bands[2] - bands[1], UnsignedCoinsPF2e.getCopperValue(projectMax)),
			success: fractionToPercent(bands[3] - bands[2], UnsignedCoinsPF2e.getCopperValue(projectMax)),
			criticalSuccess: fractionToPercent(bands[4] - bands[3], UnsignedCoinsPF2e.getCopperValue(projectMax)),
			current: fractionToPercent(
				UnsignedCoinsPF2e.getCopperValue(projectValue),
				UnsignedCoinsPF2e.getCopperValue(projectMax)
			),
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

		this.materials.forEach((troveItem) =>
			materials.push({
				img: troveItem.img,
				name: troveItem.name,
				uuid: troveItem.uuid,
				quantity: troveItem.quantity,
				formData: this.formData.materialList.materials[troveItem.uuid],
			})
		);

		const spendingLimit = ModifyConstantRuleElementHelper.getConstant(
			this.actor,
			"spendingLimit",
			{ duration: this.formData.craftDuration },
			await this.project.getRollOptions()
		);
		const scaledSpendingLimit = UnsignedCoinsPF2e.multiplyCoins(this.project.batchSize, spendingLimit);
		const totalMaterialCost = this.getTotalMaterialCost();
		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-hammer",
				cssClass: "craft-project-button",
				label: "Craft Project",
				disabled: UnsignedCoinsPF2e.getCopperValue(totalMaterialCost) === 0,
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
			spendingLimit: scaledSpendingLimit,
			hasMaterialTrove: !!this.materialTrove,
			totalMaterial: {
				value: totalMaterialCost,
				max: scaledSpendingLimit,
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
