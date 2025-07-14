import { coinsToCopperValue, copperValueToCoins } from "../../helper/currency.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class EditMaterialTroveApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(CraftingMaterialsCopperValue, callback) {
		super();
		this.CraftingMaterialsCopperValue = CraftingMaterialsCopperValue;
		this.addSubChosen = "add";
		this.curEditValue = {};
		this.curAddSubValue = {};
		this.result = null;
		this.callback = callback ? callback : null;
	}

	/** @override */
	static PARTS = {
		tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["standard-form"] },
		edit: { template: "modules/pf2e-heroic-crafting/templates/editMaterialTrove.hbs" },
		"add-sub": {
			template: "modules/pf2e-heroic-crafting/templates/addSubMaterialTrove.hbs",
		},
		footer: { template: "templates/generic/form-footer.hbs", classes: ["standard-form"] },
	};

	/** @override */
	static DEFAULT_OPTIONS = {
		id: "edit-material-trove",
		window: { title: "Edit Material Trove", icon: "fa-solid fa-treasure-chest" },
		tag: "form",
		position: { width: 300 },
		form: {
			handler: EditMaterialTroveApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
		actions: {
			"check-radio-box": EditMaterialTroveApplication.checkRadioBox,
		},
	};

	/** @override */
	static TABS = {
		primary: {
			tabs: [
				{ id: "edit", label: "Edit" },
				{ id: "add-sub", label: "Add/Subtract" },
			],
			initial: "edit",
		},
	};

	static SCHEMA = new foundry.data.fields.SchemaField({
		editCP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		editSP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		editGP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		editPP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		editUseCoins: new foundry.data.fields.BooleanField({
			initial: false,
			label: "Use Coins",
			hint: "Move coins from/to the actors inventory",
		}),
		addSubCP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		addSubSP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		addSubGP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		addSubPP: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
		addSubUseCoins: new foundry.data.fields.BooleanField({
			initial: false,
			label: "Use Coins",
			hint: "Move coins from/to the actors inventory",
		}),
	});

	static async handler(event, form, formData) {
		switch (this.tabGroups.primary) {
			case "add-sub":
				this.result = {
					newMaterialCopperValue:
						this.addSubChosen == "add"
							? this.CraftingMaterialsCopperValue + coinsToCopperValue(this.curAddSubValue.coins)
							: this.CraftingMaterialsCopperValue - coinsToCopperValue(this.curAddSubValue.coins),
					useActorCoins: formData.object.addSubUseCoins,
				};
				break;
			case "edit":
				this.result = {
					newMaterialCopperValue: coinsToCopperValue(this.curEditValue.coins),
					useActorCoins: formData.object.editUseCoins,
				};
				break;
			default:
				break;
		}
	}

	static checkRadioBox(event, target) {
		if (event.type != "click") return;
		const inputElement = target.parentElement.getElementsByTagName("input")[0];
		inputElement.checked = true;
		this.addSubChosen = inputElement.value;
		EditMaterialTroveApplication.AddSubCurValue.bind(this)();
	}

	static UpdateAddSubCurValue(event) {
		event.preventDefault();
		event.stopImmediatePropagation();

		const target = event.target;
		switch (target.dataset.tab) {
			case "edit": {
				EditMaterialTroveApplication.EditCurValue.bind(this)(target.dataset.currency, target.value);
				break;
			}
			case "addSub": {
				EditMaterialTroveApplication.AddSubCurValue.bind(this)(target.dataset.currency, target.value);
				break;
			}
			default:
				break;
		}
	}

	static EditCurValue(currency, value) {
		this.curEditValue.coins[currency] = Number.parseInt(value);
		const curValue = (coinsToCopperValue(this.curEditValue.coins) / 100).toFixed(2);
		this.element.querySelector("#edit-material-trove-edit-new-materials").textContent = `${curValue} GP`;
	}

	static AddSubCurValue(currency, value) {
		if (currency && value) this.curAddSubValue.coins[currency] = Number.parseInt(value);
		const copperValue =
			this.addSubChosen == "add"
				? this.CraftingMaterialsCopperValue + coinsToCopperValue(this.curAddSubValue.coins)
				: this.CraftingMaterialsCopperValue - coinsToCopperValue(this.curAddSubValue.coins);
		const curValue = (copperValue / 100).toFixed(2);
		this.element.querySelector("#edit-material-trove-add-sub-new-materials").textContent = `${curValue} GP`;
	}

	/** @override */
	_onClose(options) {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
	}

	/** @override */
	async _onRender(context, options) {
		const numberFields = this.element.querySelectorAll('[data-action="update-cur-value"]');
		for (const input of numberFields) {
			input.addEventListener("change", EditMaterialTroveApplication.UpdateAddSubCurValue.bind(this));
		}
	}

	/** @override */
	async _prepareContext() {
		const data = await super._prepareContext();

		const fields = EditMaterialTroveApplication.SCHEMA.fields;
		for (const key of Object.keys(fields)) {
			if (key == "addSubUseCoins") continue;

			const currency = key.slice(key.length - 2).toLowerCase();
			const tab = key.slice(0, key.length - 2);
			fields[key].dataset = {
				action: "update-cur-value",
				currency,
				tab,
			};
		}

		const buttons = [{ type: "submit", icon: "fa-solid fa-treasure-chest", label: "Update Material Trove" }];
		const craftingMaterials = {
			goldValue: (this.CraftingMaterialsCopperValue / 100).toFixed(2),
			coins: copperValueToCoins(this.CraftingMaterialsCopperValue),
		};
		this.curEditValue = { coins: { ...craftingMaterials.coins } };
		this.curAddSubValue = {
			coins: {
				cp: 0,
				sp: 0,
				gp: 0,
				pp: 0,
			},
		};
		return foundry.utils.mergeObject(data, {
			buttons,
			rootId: this.id,
			fields,
			craftingMaterials,
		});
	}

	/** @override */
	async _preparePartContext(partId, context) {
		context.partId = `${this.id}-${partId}`;
		context.tab = context.tabs[partId];
		return context;
	}
}

export async function EditMaterialTrove(curValue) {
	return new Promise((resolve, reject) => {
		const app = new EditMaterialTroveApplication(curValue, resolve);
		app.render(true);
	});
}
