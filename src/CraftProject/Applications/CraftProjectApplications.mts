import type { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import type { DENOMINATION, UnsignedCoins } from "../../Helper/currencyTypes.mjs";
import type { ProjectCraftDetails, ProjectCraftMaterialSpent, TreasureMaterialSpent } from "../types.mjs";
import type { PhysicalItemPF2e, FeatPF2e } from "foundry-pf2e";
import type {
	ApplicationConfiguration,
	ApplicationRenderOptions,
	ApplicationClosingOptions,
} from "foundry-pf2e/foundry/client/applications/_module.mjs";
import type { HandlebarsRenderOptions } from "foundry-pf2e/foundry/client/applications/api/handlebars-application.mjs";
import type FormDataExtended from "foundry-pf2e/foundry/client/applications/ux/form-data-extended.mjs";
import type { AProject } from "../../Projects/projects.mjs";

import { Projects } from "../../Projects/projects.mjs";
import {
	CRAFT_A_PROJECT_ROLL_OPTION,
	CRAFT_ROLL_OPTION,
	CRAFTING_MATERIAL_SLUG,
	MATERIAL_TROVE_SLUG,
	MIDNIGHT_CRAFTING_SLUG,
	SALVAGE_MATERIAL_SLUG,
	SEASONED_SLUG,
	SPECIALTY_CRAFTING_SLUG,
	SPECIALTY_ROLL_OPTION,
} from "../../Helper/constants.mjs";
import { fractionToPercent } from "../../Helper/generics.mjs";
import { hasFeat } from "../../Helper/item.mjs";
import { consoleDebug } from "../../Helper/log.mjs";
import { SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import { ModifyConstantRuleElementHelper } from "../../RuleElement/Helpers/ModifyConstantHelper.mjs";
import { ModifyProgressRuleElementHelper } from "../../RuleElement/Helpers/ModifyProgressHelper.mjs";
import { CraftProjectUtility } from "../craftProjectUtility.mjs";
import { ProjectCraftDuration, TreasurePostUseOperation } from "../types.mjs";

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

enum CraftProjectApplicationPart {
	ITEM_SUMMARY = "item-summary",
	CRAFTING_OPTIONS = "crafting-options",
	PROJECT_SUMMARY = "project-summary",
	MATERIAL_SUMMARY = "material-summary",
	FOOTER = "footer",
}

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
		craftingOptions: {
			specialtyCrafting?: string | null;
			midnightCrafting?: boolean;
		};
	};
	private materials: PhysicalItemPF2e[];
	private rushCost: boolean;
	private constructor(options: CraftProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.project = Projects.getProject(this.actor, options.projectId)!;
		this.callback = options.callback;

		this.formData = {
			craftDuration: ProjectCraftDuration.DAY,
			materialList: {
				currency: new UnsignedCoinsPF2e(),
				trove: new UnsignedCoinsPF2e(),
				materials: {},
			},
			craftingOptions: {},
		};
		this.materials = [];
		this.rushCost = false;
	}

	private async initializeData() {
		await this.updateRushCost();
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor, false);
		if (!this.materialTrove) return;

		this.materials = this.materialTrove.contents.filter(
			(troveItem) =>
				!!troveItem.slug &&
				!([MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG] as string[]).includes(
					troveItem.slug
				)
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

	private async updateMaterialData() {
		this.materialTrove = await MaterialTrove.getMaterialTrove(this.actor, false);
		if (!this.materialTrove) {
			this.materials = [];
			this.formData.materialList.materials = {};
			return;
		}

		this.materials = this.materialTrove.contents.filter(
			(troveItem) =>
				!!troveItem.slug &&
				!([MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG] as string[]).includes(
					troveItem.slug
				)
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

	private async updateRushCost() {
		this.rushCost = ModifyConstantRuleElementHelper.getConstant(
			this.actor,
			"rushCost",
			{ value: false },
			await this.getRollOptions()
		);
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

	static override readonly PARTS: Record<
		CraftProjectApplicationPart,
		{ template: string; classes?: string[]; scrollable?: string[] }
	> = {
		[CraftProjectApplicationPart.ITEM_SUMMARY]: {
			template: "modules/pf2e-heroic-crafting/templates/craftProject/item-summary.hbs",
		},
		[CraftProjectApplicationPart.CRAFTING_OPTIONS]: {
			template: "modules/pf2e-heroic-crafting/templates/craftProject/crafting-options.hbs",
		},
		[CraftProjectApplicationPart.PROJECT_SUMMARY]: {
			template: "modules/pf2e-heroic-crafting/templates/craftProject/project-summary.hbs",
		},
		[CraftProjectApplicationPart.MATERIAL_SUMMARY]: {
			template: "modules/pf2e-heroic-crafting/templates/craftProject/material-summary.hbs",
			scrollable: [".material-list"],
		},
		[CraftProjectApplicationPart.FOOTER]: {
			template: "templates/generic/form-footer.hbs",
			classes: ["footer-button-panel"],
		},
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
		if (treasureMaterials.length > 0) materialsSpent.materials = treasureMaterials;

		const progress = await this.getProjectProgress();

		const result: ProjectCraftDetails = {
			projectId: this.project.id,
			materialsSpent: materialsSpent,
			cost: this.getTotalMaterialCost(),
			progress: {
				criticalFailure: new SignedCoinsPF2e(progress.criticalFailure),
				failure: new SignedCoinsPF2e(progress.failure),
				success: new SignedCoinsPF2e(progress.success),
				criticalSuccess: new SignedCoinsPF2e(progress.criticalSuccess),
			},
			duration: this.formData.craftDuration,
			rollOptions: await this.getRollOptions(),
		};

		this.result = result;
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
		await this.updateMaterialData();
		await this.updateRushCost();
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
		const target = event.target as HTMLInputElement | HTMLSelectElement;
		const totalPath = target.name;
		const pathSegments = totalPath.split(".");

		consoleDebug(
			CONFIG.debug.applications,
			"CraftProjectApplication.manualUpdateInput",
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
			case "specialtyCrafting": {
				this.formData.craftingOptions.specialtyCrafting = target.value === "null" ? null : target.value;
				break;
			}
			case "midnightCrafting": {
				if (!(target instanceof HTMLInputElement)) break;
				this.formData.craftingOptions.midnightCrafting = target.checked;
				this.formData.craftDuration = ProjectCraftDuration.HOUR;
				this.resetFormData();
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
			case "materials":
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
		consoleDebug(
			CONFIG.debug.applications,
			"CraftProjectApplication.updateBasicMaterial",
			value,
			basicMaterial,
			basicMaterialKey
		);
		this.formData.materialList[basicMaterial][basicMaterialKey] = Number.parseInt(value) || 0;

		const maxSpend = await this.getMaxSpend(basicMaterial);
		if (UnsignedCoinsPF2e.getCopperValue(this.formData.materialList[basicMaterial]) <= maxSpend.copperValue) return;

		this.formData.materialList[basicMaterial] = maxSpend;
	}

	private async getMaxSpend(basicMaterial: "currency" | "trove"): Promise<UnsignedCoinsPF2e> {
		const spendingLimit = await this.getSpendingLimit();
		const scaledSpendingLimit = UnsignedCoinsPF2e.multiplyCoins(
			this.rushCost ? 2 * this.project.batchSize : this.project.batchSize,
			spendingLimit
		);

		const preMaterialContribution = UnsignedCoinsPF2e.subtractCoins(
			this.getTotalMaterialSpent(),
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

	private getTotalMaterialSpent(): UnsignedCoinsPF2e {
		const materialList = {
			currency: this.formData.materialList.currency,
			trove: this.formData.materialList.trove,
			materials: Object.values(this.formData.materialList.materials),
		};
		return CraftProjectUtility.getTotalMaterialSpent(materialList);
	}

	private getTotalMaterialCost(totalMaterialsSpent?: UnsignedCoinsPF2e): UnsignedCoinsPF2e {
		totalMaterialsSpent ??= this.getTotalMaterialSpent();

		return this.rushCost ? UnsignedCoinsPF2e.multiplyCoins(0.5, totalMaterialsSpent) : totalMaterialsSpent;
	}

	private async updateAdvancedMaterial(value: string, pathSegments: string[]) {
		consoleDebug(CONFIG.debug.applications, "CraftProjectApplication.updateAdvancedMaterial", value, pathSegments);
		consoleDebug(CONFIG.debug.applications, "Materials", this.formData.materialList.materials);
		const materialUuid = pathSegments.slice(0, -1).join(".");
		const materialKey = pathSegments.slice(-1)[0] as DENOMINATION | "quantity" | "postUseOperation";

		const materialFromData = this.formData.materialList.materials[materialUuid];
		if (!materialFromData) return;

		switch (materialKey) {
			case "cp":
			case "sp":
			case "gp":
			case "pp":
				materialFromData.value[materialKey] = Number.parseInt(value) || 0;
				break;
			case "quantity":
				materialFromData.quantity = Number.parseInt(value) || 0;
				break;
			case "postUseOperation":
				materialFromData.postUseOperation = value as TreasurePostUseOperation;
				return;

			default:
				return;
		}

		const spendingLimit = await this.getSpendingLimit();
		const scaledSpendingLimit = UnsignedCoinsPF2e.multiplyCoins(this.project.batchSize, spendingLimit);

		const item = (await foundry.utils.fromUuid(materialUuid)) as PhysicalItemPF2e;
		const treasureCoinsTotal = UnsignedCoinsPF2e.multiplyCoins(
			materialFromData.quantity ?? 0,
			materialFromData.value
		);

		const preTreasureContribution = UnsignedCoinsPF2e.subtractCoins(
			this.getTotalMaterialSpent(),
			treasureCoinsTotal
		);
		const remainingBudget = UnsignedCoinsPF2e.subtractCoins(scaledSpendingLimit, preTreasureContribution);
		const maxSpendTotal = UnsignedCoinsPF2e.minCoins(
			item.price.value.scale(materialFromData.quantity ?? 0),
			remainingBudget
		);

		if (
			treasureCoinsTotal.copperValue <= maxSpendTotal.copperValue &&
			(materialFromData.quantity ?? 0) <= item.quantity
		)
			return;

		const quantity = Math.min(materialFromData.quantity ?? 1, item.quantity);
		const finalSpend = UnsignedCoinsPF2e.minCoins(treasureCoinsTotal, maxSpendTotal);
		const maxSpendPer: UnsignedCoins =
			quantity === 0 ? {} : UnsignedCoinsPF2e.multiplyCoins(1 / quantity, finalSpend);
		materialFromData.value = maxSpendPer;
		materialFromData.quantity = quantity;
	}

	private async getProgressBarWidths() {
		const projectMax = await this.project.max;
		const projectValue = this.project.value;

		if (this.getTotalMaterialCost().copperValue === 0) {
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

		const progress = await this.getProjectProgress();

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

		consoleDebug(CONFIG.debug.applications, bands, progress);

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

	private async getProjectProgress(totalMaterialCost?: UnsignedCoinsPF2e) {
		totalMaterialCost ??= this.getTotalMaterialCost();

		return ModifyProgressRuleElementHelper.getProgress(
			this.actor,
			{
				criticalSuccess: SignedCoinsPF2e.multiplyCoins(2, totalMaterialCost),
				success: SignedCoinsPF2e.multiplyCoins(2, totalMaterialCost),
				failure: SignedCoinsPF2e.multiplyCoins(0.5, totalMaterialCost),
				criticalFailure: SignedCoinsPF2e.negate(totalMaterialCost),
			},
			await this.getRollOptions()
		);
	}

	private async getSpendingLimit() {
		return ModifyConstantRuleElementHelper.getConstant(
			this.actor,
			"spendingLimit",
			{ duration: this.formData.craftDuration },
			await this.getRollOptions()
		);
	}

	private async getRollOptions(): Promise<Set<string>> {
		const rollOptions = new Set([
			...(await this.project.getRollOptions()),
			CRAFT_ROLL_OPTION,
			CRAFT_A_PROJECT_ROLL_OPTION,
			`heroic:crafting:duration:${this.formData.craftDuration}`,
		]);

		if (this.formData.craftingOptions.midnightCrafting) {
			rollOptions.add("midnight-crafting");
		}
		if (this.formData.craftingOptions.specialtyCrafting) {
			rollOptions.add(SPECIALTY_ROLL_OPTION);
			rollOptions.add(this.formData.craftingOptions.specialtyCrafting);
		}
		return rollOptions;
	}

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		this.callback(this.result);
		delete this.actor.apps[this.id];
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		return {
			...data,
			id: this.id,
		};
	}

	override async _preparePartContext(
		partId: CraftProjectApplicationPart,
		context: Record<string, unknown>,
		options: HandlebarsRenderOptions
	) {
		super._preparePartContext(partId, context, options);
		context.partId = `${this.id}-${partId}`;
		switch (partId) {
			case CraftProjectApplicationPart.ITEM_SUMMARY:
				return {
					...context,
					...(await this.getItemSummaryPartContext()),
				};
			case CraftProjectApplicationPart.CRAFTING_OPTIONS:
				return {
					...context,
					...(await this.getCraftingOptionsPartContext()),
				};
			case CraftProjectApplicationPart.PROJECT_SUMMARY:
				return {
					...context,
					...(await this.getProjectSummaryPartContext()),
				};
			case CraftProjectApplicationPart.MATERIAL_SUMMARY:
				return {
					...context,
					...(await this.getMaterialSummaryPartContext()),
				};
			case CraftProjectApplicationPart.FOOTER:
				return {
					...context,
					...(await this.getFooterPartContext()),
				};

			default:
				return context as never;
		}
	}

	private async getItemSummaryPartContext() {
		return {
			project: await this.project.getContextData(),
		};
	}

	private async getCraftingOptionsPartContext() {
		const craftingOptions: Record<string, unknown> = {};

		const specialtyCrafting = this.getSpecialtyCrafting();
		if (specialtyCrafting.length > 0) {
			craftingOptions.specialtyCrafting = specialtyCrafting
				.map((feat: FeatPF2e) => {
					if (feat.slug === SPECIALTY_CRAFTING_SLUG) {
						const rollOption = feat.flags.pf2e.rulesSelections.specialtyCrafting;
						if (!rollOption) return null;
						return {
							label: getSpecialtyCraftingLabel(rollOption),
							rollOption: rollOption,
						};
					}
					return {
						label: "Seasoned",
						rollOption: "item:tag:food",
					};
				})
				.filter((x) => !!x);
		}

		if (hasFeat(this.actor, MIDNIGHT_CRAFTING_SLUG)) {
			craftingOptions.showMidnightCrafting = true;
		}

		return {
			craftingOptions: craftingOptions,
			formData: this.formData,
			showCraftingOptions: Object.keys(craftingOptions).length !== 0,
		};
	}

	private async getProjectSummaryPartContext() {
		return {
			progressBarWidths: await this.getProgressBarWidths(),
			project: await this.project.getContextData(),
		};
	}

	private async getMaterialSummaryPartContext() {
		return {
			materials: this.materials.map((troveItem) => {
				return {
					img: troveItem.img,
					name: troveItem.name,
					uuid: troveItem.uuid,
					quantity: troveItem.quantity,
					formData: this.formData.materialList.materials[troveItem.uuid],
				};
			}),
			totalMaterial: {
				cost: this.getTotalMaterialCost(),
				spent: this.getTotalMaterialSpent(),
				max: UnsignedCoinsPF2e.multiplyCoins(this.project.batchSize, await this.getSpendingLimit()),
			},
			rushCost: this.rushCost,
			formData: this.formData,
			hasMaterialTrove: !!this.materialTrove,
			hideCurrencyMaterials: this.formData.craftDuration === ProjectCraftDuration.HOUR,
		};
	}

	private async getFooterPartContext() {
		return {
			buttons: [
				{
					type: "submit",
					icon: "fa-solid fa-hammer",
					cssClass: "craft-project-button",
					label: "Craft Project",
					disabled: this.getTotalMaterialSpent().copperValue === 0,
				},
				{
					type: "button",
					icon: "fa-solid fa-xmark",
					label: "Cancel",
					action: "close",
				},
			],
		};
	}

	private getSpecialtyCrafting() {
		return this.actor.itemTypes.feat.filter(
			(x: FeatPF2e) => !!x.slug && ([SPECIALTY_CRAFTING_SLUG, SEASONED_SLUG] as string[]).includes(x.slug)
		);
	}
}

function getSpecialtyCraftingLabel(rollOption: string | number | object): string {
	switch (rollOption) {
		case "alchemy":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Alchemy");
		case "artistry":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Artistry");
		case "blacksmithing":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Blacksmithing");
		case "bookmaking":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Bookmaking");
		case "glassmaking":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Glassmaking");
		case "leatherworking":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Leatherworking");
		case "pottery":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Pottery");
		case "shipbuilding":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Shipbuilding");
		case "stonemasonry":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Stonemasonry");
		case "tailoring":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Tailoring");
		case "weaving":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Weaving");
		case "woodworking":
			return game.i18n.localize("PF2E.SpecificRule.SpecialtyCrafting.Woodworking");
		default:
			return "";
	}
}
