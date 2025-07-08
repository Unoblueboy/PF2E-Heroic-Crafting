const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { copperValueToCoins, copperValueToCoinString, coinsToCopperValue } from "../helper/currency.mjs";
import { HEROIC_CRAFTING_GATHERED_INCOME, HEROIC_CRAFTING_SPENDING_LIMIT, LEVEL_BASED_DC } from "../helper/limits.mjs";
import { addMaterialTroveValue } from "../MaterialTrove/materialTrove.mjs";

const SALVAGE_MATERIAL_UUID = "Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.R8QxNha74tYOrccl";

export async function salvage(actor, item, lockItem = false) {
	const salvageDetails = await GetSalvageDetails({ actor: actor, item: item, lockItem: lockItem });

	if (!salvageDetails) {
		return;
	}

	const salvageActor = salvageDetails.actor;
	const salvageItem = salvageDetails.item;
	const salvageItemLevel = salvageItem.level;

	// data-visibility

	const roll = await salvageActor.skills.crafting.check.roll({
		dc: { value: LEVEL_BASED_DC.get(salvageItemLevel), visible: true },
		extraRollOptions: ["action:salvage-item"],
		extraRollNotes: [
			{
				selector: "crafting",
				text: "<strong>Success</strong> Add the amount listed on Table 2: Gathered Income for the item's level to your Material Trove each hour. If you are a master in Crafting, instead add twice as much. The item becomes unusable.",
				outcome: ["success", "criticalSuccess"],
			},
			{
				selector: "crafting",
				text: "<strong>Failure</strong> Add half the amount listed on Table 2: Gathered Income for the item's level to your Material Trove each hour. If you are a master in Crafting, instead add the listed amount. The item becomes unusable.",
				outcome: ["failure"],
			},
		],
		label: await foundry.applications.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
			subtitle: "Crafting Check",
			title: "Salvage Item",
		}),
		traits: ["exploration"],
		createMessage: false,
		callback: async (roll, outcome, message, event) => {
			if (message instanceof CONFIG.ChatMessage.documentClass) {
				let incomeCopperValue;
				switch (outcome) {
					case "criticalSuccess":
					case "success":
						incomeCopperValue = salvageDetails.income.success;
						break;
					case "failure":
					case "criticalFailure":
						incomeCopperValue = salvageDetails.income.failure;
						break;
					default:
						incomeCopperValue = 0;
						break;
				}

				const fullDuration =
					incomeCopperValue == 0
						? Infinity
						: Math.ceil(coinsToCopperValue(salvageDetails.max) / incomeCopperValue);
				const flavor = await foundry.applications.handlebars.renderTemplate(
					"modules/pf2e-heroic-crafting/templates/chat/salvage/result.hbs",
					{
						item: salvageItem,
						itemLink: await TextEditor.enrichHTML(salvageItem.link, {
							rollData: salvageItem.getRollData(),
						}),
						salvage: {
							income: {
								copperValue: incomeCopperValue,
								string: copperValueToCoinString(incomeCopperValue),
							},
							duration: { given: salvageDetails.duration, full: fullDuration },
							max: salvageDetails.max,
						},
						success: ["success", "criticalSuccess"].includes(outcome),
					}
				);
				if (!!flavor) {
					message.updateSource({ flavor: message.flavor + flavor });
				}
				CONFIG.ChatMessage.documentClass.create(message.toObject());
			} else {
				console.error("PF2E | Unable to amend chat message with craft result.", message);
			}
		},
	});
}

export function salvageButtonListener(message, html, data) {
	const salvageResults = html.querySelector("[data-salvage-results]");
	if (!!salvageResults) salvageResults.addEventListener("click", gainSalvageMaterials);
}

