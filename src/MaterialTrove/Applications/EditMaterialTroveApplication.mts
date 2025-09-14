import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/_module.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { CoinsPF2eUtility } from "../../Helper/currency.mjs";
import { UnsignedCoins, SignedCoins } from "../../Helper/currencyTypes.mjs";
import { SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../materialTrove.mjs";
import { EditMaterialTroveApplicationResult } from "./types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type EditMaterialTroveApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	materialTrove: MaterialTrove;
	callback: (result: EditMaterialTroveApplicationResult | undefined) => void;
};

enum EditMaterialTroveApplicationTab {
	EDIT = "edit",
	ADD_SUB = "add-sub",
}

enum EditMaterialTroveApplicationPart {
	TABS = "tabs",
	FOOTER = "footer",
}

export class EditMaterialTroveApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	private readonly actor: CharacterPF2eHeroicCrafting;
	private readonly materialTrove: MaterialTrove;
	private readonly formData: {
		curValue: {
			edit: UnsignedCoins;
			"add-sub": SignedCoins;
		};
		updateActorCoins: boolean;
	};
	private result?: EditMaterialTroveApplicationResult;
	private readonly callback?: (result: EditMaterialTroveApplicationResult | undefined) => void;

	constructor(options: EditMaterialTroveApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.materialTrove = options.materialTrove;
		this.formData = {
			curValue: {
				edit: new UnsignedCoinsPF2e({ ...this.materialTrove.value }),
				[EditMaterialTroveApplicationTab.ADD_SUB]: new SignedCoinsPF2e(),
			},
			updateActorCoins: false,
		};
		if (options.callback) {
			this.callback = options.callback;
		}
	}

	static override readonly PARTS = {
		[EditMaterialTroveApplicationPart.TABS]: {
			template: "templates/generic/tab-navigation.hbs",
			classes: ["standard-form"],
		},
		[EditMaterialTroveApplicationTab.EDIT]: {
			template: "modules/pf2e-heroic-crafting/templates/materialTrove/editMaterialTrove.hbs",
		},
		[EditMaterialTroveApplicationTab.ADD_SUB]: {
			template: "modules/pf2e-heroic-crafting/templates/materialTrove/addSubMaterialTrove.hbs",
		},
		[EditMaterialTroveApplicationPart.FOOTER]: {
			template: "templates/generic/form-footer.hbs",
			classes: ["standard-form"],
		},
	};

	static override readonly DEFAULT_OPTIONS = {
		classes: ["edit-material-trove-dialog"],
		window: { title: "Edit Material Trove", icon: "fa-solid fa-treasure-chest" },
		tag: "form",
		position: { width: 500 },
		form: {
			handler: EditMaterialTroveApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
		actions: {
			"negate-cur-value": EditMaterialTroveApplication.negateCurValue,
		},
	};

	static override readonly TABS = {
		primary: {
			tabs: [
				{ id: EditMaterialTroveApplicationTab.EDIT, label: "Edit" },
				{ id: EditMaterialTroveApplicationTab.ADD_SUB, label: "Add/Subtract" },
			],
			initial: EditMaterialTroveApplicationTab.EDIT,
		},
	};

	private static async handler(
		this: EditMaterialTroveApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		switch (this.tabGroups.primary) {
			case EditMaterialTroveApplicationTab.ADD_SUB:
				this.result = {
					newMaterialTroveValue: CoinsPF2eUtility.toUnsignedCoins(
						SignedCoinsPF2e.addCoins(
							this.materialTrove.value,
							this.formData.curValue[EditMaterialTroveApplicationTab.ADD_SUB]
						)
					),
					updateActorCoins: this.formData.updateActorCoins,
				};
				break;
			case EditMaterialTroveApplicationTab.EDIT:
				this.result = {
					newMaterialTroveValue: new UnsignedCoinsPF2e(
						this.formData.curValue[EditMaterialTroveApplicationTab.EDIT]
					),
					updateActorCoins: this.formData.updateActorCoins,
				};
				break;
			default:
				break;
		}
	}

	private static negateCurValue(this: EditMaterialTroveApplication) {
		console.log("Heroic Crafting |", "negateCurValue");

		if (this.tabGroups.primary == EditMaterialTroveApplicationTab.ADD_SUB) {
			const curValue = this.formData.curValue[this.tabGroups.primary];
			this.formData.curValue[this.tabGroups.primary] = SignedCoinsPF2e.negate(curValue);
		}

		this.enforceBounds(this.tabGroups.primary as EditMaterialTroveApplicationTab);
		this.render();
	}

	static async EditMaterialTrove(options: Omit<EditMaterialTroveApplicationOptions, "callback">) {
		return new Promise<EditMaterialTroveApplicationResult | undefined>((resolve) => {
			console.log(options);
			const app = new EditMaterialTroveApplication({ ...options, callback: resolve });
			app.render(true);
		});
	}

	override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & EditMaterialTroveApplicationOptions
	): ApplicationConfiguration {
		const result = super._initializeApplicationOptions(options);
		result.uniqueId = "edit-material-trove-" + options.actor.uuid.replace(".", "-");
		return result;
	}

	override async _onFirstRender(context: object, options: fa.ApplicationRenderOptions) {
		await super._onFirstRender(context, options);
		this.actor.apps[this.id] = this;
	}

	override _onClose(options: ApplicationClosingOptions) {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
		delete this.actor.apps[this.id];
	}

	override async _onRender(_context: object, _options: ApplicationRenderOptions) {
		for (const input of this.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
			'[data-action="update-input-manual"]'
		)) {
			input.addEventListener(input.type === "checkbox" ? "click" : "change", this.manualUpdateInput.bind(this));
		}
	}

	private manualUpdateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const totalPath = target.name;
		const pathSegments = totalPath.split(".");

		this.updateCurValue(pathSegments[0], pathSegments[1], target);

		this.render();
	}

	updateCurValue(tab: string, property: string, target: HTMLInputElement) {
		if (!EditMaterialTroveApplication.isTab(tab)) return;

		switch (property) {
			case "pp":
			case "gp":
			case "sp":
			case "cp":
				this.formData.curValue[tab][property] = Number.parseInt(target.value) || 0;
				break;
			case "updateActorCoins":
				this.formData.updateActorCoins = target.checked;
				break;
			default:
				break;
		}

		this.enforceBounds(tab);
	}

	enforceBounds(tab: EditMaterialTroveApplicationTab) {
		switch (tab) {
			case EditMaterialTroveApplicationTab.ADD_SUB: {
				const boundedDifference = SignedCoinsPF2e.boundCoins(
					this.formData.curValue["add-sub"],
					SignedCoinsPF2e.negate(this.materialTrove.value),
					SignedCoinsPF2e.INFINITY
				);
				this.formData.curValue[tab] = boundedDifference;
				break;
			}
			case EditMaterialTroveApplicationTab.EDIT: {
				if (!this.formData.updateActorCoins) return;
				const difference = SignedCoinsPF2e.subtractCoins(this.formData.curValue.edit, this.materialTrove.value);
				const boundedDifference = SignedCoinsPF2e.minCoins(difference, this.actor.inventory.coins);
				this.formData.curValue[tab] = CoinsPF2eUtility.toUnsignedCoins(
					SignedCoinsPF2e.maxCoins({}, SignedCoinsPF2e.addCoins(this.materialTrove.value, boundedDifference))
				);
				break;
			}
			default:
				break;
		}
	}

	private static isTab(tab: string): tab is EditMaterialTroveApplicationTab {
		return [EditMaterialTroveApplicationTab.EDIT, EditMaterialTroveApplicationTab.ADD_SUB].includes(
			tab as EditMaterialTroveApplicationTab
		);
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		return foundry.utils.mergeObject(data, {
			rootId: this.id,
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
		switch (partId) {
			case EditMaterialTroveApplicationTab.EDIT: {
				const coinDifference = SignedCoinsPF2e.subtractCoins(
					this.formData.curValue.edit,
					this.materialTrove.value
				);
				const newActorValue = CoinsPF2eUtility.toUnsignedCoins(
					SignedCoinsPF2e.subtractCoins(this.actor.inventory.coins, coinDifference)
				);
				context = {
					...context,
					trove: {
						newValue: new UnsignedCoinsPF2e(this.formData.curValue.edit),
						baseValue: this.materialTrove.value,
					},
					currency: {
						newValue: this.formData.updateActorCoins
							? newActorValue
							: new UnsignedCoinsPF2e(this.actor.inventory.coins),
						baseValue: new UnsignedCoinsPF2e(this.actor.inventory.coins),
					},
					curValue: this.formData.curValue[EditMaterialTroveApplicationTab.EDIT],
					updateActorCoins: this.formData.updateActorCoins,
					tabName: partId,
				};
				break;
			}
			case EditMaterialTroveApplicationTab.ADD_SUB: {
				context = {
					...context,
					trove: {
						newValue: CoinsPF2eUtility.toUnsignedCoins(
							SignedCoinsPF2e.addCoins(this.materialTrove.value, this.formData.curValue["add-sub"])
						),
						baseValue: this.materialTrove.value,
					},
					currency: {
						newValue: this.formData.updateActorCoins
							? CoinsPF2eUtility.toUnsignedCoins(
									SignedCoinsPF2e.subtractCoins(
										this.actor.inventory.coins,
										this.formData.curValue["add-sub"]
									)
							  )
							: new UnsignedCoinsPF2e(this.actor.inventory.coins),
						baseValue: new UnsignedCoinsPF2e(this.actor.inventory.coins),
					},
					curValue: this.formData.curValue[EditMaterialTroveApplicationTab.ADD_SUB],
					updateActorCoins: this.formData.updateActorCoins,
					tabName: partId,
				};
				break;
			}
			case EditMaterialTroveApplicationPart.FOOTER: {
				context = {
					...context,
					buttons: [{ type: "submit", icon: "fa-solid fa-treasure-chest", label: "Update Material Trove" }],
				};
				break;
			}

			default:
				break;
		}
		return context;
	}

	override async _preRender(context: object, options: ApplicationRenderOptions) {
		await super._preRender(context, options);
		await foundry.applications.handlebars.loadTemplates([
			"modules/pf2e-heroic-crafting/templates/materialTrove/materialSummary.hbs",
			"modules/pf2e-heroic-crafting/templates/materialTrove/moneyForm.hbs",
		]);
	}
}
