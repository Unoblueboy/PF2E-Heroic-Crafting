import { ActorPF2e } from "../../../types/src/module/actor";
import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../../types/src/module/item";
import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { coinsToCopperValue, copperValueToCoins, copperValueToCoinString } from "../../helper/currency.mjs";
import { HEROIC_CRAFTING_GATHERED_INCOME, HEROIC_CRAFTING_SPENDING_LIMIT } from "../../helper/constants.mjs";
import { checkItemPhysical } from "../../helper/guards.mjs";
import { SalvageApplicationOptions, SalvageApplicationResult } from "./types.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SalvageApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	result?: SalvageApplicationResult;
	item?: PhysicalItemPF2e;
	actor?: ActorPF2e;
	callback?: (result: SalvageApplicationResult | undefined) => void;
	lockItem?: boolean;

	constructor(options: SalvageApplicationOptions = {}) {
		super(options as any);
		this.actor = options.actor;
		this.item = options.item;
		this.lockItem = options.lockItem;
		if (!!options.callback) this.callback = options.callback;
	}

	static DEFAULT_OPTIONS = {
		id: "salvage",
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

	static async handler(this: SalvageApplication, event: Event, form: HTMLFormElement, formData: FormDataExtended) {
		if (!this.item || !this.actor) return;
		const spendingLimitForLevel = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level);
		if (!spendingLimitForLevel) return;
		const baseIncomeValue = HEROIC_CRAFTING_GATHERED_INCOME.get(this.item.level);
		if (!baseIncomeValue) return;

		let salvageMaxCoins: Coins = {
			pp: formData.object.salvageMaximumPP as number,
			gp: formData.object.salvageMaximumGP as number,
			sp: formData.object.salvageMaximumSP as number,
			cp: formData.object.salvageMaximumCP as number,
		};

		if (Object.values(salvageMaxCoins).some((x) => x == undefined)) {
			const maximumInputs = form.querySelectorAll<HTMLInputElement>(".details .maximum input");
			for (const ele of maximumInputs) {
				switch (ele.name) {
					case "salvageMaximumPP":
						salvageMaxCoins.pp ||= Number.parseInt(ele.value);
						break;
					case "salvageMaximumGP":
						salvageMaxCoins.gp ||= Number.parseInt(ele.value);
						break;
					case "salvageMaximumSP":
						salvageMaxCoins.sp ||= Number.parseInt(ele.value);
						break;
					case "salvageMaximumCP":
						salvageMaxCoins.cp ||= Number.parseInt(ele.value);
						break;
					default:
						break;
				}
			}
		}
		const salvageMaxCopper = coinsToCopperValue(salvageMaxCoins);
		let incomeSuccessCopperValue, incomeFailureCopperValue;
		if (formData.object.useSavvyTeardown) {
			const halfSalvageMax = Math.floor(salvageMaxCopper / 2);
			const dailySpendingLimit = spendingLimitForLevel.day;
			const baseIncomeSuccessValue = Math.min(halfSalvageMax, dailySpendingLimit);
			incomeSuccessCopperValue = baseIncomeSuccessValue;
			incomeFailureCopperValue = 0;
		} else {
			const baseIncomeSuccessValue = baseIncomeValue;
			const baseIncomeFailureValue = Math.floor(baseIncomeValue / 2);
			const craftingRank = this.actor.skills?.crafting?.rank ?? 0;
			const hasMasterCrafting = craftingRank >= 3;
			const hasDismantlerFeat = this.actor.items.some((x) => x.slug == "dismantler" && x.type == "feat");
			const masterCraftingModifier = hasMasterCrafting ? 2 : 1;
			const dismantlerModifier = hasDismantlerFeat ? 2 : 1;
			incomeSuccessCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeSuccessValue;
			incomeFailureCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeFailureValue;
		}

		this.result = {
			savvyTeardown: formData.object.useSavvyTeardown as boolean,
			max: salvageMaxCoins,
			duration: formData.object.salvageDuration as number,
			income: {
				success: incomeSuccessCopperValue,
				failure: incomeFailureCopperValue,
			},
			actor: this.actor,
			item: this.item,
		};
	}

	static async useSavvyTeardownClick(this: SalvageApplication, event: Event, target: HTMLElement) {
		if (event.type != "click") return;
		this.updateDetails();
	}

	static async GetSalvageDetails(options: SalvageApplicationOptions) {
		return new Promise<SalvageApplicationResult | undefined>((resolve, reject) => {
			const app = new SalvageApplication(
				Object.assign(options, {
					callback: resolve,
				})
			);
			app.render(true);
		});
	}

	static override PARTS = {
		"drag-drop": { template: "modules/pf2e-heroic-crafting/templates/salvage/drag-drop.hbs" },
		details: {
			template: "modules/pf2e-heroic-crafting/templates/salvage/details.hbs",
			classes: ["hide"],
		},
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	static SCHEMA = new foundry.data.fields.SchemaField({
		useSavvyTeardown: new foundry.data.fields.BooleanField({
			initial: false,
			label: "Savvy Teardown",
			hint: "Use Savvy Teardown (cannot be used on existing salvage)",
		}),
		salvageMaximumCP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		salvageMaximumSP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		salvageMaximumGP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		salvageMaximumPP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		salvageDuration: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 1,
			positive: true,
		}),
	});

	/**
	 * Callback actions which occur when a dragged element is dropped on a target.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	async #onDrop(event: DragEvent) {
		const data = foundry.applications.ux.TextEditor.getDragEventData(event);

		const item = await this.getItem(data);
		if (!item) return;

		if (!this.lockItem || (this.lockItem && !this.item)) {
			this.actor ||= item.parent as ActorPF2e;
			this.item = item;
		}
		this.updateDetails({ useDefaultSalvageMax: true });
	}

	updateDetails(options?: { useDefaultSalvageMax: boolean }) {
		const detailsDiv = this.element.querySelector(".details") as HTMLDivElement;
		if (!this.item) {
			detailsDiv.classList.add("hide");
			return;
		}
		if (!this.actor) return;
		const spendingLimitForLevel = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level);
		if (!spendingLimitForLevel) return;
		const baseIncomeValue = HEROIC_CRAFTING_GATHERED_INCOME.get(this.item.level);
		if (!baseIncomeValue) return;

		const dragDropDiv = this.element.querySelector(".drop-item-zone") as HTMLDivElement;
		(dragDropDiv.querySelector(".item-icon") as HTMLImageElement).src = this.item.img;
		(dragDropDiv.querySelector(".item-name") as HTMLSpanElement).textContent = this.item.name;
		(dragDropDiv.querySelector(".item-level") as HTMLSpanElement).textContent = String(this.item.level).padStart(
			2,
			"0"
		);

		const isSalvage = this.item.slug == "generic-salvage-material";
		let salvageMaxCopper;
		if (options?.useDefaultSalvageMax) {
			salvageMaxCopper = isSalvage
				? this.item.price.value.copperValue
				: Math.floor(this.item.price.value.copperValue / 2);
			const salvageMaxCoins = copperValueToCoins(salvageMaxCopper);

			const maximumInputs = detailsDiv.querySelectorAll<HTMLInputElement>(".maximum input");
			for (const ele of maximumInputs) {
				var value = 0;
				switch (ele.name) {
					case "salvageMaximumPP":
						value = salvageMaxCoins.pp ?? 0;
						break;
					case "salvageMaximumGP":
						value = salvageMaxCoins.gp ?? 0;
						break;
					case "salvageMaximumSP":
						value = salvageMaxCoins.sp ?? 0;
						break;
					case "salvageMaximumCP":
						value = salvageMaxCoins.cp ?? 0;
						break;
					default:
						break;
				}
				ele.value = value.toString();
				ele.disabled = isSalvage;
			}
		} else {
			const maximumInputs = detailsDiv.querySelectorAll<HTMLInputElement>(".maximum input");
			const coins: Coins = {};
			for (const ele of maximumInputs) {
				switch (ele.name) {
					case "salvageMaximumPP":
						coins.pp = Number.parseInt(ele.value);
						break;
					case "salvageMaximumGP":
						coins.gp = Number.parseInt(ele.value);
						break;
					case "salvageMaximumSP":
						coins.sp = Number.parseInt(ele.value);
						break;
					case "salvageMaximumCP":
						coins.cp = Number.parseInt(ele.value);
						break;
					default:
						break;
				}
			}
			salvageMaxCopper = coinsToCopperValue(coins);
		}

		const hasSavvyTeardownFeat = this.actor.items.some((x) => x.slug == "savvy-teardown" && x.type == "feat");
		const savvyTeardownCheckBox = detailsDiv.querySelector("#salvage-details-useSavvyTeardown") as HTMLInputElement;
		const savvyTeardownEles = detailsDiv.querySelectorAll(".savvy-teardown");
		if (isSalvage || !hasSavvyTeardownFeat) {
			savvyTeardownCheckBox.checked = false;
			savvyTeardownCheckBox.disabled = true;
			savvyTeardownEles.forEach((ele) => ele.classList.add("hide"));
		} else {
			savvyTeardownCheckBox.disabled = false;
			savvyTeardownEles.forEach((ele) => ele.classList.remove("hide"));
		}
		const useSavvyTeardown = savvyTeardownCheckBox.checked && !isSalvage && hasSavvyTeardownFeat;

		let tooltipSuccessText, tooltipFailureText, incomeSuccessString, incomeFailureString;
		if (useSavvyTeardown) {
			const halfSalvageMax = Math.floor(salvageMaxCopper / 2);
			const dailySpendingLimit = spendingLimitForLevel.day;
			const baseIncomeSuccessValue = Math.min(halfSalvageMax, dailySpendingLimit);
			const incomeSuccessCopperValue = baseIncomeSuccessValue;

			incomeSuccessString = copperValueToCoinString(incomeSuccessCopperValue);
			incomeFailureString = copperValueToCoinString(0);

			tooltipSuccessText = `Base: `;
			if (halfSalvageMax <= dailySpendingLimit) {
				tooltipSuccessText += `${copperValueToCoinString(halfSalvageMax)} `;
				tooltipSuccessText += `<s>${copperValueToCoinString(dailySpendingLimit)}</s>`;
			} else {
				tooltipSuccessText += `<s>${copperValueToCoinString(halfSalvageMax)}</s> `;
				tooltipSuccessText += `${copperValueToCoinString(dailySpendingLimit)}`;
			}
			tooltipFailureText = `Base: ${copperValueToCoinString(0)}`;
		} else {
			const craftingRank = this.actor.skills?.crafting?.rank ?? 0;
			const hasMasterCrafting = craftingRank >= 3;
			const hasDismantlerFeat = this.actor.items.some((x) => x.slug == "dismantler" && x.type == "feat");
			const masterCraftingModifier = hasMasterCrafting ? 2 : 1;
			const dismantlerModifier = hasDismantlerFeat ? 2 : 1;

			const baseIncomeSuccessValue = baseIncomeValue;
			const baseIncomeFailureValue = Math.floor(baseIncomeValue / 2);
			const incomeSuccessCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeSuccessValue;
			const incomeFailureCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeFailureValue;

			incomeSuccessString = copperValueToCoinString(incomeSuccessCopperValue);
			incomeFailureString = copperValueToCoinString(incomeFailureCopperValue);

			const tooltipTextArray = [];
			if (hasMasterCrafting) tooltipTextArray.push("Master Crafting Proficiency: (×2)");
			if (hasDismantlerFeat) tooltipTextArray.push("Dismantler Feat (×2)");
			tooltipSuccessText = [`Base: ${copperValueToCoinString(baseIncomeSuccessValue)}`]
				.concat(tooltipTextArray)
				.join("<br>");
			tooltipFailureText = [`Base: ${copperValueToCoinString(baseIncomeFailureValue)}`]
				.concat(tooltipTextArray)
				.join("<br>");
		}

		const salvageIncomeSuccessDiv = detailsDiv.querySelector(".income #salvage-success-income") as HTMLDivElement;
		salvageIncomeSuccessDiv.textContent = incomeSuccessString;
		salvageIncomeSuccessDiv.dataset.tooltip = tooltipSuccessText;
		const salvageIncomeFailureInput = detailsDiv.querySelector(".income #salvage-failure-income") as HTMLDivElement;
		salvageIncomeFailureInput.textContent = incomeFailureString;
		salvageIncomeFailureInput.dataset.tooltip = tooltipFailureText;

		const salvageButton = this.element.querySelector(".footer-button-panel .salvage-button") as HTMLButtonElement;
		salvageButton.disabled = !this.item;

		const salvageDurationEles = detailsDiv.querySelectorAll(".duration");
		if (useSavvyTeardown) {
			salvageDurationEles.forEach((ele) => ele.classList.add("hide"));
		} else {
			salvageDurationEles.forEach((ele) => ele.classList.remove("hide"));
		}

		detailsDiv.classList.remove("hide");
	}

	async getItem(data: Record<string, JSONValue>) {
		if (typeof data.type == "string" && data.type?.toLowerCase() != "item") {
			ui.notifications.info("Only items can be salvaged");
			return null;
		}

		const item = (await fromUuid(data.uuid as string)) as ItemPF2e;

		if (!item) return null;
		if (!data.fromInventory && !item.parent) {
			ui.notifications.info("Only items from an actors inventory can be salvaged");
			return null;
		}
		if (!checkItemPhysical(item)) {
			ui.notifications.info("Only physical items can be salvaged");
			return null;
		}
		if (item.type == "treasure" && (item as TreasurePF2e).isCoinage) {
			ui.notifications.info("Coins cannot be salvaged");
			return null;
		}
		if (item.slug && ["material-trove", "generic-crafting-material"].includes(item.slug)) {
			ui.notifications.info(`${item.name} cannot be salvaged`);
			return null;
		}
		if (this.actor && this.actor != item.parent) {
			ui.notifications.info(`Item must be from ${this.actor.name}`);
			return null;
		}

		return item;
	}

	override _onClose(options: ApplicationClosingOptions) {
		super._onClose(options);
		if (this.callback) this.callback(this.result as SalvageApplicationResult | undefined);
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	override async _onRender(context: object, options: ApplicationRenderOptions) {
		super._onRender(context, options);
		new foundry.applications.ux.DragDrop.implementation({
			dropSelector: ".drop-item-zone",
			callbacks: {
				drop: this.#onDrop.bind(this),
			},
		}).bind(this.element);
		const numberFields = this.element.querySelectorAll(".maximum input");
		for (const input of numberFields) {
			input.addEventListener("change", () => this.updateDetails());
		}
		this.updateDetails({ useDefaultSalvageMax: true });
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const buttons = [
			{
				type: "submit",
				icon: "fa-sharp fa-solid fa-recycle",
				label: "Salvage",
				cssClass: "salvage-button",
				disabled: true,
			},
			{
				type: "button",
				icon: "fa-sharp fa-solid fa-recycle",
				label: "Cancel",
				cssClass: "cancel-button",
				action: "close",
			},
		];
		const fields = SalvageApplication.SCHEMA.fields;

		return Object.assign(data, {
			buttons,
			fields,
			datasets: {
				useSavvyTeardown: { action: "on-use-savvy-teardown-click" },
			},
		});
	}

	override async _preparePartContext(partId: string, context: Record<string, any>, options: HandlebarsRenderOptions) {
		context.partId = `${this.id}-${partId}`;
		return context;
	}
}
