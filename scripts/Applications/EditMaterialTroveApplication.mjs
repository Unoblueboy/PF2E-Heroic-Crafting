const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EditMaterialTroveApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(...args) {
		super(...args);
		this.CraftingMaterialsCopperValue = args[0];
		this.addSubChosen = "add";
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
			hint: "Takes coins from the actors inventory",
		}),
	});

	// async changeTab(tab, group, { event, force, navElement, updatePosition }) {
	// 	console.log(tab, group, event, force, navElement, updatePosition);
	// 	await super.changeTab(tab, group, { event, force, navElement, updatePosition });
	// 	console.log("Tab Groups", this.tabGroups);
	// }
	/** @override */
	async _prepareContext() {
		const data = await super._prepareContext();
		console.log(data);
		const buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" }];
		const craftingMaterials = {
			goldValue: (this.CraftingMaterialsCopperValue / 100).toFixed(2),
			coins: {
				cp: this.CraftingMaterialsCopperValue % 10,
				sp: Math.floor((this.CraftingMaterialsCopperValue % 100) / 10),
				gp: Math.floor(this.CraftingMaterialsCopperValue / 100),
				pp: 0,
			},
		};
		return Object.assign(data, {
			buttons,
			rootId: this.id,
			fields: EditMaterialTroveApplication.SCHEMA.fields,
			craftingMaterials,
			addSubChosen: this.addSubChosen,
		});
	}

	/** @override */
	async _preparePartContext(partId, context) {
		context.partId = `${this.id}-${partId}`;
		context.tab = context.tabs[partId];
		console.log(context, partId);
		return context;
	}

	static async handler(event, form, formData) {
		console.log(formData);
		console.log(this);
	}

	static checkRadioBox(event, target) {
		console.log(event, target);
		if (event.type != "click") return;
		target.parentElement.getElementsByTagName("input")[0].checked = true;
		// this.addSubChosen = target.parentElement.getElementsByTagName("input")[0].value;
		// this.render();
	}

	/** @override */
	async _onRender(context, options) {
		console.log(context, options);
	}
}
