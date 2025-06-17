const HEROIC_CRAFTING_PREFIX = "Compendium.pf2e-heroic-crafting.heroic-crafting";
const HEROIC_CRAFTING_ITEMS_PREFIX = `${HEROIC_CRAFTING_PREFIX}-items.Item`;
const MATERIAL_TROVE_UUID = `${HEROIC_CRAFTING_ITEMS_PREFIX}.wtpSAjQwSyPOglzU`;
const CRAFTING_MATERIAL_UUID = `${HEROIC_CRAFTING_ITEMS_PREFIX}.UFqgBzSfC8XfuKVg`;

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
	};
});

async function editMaterialTrove(actor) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	// Heroic Crafting Items
	const heroicCraftingItems = actor.items.filter((x) => x.sourceId.startsWith(HEROIC_CRAFTING_ITEMS_PREFIX));

	// Get Material Trove
	const materialTroves = heroicCraftingItems.filter((x) => x.sourceId == MATERIAL_TROVE_UUID);

	if (materialTroves.length == 0) {
		ui.notifications.error(
			"No Material Trove Found, please add a material trove from the Heroic Crafting Items Compendium"
		);
		return;
	}
	if (materialTroves.length > 1) {
		ui.notifications.error(
			"Multiple Material Troves Found, please make sure that you only have one Material Trove"
		);
	}
	const materialTrove = materialTroves[0];

	// Get Generic Crafting Materials
	const genericCraftingMaterials = heroicCraftingItems.filter((x) => x.sourceId == CRAFTING_MATERIAL_UUID);
	if (genericCraftingMaterials.length == 0) {
		var data = await fromUuid(CRAFTING_MATERIAL_UUID);
		data = { ...data, system: { containerId: materialTrove.id, equipped: { carryType: "stowed" } } };
		console.log(data);
		const newMaterials = Item.implementation.create(data, { parent: actor });
		genericCraftingMaterials.push(newMaterials);
		ui.notifications.info("Generic Crafting Materials Created");
	}

	// Consolidate Money
	var CraftingMaterialsCopperValue = 0;

	for (const material of genericCraftingMaterials) {
		const materialSystem = material.system;
		CraftingMaterialsCopperValue += materialSystem.price.value.copperValue * materialSystem.quantity;
	}

	new EditMaterialTroveApplication(CraftingMaterialsCopperValue).render(true);
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class EditMaterialTroveApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(...args) {
		console.log(args);
		super(...args);
		this.CraftingMaterialsCopperValue = args[0];
	}

	/** @override */
	static PARTS = {
		tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["standard-form"] },
		edit: { template: "modules/pf2e-heroic-crafting/templates/editMaterialTrove.hbs", classes: ["standard-form"] },
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
}
