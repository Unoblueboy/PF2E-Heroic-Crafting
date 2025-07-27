import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/_module.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import {
	coinsToCoinString,
	coinsToCopperValue,
	copperValueToCoins,
	copperValueToCoinString,
} from "../../Helper/currency.mjs";
import { EditMaterialTroveApplicationResult } from "./types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EditMaterialTroveApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	CraftingMaterialsCopperValue: number;
	addSubChosen: "add" | "sub";
	curEditValue: Coins;
	curAddSubValue: Coins;
	result?: EditMaterialTroveApplicationResult;
	callback?: (result: EditMaterialTroveApplicationResult | undefined) => void;

	constructor(
		CraftingMaterialsCopperValue: number,
		callback: (result: EditMaterialTroveApplicationResult | undefined) => void
	) {
		super();
		this.CraftingMaterialsCopperValue = CraftingMaterialsCopperValue;
		this.addSubChosen = "add";
		this.curEditValue = {};
		this.curAddSubValue = {};
		if (callback) {
			this.callback = callback;
		}
	}

	static override readonly PARTS = {
		tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["standard-form"] },
		edit: { template: "modules/pf2e-heroic-crafting/templates/editMaterialTrove.hbs" },
		"add-sub": {
			template: "modules/pf2e-heroic-crafting/templates/addSubMaterialTrove.hbs",
		},
		footer: { template: "templates/generic/form-footer.hbs", classes: ["standard-form"] },
	};

	static override readonly DEFAULT_OPTIONS = {
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

	static override readonly TABS = {
		primary: {
			tabs: [
				{ id: "edit", label: "Edit" },
				{ id: "add-sub", label: "Add/Subtract" },
			],
			initial: "edit",
		},
	};

	static readonly SCHEMA = new foundry.data.fields.SchemaField({
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

	private static async handler(
		this: EditMaterialTroveApplication,
		_event: Event,
		_form: HTMLFormElement,
		formData: FormDataExtended
	) {
		switch (this.tabGroups.primary) {
			case "add-sub":
				this.result = {
					newMaterialCopperValue:
						this.addSubChosen == "add"
							? this.CraftingMaterialsCopperValue + coinsToCopperValue(this.curAddSubValue ?? {})
							: this.CraftingMaterialsCopperValue - coinsToCopperValue(this.curAddSubValue ?? {}),
					useActorCoins: formData.object.addSubUseCoins as boolean,
				};
				break;
			case "edit":
				this.result = {
					newMaterialCopperValue: coinsToCopperValue(this.curEditValue),
					useActorCoins: formData.object.editUseCoins as boolean,
				};
				break;
			default:
				break;
		}
	}

	private static checkRadioBox(this: EditMaterialTroveApplication, event: Event, target: HTMLElement) {
		if (event.type != "click") return;
		const inputElement = target.parentElement?.getElementsByTagName("input")[0] as HTMLInputElement;
		inputElement.checked = true;
		this.addSubChosen = inputElement.value as "add" | "sub";
		EditMaterialTroveApplication.AddSubCurValue.bind(this)();
	}

	private static UpdateAddSubCurValue(this: EditMaterialTroveApplication, event: Event) {
		event.preventDefault();
		event.stopImmediatePropagation();

		const target = event.target as HTMLInputElement;
		const denomination = target.dataset.denomination as keyof Coins;
		const value = Number.parseInt(target.value);
		switch (target.dataset.tab) {
			case "edit": {
				EditMaterialTroveApplication.EditCurValue.bind(this)(denomination, value);
				break;
			}
			case "addSub": {
				EditMaterialTroveApplication.AddSubCurValue.bind(this)(denomination, value);
				break;
			}
			default:
				break;
		}
	}

	private static EditCurValue(this: EditMaterialTroveApplication, denomination: keyof Coins, value: number) {
		this.curEditValue[denomination] = value;
		const curValue = coinsToCoinString(this.curEditValue);
		const newMaterialDiv = this.element.querySelector("#edit-material-trove-edit-new-materials");
		if (newMaterialDiv) newMaterialDiv.textContent = curValue;
	}

	private static AddSubCurValue(this: EditMaterialTroveApplication, denomination?: keyof Coins, value?: number) {
		if (denomination && value != 0) this.curAddSubValue[denomination] = value;
		const copperValue =
			this.addSubChosen == "add"
				? this.CraftingMaterialsCopperValue + coinsToCopperValue(this.curAddSubValue)
				: this.CraftingMaterialsCopperValue - coinsToCopperValue(this.curAddSubValue);
		const curValue = copperValueToCoinString(copperValue);
		const newMaterialDiv = this.element.querySelector("#edit-material-trove-add-sub-new-materials");
		if (newMaterialDiv) newMaterialDiv.textContent = curValue;
	}

	static async EditMaterialTrove(curValue: number) {
		return new Promise<EditMaterialTroveApplicationResult | undefined>((resolve) => {
			const app = new EditMaterialTroveApplication(curValue, resolve);
			app.render(true);
		});
	}

	override _onClose(options: ApplicationClosingOptions) {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
	}

	override async _onRender(_context: object, _options: ApplicationRenderOptions) {
		const numberFields = this.element.querySelectorAll('[data-action="update-cur-value"]');
		for (const input of numberFields) {
			input.addEventListener("change", EditMaterialTroveApplication.UpdateAddSubCurValue.bind(this));
		}
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const fields = EditMaterialTroveApplication.SCHEMA.fields;
		const datasets: Partial<
			Record<keyof typeof fields, { action: string; denomination: keyof Coins; tab: string }>
		> = {};
		for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
			if (key == "addSubUseCoins") continue;

			const denomination = key.slice(key.length - 2).toLowerCase() as keyof Coins;
			const tab = key.slice(0, key.length - 2);
			datasets[key] = {
				action: "update-cur-value",
				denomination,
				tab,
			};
		}

		const buttons = [{ type: "submit", icon: "fa-solid fa-treasure-chest", label: "Update Material Trove" }];
		const craftingMaterials = {
			curValue: copperValueToCoinString(this.CraftingMaterialsCopperValue),
			coins: copperValueToCoins(this.CraftingMaterialsCopperValue),
		};
		this.curEditValue = { ...craftingMaterials.coins };
		this.curAddSubValue = {
			cp: 0,
			sp: 0,
			gp: 0,
			pp: 0,
		};
		return foundry.utils.mergeObject(data, {
			buttons,
			rootId: this.id,
			fields,
			craftingMaterials,
			datasets,
		});
	}

	override async _preparePartContext(
		partId: string,
		context: Record<string, unknown>,
		options: HandlebarsRenderOptions
	) {
		super._preparePartContext(partId, context, options);
		context.partId = `${this.id}-${partId}`;
		context.tab = (context.tabs as Record<string, string>)[partId];
		return context;
	}
}
