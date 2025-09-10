import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../../types/src/module/item";
import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CoinsPF2eUtility } from "../../Helper/currency.mjs";
import {
	CRAFTING_MATERIAL_SLUG,
	HEROIC_CRAFTING_GATHERED_INCOME,
	HEROIC_CRAFTING_SPENDING_LIMIT,
	MATERIAL_TROVE_SLUG,
	SALVAGE_MATERIAL_SLUG,
} from "../../Helper/constants.mjs";
import { SalvageApplicationOptions, SalvageApplicationResult } from "./types.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { DegreeOfSuccessString } from "../../../types/src/module/system/degree-of-success";
import { DENOMINATION, SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

enum SalvageApplicationPart {
	DRAG_DROP = "drag-drop",
	DETAILS = "details",
	FOOTER = "footer",
}

type SalvageApplicationFormData = {
	salvageMax: Coins;
	useSavvyTeardown: boolean;
	salvageDuration: number;
};

type SalvageApplicationRenderDataIncomeData = Partial<
	Record<
		DegreeOfSuccessString,
		{
			content: string;
			tooltip: string;
			value: Coins;
		}
	>
>;

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

	private getInitialSalvageMax(): Coins {
		if (!this.item) return { pp: 0, gp: 0, sp: 0, cp: 0 };
		if (this.isItemSalvage()) return this.item.price.value;
		return SignedCoinsPF2e.multiplyCoins(0.5, this.item.price.value).toCoinsPF2e();
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
		position: { width: 350 },
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
		actions: {
			"on-use-savvy-teardown-click": SalvageApplication.useSavvyTeardownClick,
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
			max: new game.pf2e.Coins(this.formData.salvageMax),
			duration: this.formData.salvageDuration,
			income: {
				success: new game.pf2e.Coins(incomeData.success!.value),
				failure: new game.pf2e.Coins(incomeData.failure!.value),
			},
			actor: this.actor,
			item: this.item,
		};
	}

	private static async useSavvyTeardownClick(this: SalvageApplication, event: Event, _target: HTMLElement) {
		if (event.type != "click") return;
		this.updateDetails();
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

		this.updateDetails({ setDefaultSalvageMax: true });
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

		this.formData.salvageMax = SignedCoinsPF2e.minCoins(
			SignedCoinsPF2e.multiplyCoins(0.75, this.item.price.value),
			this.formData.salvageMax
		).toCoinsPF2e();
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
		const baseIncomeValue = new game.pf2e.Coins(HEROIC_CRAFTING_GATHERED_INCOME.get(this.item.level));
		if (!baseIncomeValue) {
			return {
				success: { content: "", tooltip: "", value: {} },
				failure: { content: "", tooltip: "", value: {} },
			};
		}

		const craftingRank = this.actor.skills?.crafting?.rank ?? 0;
		const hasMasterCrafting = craftingRank >= 3;
		const hasDismantlerFeat = this.actor.items.some((x) => x.slug === "dismantler" && x.type === "feat");
		const masterCraftingModifier = hasMasterCrafting ? 2 : 1;
		const dismantlerModifier = hasDismantlerFeat ? 2 : 1;

		const baseIncomeSuccessValue = baseIncomeValue;
		const baseIncomeFailureValue = CoinsPF2eUtility.multCoins(1 / 2, baseIncomeValue);
		const incomeSuccessValue = CoinsPF2eUtility.multCoins(
			dismantlerModifier,
			CoinsPF2eUtility.multCoins(masterCraftingModifier, baseIncomeSuccessValue)
		);
		const incomeFailureValue = CoinsPF2eUtility.multCoins(
			dismantlerModifier,
			CoinsPF2eUtility.multCoins(masterCraftingModifier, baseIncomeFailureValue)
		);

		const incomeSuccessString = incomeSuccessValue.toString();
		const incomeFailureString = incomeFailureValue.toString();

		const tooltipTextArray = [];
		if (hasMasterCrafting) tooltipTextArray.push("Master Crafting Proficiency: (×2)");
		if (hasDismantlerFeat) tooltipTextArray.push("Dismantler Feat (×2)");
		const tooltipSuccessText = [`Base: ${baseIncomeSuccessValue}`].concat(tooltipTextArray).join("<br>");
		const tooltipFailureText = [`Base: ${baseIncomeFailureValue}`].concat(tooltipTextArray).join("<br>");

		return {
			success: { content: incomeSuccessString, tooltip: tooltipSuccessText, value: incomeSuccessValue },
			failure: { content: incomeFailureString, tooltip: tooltipFailureText, value: incomeFailureValue },
		};
	}

	private getSavvyTeardownIncomeData(): SalvageApplicationRenderDataIncomeData {
		if (!this.actor) {
			return {
				success: { content: "", tooltip: "", value: {} },
				failure: { content: "", tooltip: "", value: {} },
			};
		}
		const spendingLimitForLevel = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level);
		if (!spendingLimitForLevel) {
			return {
				success: { content: "", tooltip: "", value: {} },
				failure: { content: "", tooltip: "", value: {} },
			};
		}

		const halfSalvageMax = CoinsPF2eUtility.multCoins(0.5, this.formData.salvageMax);
		const dailySpendingLimit = new game.pf2e.Coins(spendingLimitForLevel.day);
		const baseIncomeSuccessValue = CoinsPF2eUtility.minCoins(halfSalvageMax, dailySpendingLimit);
		const incomeSuccessValue = baseIncomeSuccessValue;
		const incomeFailureValue = new game.pf2e.Coins();

		const incomeSuccessString = incomeSuccessValue.toString();
		const incomeFailureString = incomeFailureValue.toString();

		let tooltipSuccessText = `Base: `;
		if (halfSalvageMax.copperValue <= dailySpendingLimit.copperValue) {
			tooltipSuccessText += `${halfSalvageMax.toString()} `;
			tooltipSuccessText += `<s>${dailySpendingLimit.toString()}</s>`;
		} else {
			tooltipSuccessText += `<s>${halfSalvageMax.toString()}</s> `;
			tooltipSuccessText += `${dailySpendingLimit.toString()}`;
		}
		const tooltipFailureText = `Base: ${incomeFailureString}`;

		return {
			success: { content: incomeSuccessString, tooltip: tooltipSuccessText, value: incomeSuccessValue },
			failure: { content: incomeFailureString, tooltip: tooltipFailureText, value: incomeFailureValue },
		};
	}

	private updateSavvyTeardownData() {
		this.renderData.hideSavvyTeardown = this.isItemSalvage() || !this.hasSavvyTeardownFeat();
		this.formData.useSavvyTeardown &&= !this.renderData.hideSavvyTeardown;
		this.renderData.hideSalvageDuration = this.formData.useSavvyTeardown;
	}

	private setDefaultSalvageMax() {
		if (!this.item) return new game.pf2e.Coins();

		const salvageMaxCopper = this.isItemSalvage()
			? this.item.price.value.copperValue
			: Math.floor(this.item.price.value.copperValue / 2);
		const salvageMaxCoins = CoinsPF2eUtility.copperValueToCoins(salvageMaxCopper);

		this.formData.salvageMax = salvageMaxCoins;
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
				return await CONFIG.PF2E.Item.documentClasses.armor.fromDropData<ItemPF2e<CharacterPF2eHeroicCrafting>>(
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
