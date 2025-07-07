const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { copperValueToCoins, copperValueToCoinString } from "../helper/currency.mjs";

const HEROIC_CRAFTING_GATHERED_INCOME = [
	10, // Level 0
	40, // Level 1
	60, // Level 2
	100, // Level 3
	160, // Level 4
	200, // Level 5
	400, // Level 6
	500, // Level 7
	600, // Level 8
	800, // Level 9
	1000, // Level 10
	1200, // Level 11
	1600, // Level 12
	2400, // Level 13
	3000, // Level 14
	4000, // Level 15
	6000, // Level 16
	8000, // Level 17
	14000, // Level 18
	20000, // Level 19
	30000, // Level 20
]; // prices are in CP

export async function salvage(actor, item) {
	new SalvageApplication({ actor: actor, item: item }).render(true);
}

class SalvageApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(options = {}) {
		super(options);
		console.log(this.options);
		this.actor = options.actor;
		this.item = options.item;
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

	static async handler(event, form, formData) {
		console.log(event, form, formData);
	}

	static async useSavvyTeardownClick(event, target) {
		if (event.type != "click") return;
		this.updateDetails();
	}

	/** @override */
	static PARTS = {
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
			hint: "Use Savvy Teardown",
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
	async #onDrop(event) {
		console.log("onDrop", event);
		const data = foundry.applications.ux.TextEditor.getDragEventData(event);
		console.log(data);

		const item = await this.getItem(data);
		console.log(item);
		if (!item) return;

		this.item = item;
		this.updateDetails({ updateSalvageMax: true });
	}

	updateDetails(options) {
		const detailsDiv = this.element.querySelector(".details");
		if (!this.item) {
			detailsDiv.classList.add("hide");
			return;
		}

		const dragDropDiv = this.element.querySelector(".drop-item-zone");
		dragDropDiv.querySelector(".item-icon").src = this.item.img;
		dragDropDiv.querySelector(".item-name").textContent = this.item.name;
		dragDropDiv.querySelector(".item-level").textContent = String(this.item.level).padStart(2, 0);

		const isSalvage = this.item.slug == "generic-salvage-material";
		const maxCopperValue = isSalvage
			? this.item.price.value.copperValue
			: Math.floor(this.item.price.value.copperValue / 2);
		const maxCopperCoins = copperValueToCoins(maxCopperValue);

		if (options?.updateSalvageMax) {
			const maximumInputs = detailsDiv.querySelectorAll(".maximum input");
			for (const ele of maximumInputs) {
				var value = 0;
				switch (ele.name) {
					case "salvageMaximumPP":
						value = maxCopperCoins.pp;
						break;
					case "salvageMaximumGP":
						value = maxCopperCoins.gp;
						break;
					case "salvageMaximumSP":
						value = maxCopperCoins.sp;
						break;
					case "salvageMaximumCP":
						value = maxCopperCoins.cp;
						break;
					default:
						break;
				}
				ele.value = value;
				ele.disabled = isSalvage;
			}
		}

		const savvyCheckBox = detailsDiv.querySelector("#salvage-details-useSavvyTeardown");
		const useSavvyTeardown = savvyCheckBox.checked;
		const hasMasterCrafting = this.actor.skills.crafting.rank >= 3;
		const hasDismantlerFeat = this.actor.items.some((x) => x.slug == "dismantler" && x.type == "feat");
		const masterCraftingModifier = hasMasterCrafting ? 2 : 1;
		const dismantlerModifier = hasDismantlerFeat && !useSavvyTeardown ? 2 : 1;
		const itemLevel = this.item.level;
		const baseIncomeValue = HEROIC_CRAFTING_GATHERED_INCOME[itemLevel];
		const incomeCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeValue;

		const incomeSuccessString = copperValueToCoinString(
			useSavvyTeardown ? Math.floor(incomeCopperValue / 2) : incomeCopperValue
		);
		const incomeFailureString = copperValueToCoinString(useSavvyTeardown ? 0 : Math.floor(incomeCopperValue / 2));

		const tooltipTextArray = [];
		if (hasMasterCrafting || hasDismantlerFeat || savvyCheckBox)
			tooltipTextArray.push(
				useSavvyTeardown
					? `Base: min(${copperValueToCoinString(baseIncomeValue)}, ${copperValueToCoinString(
							Math.floor(maxCopperValue / 2)
					  )})`
					: `Base: ${copperValueToCoinString(baseIncomeValue)}`
			);
		if (hasMasterCrafting) tooltipTextArray.push("Master Crafting Proficiency: (×2)");
		if (hasDismantlerFeat && !useSavvyTeardown) tooltipTextArray.push("Dismantler Feat (×2)");
		const tooltipText = tooltipTextArray.join("<br>");

		const salvageIncomeSuccessDiv = detailsDiv.querySelector(".income #salvage-success-income");
		salvageIncomeSuccessDiv.textContent = incomeSuccessString;
		salvageIncomeSuccessDiv.dataset.tooltip = tooltipText;
		const salvageIncomeFailureInput = detailsDiv.querySelector(".income #salvage-failure-income");
		salvageIncomeFailureInput.textContent = incomeFailureString;
		salvageIncomeFailureInput.dataset.tooltip = tooltipText;

		const salvageButton = this.element.querySelector(".footer-button-panel .salvage-button");
		salvageButton.disabled = !this.item;

		const salvageDurationDiv = detailsDiv.querySelector(".duration");
		if (useSavvyTeardown) {
			salvageDurationDiv.classList.add("hide");
		} else {
			salvageDurationDiv.classList.remove("hide");
		}

		detailsDiv.classList.remove("hide");
	}