async function gainSalvageMaterials(event) {
	if (event.target?.tagName != "BUTTON") return;
	const button = event.target;
	const generalDiv = event.currentTarget;
	const data = mergeObject(generalDiv.dataset, button.dataset);

	const item = await fromUuid(data.itemUuid);
	const salvageMaxCoins = {
		pp: Number.parseInt(data.salvageMaxPp),
		gp: Number.parseInt(data.salvageMaxGp),
		sp: Number.parseInt(data.salvageMaxSp),
		cp: Number.parseInt(data.salvageMaxCp),
	};
	const duration = Number.parseInt(data.duration);
	const income = Number.parseInt(data.salvageIncome);
	const totalIncome = duration * income;

	var itemData = await fromUuid(SALVAGE_MATERIAL_UUID);
	const salvageMaxCopper = coinsToCopperValue(salvageMaxCoins);
	const remainingSalvagePrice = Math.max(salvageMaxCopper - totalIncome, 0);
	if (item.slug != "generic-salvage-material") {
		itemData = mergeObject(itemData, {
			system: {
				level: { value: item.level },
				bulk: item.system.bulk,
				containerId: item.container,
				equipped: item.system.equipped,
				price: { value: copperValueToCoins(remainingSalvagePrice) },
			},
		});
		if (remainingSalvagePrice > 0) {
			await Item.implementation.create(itemData, { parent: item.actor });
		} else {
			ui.notifications.info(`${item.name} fully salvaged`);
		}
		await item.delete();
	} else {
		if (remainingSalvagePrice > 0) {
			await item.update({ "system.price.value": copperValueToCoins(remainingSalvagePrice) });
		} else {
			ui.notifications.info(`${item.name} fully salvaged`);
			await item.delete();
		}
	}

	await addMaterialTroveValue(item.actor, Math.min(salvageMaxCopper, totalIncome));
}

class SalvageApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	result;
	item;
	actor;
	callback;
	lockItem;

	constructor(options = {}) {
		super(options);
		this.actor = options.actor;
		this.item = options.item;
		this.lockItem = options.lockItem;
		this.callback = options.callback;
		this.result = null;
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
		let salvageMaxCoins = {
			pp: formData.object.salvageMaximumPP,
			gp: formData.object.salvageMaximumGP,
			sp: formData.object.salvageMaximumSP,
			cp: formData.object.salvageMaximumCP,
		};

		if (Object.values(salvageMaxCoins).some((x) => x == undefined)) {
			const maximumInputs = form.querySelectorAll(".details .maximum input");
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
		const itemLevel = this.item.level;
		const baseIncomeValue = HEROIC_CRAFTING_GATHERED_INCOME[itemLevel];
		const salvageMaxCopper = coinsToCopperValue(salvageMaxCoins);
		let incomeSuccessCopperValue, incomeFailureCopperValue;
		if (formData.object.useSavvyTeardown) {
			const halfSalvageMax = Math.floor(salvageMaxCopper / 2);
			const dailySpendingLimit = HEROIC_CRAFTING_SPENDING_LIMIT[this.actor.level].day;
			const baseIncomeSuccessValue = Math.min(halfSalvageMax, dailySpendingLimit);
			incomeSuccessCopperValue = baseIncomeSuccessValue;
			incomeFailureCopperValue = 0;
		} else {
			const baseIncomeSuccessValue = baseIncomeValue;
			const baseIncomeFailureValue = Math.floor(baseIncomeValue / 2);
			const hasMasterCrafting = this.actor.skills.crafting.rank >= 3;
			const hasDismantlerFeat = this.actor.items.some((x) => x.slug == "dismantler" && x.type == "feat");
			const masterCraftingModifier = hasMasterCrafting ? 2 : 1;
			const dismantlerModifier = hasDismantlerFeat ? 2 : 1;
			incomeSuccessCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeSuccessValue;
			incomeFailureCopperValue = dismantlerModifier * masterCraftingModifier * baseIncomeFailureValue;
		}

		this.result = {
			savvyTeardown: formData.object.useSavvyTeardown,
			max: salvageMaxCoins,
			duration: formData.object.salvageDuration,
			income: {
				success: incomeSuccessCopperValue,
				failure: incomeFailureCopperValue,
			},
			actor: this.actor,
			item: this.item,
		};
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
	async #onDrop(event) {
		const data = foundry.applications.ux.TextEditor.getDragEventData(event);

		const item = await this.getItem(data);
		if (!item) return;

		if (!this.lockItem || (this.lockItem && !this.item)) {
			this.actor ||= item.parent;
			this.item = item;
		}
		this.updateDetails({ useDefaultSalvageMax: true });
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
		let salvageMaxCopper;
		if (options?.useDefaultSalvageMax) {
			salvageMaxCopper = isSalvage
				? this.item.price.value.copperValue
				: Math.floor(this.item.price.value.copperValue / 2);
			const salvageMaxCoins = copperValueToCoins(salvageMaxCopper);

			const maximumInputs = detailsDiv.querySelectorAll(".maximum input");
			for (const ele of maximumInputs) {
				var value = 0;
				switch (ele.name) {
					case "salvageMaximumPP":
						value = salvageMaxCoins.pp;
						break;
					case "salvageMaximumGP":
						value = salvageMaxCoins.gp;
						break;
					case "salvageMaximumSP":
						value = salvageMaxCoins.sp;
						break;
					case "salvageMaximumCP":
						value = salvageMaxCoins.cp;
						break;
					default:
						break;
				}
				ele.value = value;
				ele.disabled = isSalvage;
			}
		} else {
			const maximumInputs = detailsDiv.querySelectorAll(".maximum input");
			const coins = {};
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

		const savvyTeardownCheckBox = detailsDiv.querySelector("#salvage-details-useSavvyTeardown");
		const savvyTeardownEles = detailsDiv.querySelectorAll(".savvy-teardown");
		if (isSalvage) {
			savvyTeardownCheckBox.checked = false;
			savvyTeardownCheckBox.disabled = true;
			savvyTeardownEles.forEach((ele) => ele.classList.add("hide"));
		} else {
			savvyTeardownCheckBox.disabled = false;
			savvyTeardownEles.forEach((ele) => ele.classList.remove("hide"));
		}
		const useSavvyTeardown = savvyTeardownCheckBox.checked && !isSalvage;

		const itemLevel = this.item.level;
		const baseIncomeValue = HEROIC_CRAFTING_GATHERED_INCOME[itemLevel];
		let tooltipSuccessText, tooltipFailureText, incomeSuccessString, incomeFailureString;
		if (useSavvyTeardown) {
			const halfSalvageMax = Math.floor(salvageMaxCopper / 2);
			const dailySpendingLimit = HEROIC_CRAFTING_SPENDING_LIMIT[this.actor.level].day;
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
			const hasMasterCrafting = this.actor.skills.crafting.rank >= 3;
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

		const salvageIncomeSuccessDiv = detailsDiv.querySelector(".income #salvage-success-income");
		salvageIncomeSuccessDiv.textContent = incomeSuccessString;
		salvageIncomeSuccessDiv.dataset.tooltip = tooltipSuccessText;
		const salvageIncomeFailureInput = detailsDiv.querySelector(".income #salvage-failure-income");
		salvageIncomeFailureInput.textContent = incomeFailureString;
		salvageIncomeFailureInput.dataset.tooltip = tooltipFailureText;

		const salvageButton = this.element.querySelector(".footer-button-panel .salvage-button");
		salvageButton.disabled = !this.item;

		const salvageDurationEles = detailsDiv.querySelectorAll(".duration");
		if (useSavvyTeardown || isSalvage) {
			salvageDurationEles.forEach((ele) => ele.classList.add("hide"));
		} else {
			salvageDurationEles.forEach((ele) => ele.classList.remove("hide"));
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

		return item;
	}

	/** @override */
	_onClose(options) {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
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
		const numberFields = this.element.querySelectorAll(".maximum input");
		for (const input of numberFields) {
			input.addEventListener("change", () => this.updateDetails());
		}
		this.updateDetails({ useDefaultSalvageMax: true });
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
			{
				type: "button",
				icon: "fa-sharp fa-solid fa-recycle",
				label: "Cancel",
				cssClass: "cancel-button",
				action: "close",
			},
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
		return context;
	}
}

function checkItemPhysical(item) {
	return ["armor", "backpack", "book", "consumable", "equipment", "shield", "treasure", "weapon"].includes(item.type);
}

export async function GetSalvageDetails(options) {
	return new Promise((resolve, reject) => {
		const app = new SalvageApplication(
			Object.assign(options, {
				callback: resolve,
			})
		);
		app.render(true);
	});
}
