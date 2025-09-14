import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../../types/src/module/item";
import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CoinsPF2eUtility, DENOMINATION } from "../../Helper/currency.mjs";
import {
	CRAFTING_MATERIAL_SLUG,
	DEGREE_OF_SUCCESS_STRINGS,
	HEROIC_CRAFTING_GATHERED_INCOME,
	MATERIAL_TROVE_SLUG,
	SALVAGE_MATERIAL_SLUG,
} from "../../Helper/constants.mjs";
import { SalvageApplicationOptions, SalvageApplicationResult } from "./types.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { DegreeOfSuccessString } from "../../../types/src/module/system/degree-of-success";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";
import { SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { ModifyProgressRuleElementHelper } from "../../RuleElement/Helpers/ModifyProgressHelper.mjs";
import { ProjectCraftDuration } from "../../CraftProject/types.mjs";
import { ModifyConstantRuleElementHelper } from "../../RuleElement/Helpers/ModifyConstantHelper.mjs";
import { getHeroicItemRollOptions } from "../../Helper/item.mjs";
import { UnsignedCoins } from "../../Helper/currencyTypes.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

enum SalvageApplicationPart {
	DRAG_DROP = "drag-drop",
	DETAILS = "details",
	FOOTER = "footer",
}

type SalvageApplicationFormData = {
	salvageMax: UnsignedCoins;
	useSavvyTeardown: boolean;
	salvageDuration: number;
};

type SalvageApplicationRenderDataIncomeData = {
	criticalSuccess?: {
		content: string;
		tooltip: string;
		value: UnsignedCoins;
	};
	success: {
		content: string;
		tooltip: string;
		value: UnsignedCoins;
	};
	failure: {
		content: string;
		tooltip: string;
		value: UnsignedCoins;
	};
	criticalFailure?: {
		content: string;
		tooltip: string;
		value: UnsignedCoins;
	};
};

type SalvageApplicationRenderData = {
	hideDetails: boolean;
	disableMoneyGroupInputs: boolean;
	hideSavvyTeardown: boolean;
	hideSalvageDuration: boolean;
	incomeData: SalvageApplicationRenderDataIncomeData;
};

export class SalvageApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	private result?: SalvageApplicationResult;
	private item?: PhysicalItemPF2e;
	private actor: CharacterPF2eHeroicCrafting;
	private readonly callback: (result: SalvageApplicationResult | undefined) => void;
	private readonly lockItem?: boolean;

	private readonly formData: SalvageApplicationFormData;
	private readonly renderData: SalvageApplicationRenderData;

	constructor(options: SalvageApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.item = options.item;
		this.lockItem = options.lockItem;
		this.callback = options.callback;

		this.formData = this.initialiseFormData();
		this.renderData = this.initialiseRenderData();
	}

	private initialiseFormData(): SalvageApplicationFormData {
		return {
			salvageMax: this.getInitialSalvageMax(),
			useSavvyTeardown: false,
			salvageDuration: 1,
		};
	}

	private getInitialSalvageMax(): UnsignedCoins {
		if (!this.item) return { pp: 0, gp: 0, sp: 0, cp: 0 };
		if (this.isItemSalvage()) return this.item.price.value;
		return UnsignedCoinsPF2e.multiplyCoins(0.5, this.item.price.value);
	}

	private initialiseRenderData(): SalvageApplicationRenderData {
		return {
			hideDetails: !this.item,
			disableMoneyGroupInputs: this.isItemSalvage(),
			hideSavvyTeardown: this.isItemSalvage() || !this.hasSavvyTeardownFeat(),
			hideSalvageDuration: this.formData.useSavvyTeardown,
			incomeData: this.item
				? this.getIncomeData()
				: {
						success: { content: "", tooltip: "", value: {} },
						failure: { content: "", tooltip: "", value: {} },
				  },
		};
	}

	static override readonly DEFAULT_OPTIONS = {
		classes: ["salvage-dialog"],
		position: { width: 550 },
		tag: "form",
		window: {
			title: "Select item to salvage",
			icon: "fa-sharp fa-solid fa-recycle",
		},
		form: {
			handler: SalvageApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	static override readonly PARTS = {
		[SalvageApplicationPart.DRAG_DROP]: {
			template: "modules/pf2e-heroic-crafting/templates/salvage/drag-drop.hbs",
		},
		[SalvageApplicationPart.DETAILS]: {
			template: "modules/pf2e-heroic-crafting/templates/salvage/details.hbs",
		},
		[SalvageApplicationPart.FOOTER]: {
			template: "templates/generic/form-footer.hbs",
			classes: ["footer-button-panel"],
		},
	};

	protected override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & SalvageApplicationOptions
	): ApplicationConfiguration {
		const data = super._initializeApplicationOptions(options);
		data.uniqueId = `salvage-actor-${options.actor.id}`;
		if (options.item && options.lockItem) {
			data.uniqueId += `-item-${options.item.id}`;
		}
		return data;
	}

	static async handler(this: SalvageApplication, _event: Event, _form: HTMLFormElement, _formData: FormDataExtended) {
		if (!this.item || !this.actor) return;

		const incomeData = this.getIncomeData();

		this.result = {
			savvyTeardown: this.formData.useSavvyTeardown,
			max: new UnsignedCoinsPF2e(this.formData.salvageMax),
			duration: this.formData.salvageDuration,
			income: {
				success: new UnsignedCoinsPF2e(incomeData.success.value),
				failure: new UnsignedCoinsPF2e(incomeData.failure.value),
			},
			actor: this.actor,
			item: this.item,
		};
		if (incomeData.criticalSuccess) {
			this.result.income.criticalSuccess = new UnsignedCoinsPF2e(incomeData.criticalSuccess.value);
		}
		if (incomeData.criticalFailure) {
			this.result.income.criticalFailure = new UnsignedCoinsPF2e(incomeData.criticalFailure.value);
		}
	}

	static async GetSalvageDetails(options: Omit<SalvageApplicationOptions, "callback">) {
		return new Promise<SalvageApplicationResult | undefined>((resolve, _reject) => {
			const app = new SalvageApplication(
				Object.assign(options, {
					callback: resolve,
				})
			);
			app.render(true);
		});
	}

	override async _onFirstRender(context: object, options: ApplicationRenderOptions) {
		await super._onFirstRender(context, options);
		this.actor.apps[this.id] = this;
	}

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		this.callback(this.result);
		delete this.actor.apps[this.id];
	}

	override async _onRender(context: object, options: ApplicationRenderOptions) {
		super._onRender(context, options);
		new foundry.applications.ux.DragDrop.implementation({
			dropSelector: ".drop-item-zone",
			callbacks: {
				drop: (event: DragEvent) => {
					this.onDrop(event);
				},
			},
		}).bind(this.element);

		for (const input of this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
			'[data-action="update-input-manual"]'
		)) {
			input.addEventListener(input.type === "checkbox" ? "click" : "change", this.manualUpdateInput.bind(this));
		}

		this.updateDetails();
	}

	private manualUpdateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const totalPath = target.name;
		const pathSegments = totalPath.split(".");
		const value = Number.parseInt(target.value);

		switch (pathSegments[0]) {
			case "salvageDuration": {
				this.formData.salvageDuration = value;
				break;
			}
			case "useSavvyTeardown": {
				this.formData.useSavvyTeardown = target.checked;
				break;
			}
			case "salvageMax": {
				this.formData.salvageMax[pathSegments[1] as DENOMINATION] = value;
				this.enforceMax();
				break;
			}
			default:
				break;
		}

		this.updateDetails();
		this.render();
	}

	private enforceMax() {
		if (!this.item) {
			this.formData.salvageMax = {};
			return;
		}
		if (this.isItemSalvage()) return;

		this.formData.salvageMax = UnsignedCoinsPF2e.minCoins(
			UnsignedCoinsPF2e.multiplyCoins(0.75, this.item.price.value),
			this.formData.salvageMax
		);
	}

	/**
	 * Callback actions which occur when a dragged element is dropped on a target.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	private async onDrop(event: DragEvent) {
		const data = game.pf2e.TextEditor.getDragEventData(event);

		const item = await this.getItem(data);
		if (!item) return;

		if (!this.lockItem || (this.lockItem && !this.item)) {
			this.actor ??= item.parent;
			this.item = item;
		}

		this.updateDetails({ setDefaultSalvageMax: true });
		this.render();
	}

	private updateDetails(options?: { setDefaultSalvageMax: boolean }) {
		if (!this.item) {
			this.renderData.hideDetails = true;
			return;
		}

		if (options?.setDefaultSalvageMax) this.setDefaultSalvageMax();

		this.updateSavvyTeardownData();

		this.renderData.incomeData = this.getIncomeData();

		this.renderData.hideDetails = false;
	}

	private getIncomeData(): SalvageApplicationRenderDataIncomeData {
		return this.formData.useSavvyTeardown ? this.getSavvyTeardownIncomeData() : this.getSalvageIncomeData();
	}

	private hasSavvyTeardownFeat() {
		return this.actor.itemTypes.feat.some((x) => x.slug === "savvy-teardown");
	}

	private isItemSalvage() {
		return this.item?.slug === SALVAGE_MATERIAL_SLUG;
	}

	private getSalvageIncomeData(): SalvageApplicationRenderDataIncomeData {
		if (!this.item || !this.actor) {
			return {
				success: { content: "", tooltip: "", value: {} },
				failure: { content: "", tooltip: "", value: {} },
			};
		}
		const baseIncomeValue = new UnsignedCoinsPF2e(HEROIC_CRAFTING_GATHERED_INCOME.get(this.item.level));
		if (!baseIncomeValue) {
			return {
				success: { content: "", tooltip: "", value: {} },
				failure: { content: "", tooltip: "", value: {} },
			};
		}

		const craftingRank = this.actor.skills?.crafting?.rank ?? 0;
		const hasMasterCrafting = craftingRank >= 3;

		const baseIncomeSuccessValue = baseIncomeValue;
		const baseIncomeFailureValue = UnsignedCoinsPF2e.multiplyCoins(1 / 2, baseIncomeValue);

		const progress = ModifyProgressRuleElementHelper.getProgress(
			this.actor,
			{
				criticalSuccess: UnsignedCoinsPF2e.multiplyCoins(hasMasterCrafting ? 2 : 1, baseIncomeSuccessValue),
				success: UnsignedCoinsPF2e.multiplyCoins(hasMasterCrafting ? 2 : 1, baseIncomeSuccessValue),
				failure: UnsignedCoinsPF2e.multiplyCoins(hasMasterCrafting ? 2 : 1, baseIncomeFailureValue),
				criticalFailure: UnsignedCoinsPF2e.multiplyCoins(hasMasterCrafting ? 2 : 1, baseIncomeFailureValue),
			},
			new Set(["action:salvage"]),
			true
		);

		const tooltipArrays = Object.fromEntries(
			DEGREE_OF_SUCCESS_STRINGS.map((degree) => [degree, progress.rundownSummary[degree]])
		) as { [x in DegreeOfSuccessString]: string[] };

		tooltipArrays.criticalSuccess.splice(0, 0, `Base: ${SignedCoinsPF2e.toString(baseIncomeSuccessValue)}`);
		tooltipArrays.success.splice(0, 0, `Base: ${SignedCoinsPF2e.toString(baseIncomeSuccessValue)}`);
		tooltipArrays.failure.splice(0, 0, `Base: ${SignedCoinsPF2e.toString(baseIncomeFailureValue)}`);
		tooltipArrays.criticalFailure.splice(0, 0, `Base: ${SignedCoinsPF2e.toString(baseIncomeFailureValue)}`);
		if (hasMasterCrafting) {
			tooltipArrays.criticalSuccess.splice(1, 0, "Master Crafting Proficiency: (×2)");
			tooltipArrays.success.splice(1, 0, "Master Crafting Proficiency: (×2)");
			tooltipArrays.failure.splice(1, 0, "Master Crafting Proficiency: (×2)");
			tooltipArrays.criticalFailure.splice(1, 0, "Master Crafting Proficiency: (×2)");
		}

		const incomeData: SalvageApplicationRenderDataIncomeData = {
			success: {
				content: new SignedCoinsPF2e(progress.success).toString(),
				tooltip: tooltipArrays.success.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.success),
			},
			failure: {
				content: new SignedCoinsPF2e(progress.failure).toString(),
				tooltip: tooltipArrays.failure.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.failure),
			},
		};

		if (!SignedCoinsPF2e.equal(progress.success, progress.criticalSuccess)) {
			incomeData.criticalSuccess = {
				content: new SignedCoinsPF2e(progress.criticalSuccess).toString(),
				tooltip: tooltipArrays.criticalSuccess.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.criticalSuccess),
			};
		}
		if (!SignedCoinsPF2e.equal(progress.failure, progress.criticalFailure)) {
			incomeData.criticalFailure = {
				content: new SignedCoinsPF2e(progress.criticalFailure).toString(),
				tooltip: tooltipArrays.criticalFailure.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.criticalFailure),
			};
		}
		return incomeData;
	}

	private getSavvyTeardownIncomeData(): SalvageApplicationRenderDataIncomeData {
		if (!this.actor) {
			return {
				success: { content: "", tooltip: "", value: {} },
				failure: { content: "", tooltip: "", value: {} },
			};
		}

		const spendingLimit = ModifyConstantRuleElementHelper.getConstant(
			this.actor,
			"spendingLimit",
			{ duration: ProjectCraftDuration.DAY },
			new Set([...this.actor.getRollOptions(), ...getHeroicItemRollOptions(this.item), "action:savvy-teardown"])
		);
		const dailySpendingLimit = new UnsignedCoinsPF2e(spendingLimit);

		const halfSalvageMax = UnsignedCoinsPF2e.multiplyCoins(0.5, this.formData.salvageMax);
		const baseIncomeSuccessValue = UnsignedCoinsPF2e.minCoins(halfSalvageMax, dailySpendingLimit);
		const baseIncomeFailureValue = new UnsignedCoinsPF2e();

		const progress = ModifyProgressRuleElementHelper.getProgress(
			this.actor,
			{
				criticalSuccess: baseIncomeSuccessValue,
				success: baseIncomeSuccessValue,
				failure: baseIncomeFailureValue,
				criticalFailure: baseIncomeFailureValue,
			},
			new Set(["action:savvy-teardown"]),
			true
		);

		const tooltipArrays = Object.fromEntries(
			DEGREE_OF_SUCCESS_STRINGS.map((degree) => [degree, progress.rundownSummary[degree]])
		) as { [x in DegreeOfSuccessString]: string[] };

		if (halfSalvageMax.copperValue <= dailySpendingLimit.copperValue) {
			tooltipArrays.success.splice(
				0,
				0,
				`Base: ${halfSalvageMax.toString()} <s>${dailySpendingLimit.toString()}</s>`
			);
			tooltipArrays.criticalSuccess.splice(
				0,
				0,
				`Base: ${halfSalvageMax.toString()} <s>${dailySpendingLimit.toString()}</s>`
			);
		} else {
			tooltipArrays.success.splice(
				0,
				0,
				`Base: <s>${halfSalvageMax.toString()}</s> ${dailySpendingLimit.toString()}`
			);
			tooltipArrays.criticalSuccess.splice(
				0,
				0,
				`Base: <s>${halfSalvageMax.toString()}</s> ${dailySpendingLimit.toString()}`
			);
		}
		tooltipArrays.failure.splice(0, 0, `Base: ${baseIncomeFailureValue.toString()}`);
		tooltipArrays.criticalFailure.splice(0, 0, `Base: ${baseIncomeFailureValue.toString()}`);

		const incomeData: SalvageApplicationRenderDataIncomeData = {
			success: {
				content: new SignedCoinsPF2e(progress.success).toString(),
				tooltip: tooltipArrays.success.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.success),
			},
			failure: {
				content: new SignedCoinsPF2e(progress.failure).toString(),
				tooltip: tooltipArrays.failure.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.failure),
			},
		};

		if (!SignedCoinsPF2e.equal(progress.success, progress.criticalSuccess)) {
			incomeData.criticalSuccess = {
				content: new SignedCoinsPF2e(progress.criticalSuccess).toString(),
				tooltip: tooltipArrays.criticalSuccess.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.criticalSuccess),
			};
		}
		if (!SignedCoinsPF2e.equal(progress.failure, progress.criticalFailure)) {
			incomeData.criticalFailure = {
				content: new SignedCoinsPF2e(progress.criticalFailure).toString(),
				tooltip: tooltipArrays.criticalFailure.join("<br>"),
				value: CoinsPF2eUtility.toUnsignedCoins(progress.criticalFailure),
			};
		}
		return incomeData;
	}

	private updateSavvyTeardownData() {
		this.renderData.hideSavvyTeardown = this.isItemSalvage() || !this.hasSavvyTeardownFeat();
		this.formData.useSavvyTeardown &&= !this.renderData.hideSavvyTeardown;
		this.renderData.hideSalvageDuration = this.formData.useSavvyTeardown;
	}

	private setDefaultSalvageMax() {
		if (!this.item) return new UnsignedCoinsPF2e();

		this.formData.salvageMax = this.isItemSalvage()
			? new UnsignedCoinsPF2e(this.item.price.value)
			: UnsignedCoinsPF2e.multiplyCoins(0.5, this.item.price.value);
		this.renderData.disableMoneyGroupInputs = this.isItemSalvage();
	}

	private async getItem(
		data: Record<string, JSONValue>
	): Promise<PhysicalItemPF2e<CharacterPF2eHeroicCrafting> | null> {
		if (typeof data.type === "string" && data.type?.toLowerCase() != "item") {
			ui.notifications.info("Only items can be salvaged");
			return null;
		}

		const item = await (async () => {
			try {
				return await (CONFIG.Item.documentClass as typeof ItemPF2e<CharacterPF2eHeroicCrafting>).fromDropData(
					data
				);
			} catch {
				return null;
			}
		})();

		if (!item) return null;
		if (!data.fromInventory && !item.parent) {
			ui.notifications.info("Only items from an actors inventory can be salvaged");
			return null;
		}
		if (!item.isOfType("physical")) {
			ui.notifications.info("Only physical items can be salvaged");
			return null;
		}
		if (item.isOfType("treasure") && (item as TreasurePF2e<CharacterPF2eHeroicCrafting>).isCoinage) {
			ui.notifications.info("Coins cannot be salvaged");
			return null;
		}
		if (item.slug && [MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG].includes(item.slug)) {
			ui.notifications.info(`${item.name} cannot be salvaged`);
			return null;
		}
		if (this.actor && this.actor != item.parent) {
			ui.notifications.info(`Item must be from ${this.actor.name}`);
			return null;
		}

		return item;
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		return Object.assign(data, {});
	}

	override async _preparePartContext(
		partId: string,
		context: Record<string, unknown>,
		_options: HandlebarsRenderOptions
	) {
		context.partId = `${this.id}-${partId}`;
		switch (partId as SalvageApplicationPart) {
			case SalvageApplicationPart.DRAG_DROP:
				context = {
					...context,
					item: {
						img: this.item?.img ?? "systems/pf2e/icons/actions/craft/unknown-item.webp",
						name: this.item?.name ?? "Drag item here...",
						level: this.item ? String(this.item.level).padStart(2, "0") : "??",
					},
				};
				break;
			case SalvageApplicationPart.DETAILS:
				context = {
					...context,
					formData: this.formData,
					renderData: this.renderData,
				};
				break;
			case SalvageApplicationPart.FOOTER:
				context = {
					...context,
					buttons: [
						{
							type: "submit",
							icon: "fa-sharp fa-solid fa-recycle",
							label: "Salvage",
							cssClass: "salvage-button",
							disabled: !this.item,
						},
						{
							type: "button",
							icon: "fa-solid fa-xmark",
							label: "Cancel",
							cssClass: "cancel-button",
							action: "close",
						},
					],
				};
				break;
			default:
				break;
		}
		return context;
	}
}
