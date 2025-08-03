import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ForageLocationLevelDialogOptions = {
	callback?: (result: number | undefined) => void;
};

export class ForageLocationLevelDialog extends HandlebarsApplicationMixin(ApplicationV2) {
	result?: number;
	callback?: (result: number | undefined) => void;
	constructor(options: ForageLocationLevelDialogOptions) {
		super(options as object);
		this.callback = options.callback;
	}

	static override readonly DEFAULT_OPTIONS = {
		classes: ["forage-location-level-dialog"],
		position: { width: 350 },
		tag: "form",
		window: {
			title: "Forage Crafting Resources: Location Level",
			icon: "fa-solid fa-solid fa-leaf",
			contentClasses: ["standard-form"],
		},
		form: {
			handler: ForageLocationLevelDialog.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	static override readonly PARTS = {
		levelInput: { template: "modules/pf2e-heroic-crafting/templates/forage/level-input.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	static readonly SCHEMA = new foundry.data.fields.SchemaField({
		levelInput: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			max: 20,
			positive: true,
		}),
	});

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
	}

	private static handler(
		this: ForageLocationLevelDialog,
		_event: Event,
		_form: HTMLFormElement,
		formData: FormDataExtended
	) {
		this.result = formData.object.levelInput as number;
	}

	static async GetLocationLevel() {
		return new Promise<number | undefined>((resolve) => {
			const app = new ForageLocationLevelDialog({ callback: resolve });
			app.render(true);
		});
	}

	override async _preparePartContext(
		partId: string,
		context: Record<string, unknown>,
		options: HandlebarsRenderOptions
	) {
		super._preparePartContext(partId, context, options);
		context.partId = `${this.id}-${partId}`;
		return context;
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);
		const fields = ForageLocationLevelDialog.SCHEMA.fields;

		const buttons = [
			{
				type: "submit",
				action: "forage",
				icon: "fa-solid fa-leaf",
				default: true,
				label: "Set Location Level",
			},
			{
				type: "button",
				icon: "fa-solid fa-xmark",
				label: "Cancel",
				action: "close",
			},
		];
		return foundry.utils.mergeObject(data, {
			buttons,
			fields,
			rootId: this.id,
		});
	}
}