	async getItem(data) {
		if (data.type?.toLowerCase() != "item") {
			ui.notifications.info("Only items can be salvaged");
			return null;
		}

		const item = await fromUuid(data.uuid);

		if (!data.fromInventory && !item.parent) {
			ui.notifications.info("Only items from an actors inventory can be salvaged");
			return null;
		}
		if (!checkItemPhysical(item)) {
			ui.notifications.info("Only physical items can be salvaged");
			return null;
		}
		if (item.isCoinage) {
			ui.notifications.info("Coins cannot be salvaged");
			return null;
		}
		if (["material-trove", "generic-crafting-material"].includes(item.slug)) {
			ui.notifications.info(`${item.name} cannot be salvaged`);
			return null;
		}
		if (this.actor && this.actor != item.parent) {
			ui.notifications.info(`Item must be from ${this.actor.name}`);
			return null;
		}
		this.actor ||= item.parent;

		return item;
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		new foundry.applications.ux.DragDrop.implementation({
			dropSelector: ".drop-item-zone",
			callbacks: {
				drop: this.#onDrop.bind(this),
			},
		}).bind(this.element);
	}

	/** @override */
	async _prepareContext() {
		const data = await super._prepareContext();

		const buttons = [
			{
				type: "submit",
				icon: "fa-sharp fa-solid fa-recycle",
				label: "Salvage",
				cssClass: "salvage-button",
				disabled: true,
			},
			{ type: "submit", icon: "fa-sharp fa-solid fa-recycle", label: "Cancel" },
		];
		const fields = SalvageApplication.SCHEMA.fields;
		fields.useSavvyTeardown.dataset = { action: "on-use-savvy-teardown-click" };

		return Object.assign(data, {
			buttons,
			fields,
		});
	}

	/** @override */
	async _preparePartContext(partId, context) {
		context.partId = `${this.id}-${partId}`;
		// context.tab = context.tabs[partId];
		return context;
	}
}

function checkItemPhysical(item) {
	return ["armor", "backpack", "book", "consumable", "equipment", "shield", "treasure", "weapon"].includes(item.type);
}
