import type {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "foundry-pf2e/foundry/client/applications/_module.mjs";
import type { HandlebarsRenderOptions } from "foundry-pf2e/foundry/client/applications/api/handlebars-application.mjs";
import type FormDataExtended from "foundry-pf2e/foundry/client/applications/ux/form-data-extended.mjs";

import { LEVEL_BASED_DC } from "../../Helper/constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ForageDcDialogOptions = {
	locationLevel: number;
	callback?: (result: number | undefined) => void;
};

export class ForageDcDialog extends HandlebarsApplicationMixin(ApplicationV2) {
	locationLevel: number;
	result?: number;
	callback?: (result: number | undefined) => void;
	constructor(options: ForageDcDialogOptions) {
		super(options as object);
		this.callback = options.callback;
		this.locationLevel = options.locationLevel;
	}

	static override readonly DEFAULT_OPTIONS = {
		classes: ["forage-dc-dialog"],
		position: { width: 350 },
		tag: "form",
		window: {
			title: "Forage Crafting Resources: DC",
			icon: "fa-solid fa-solid fa-leaf",
			contentClasses: ["standard-form"],
		},
		form: {
			handler: ForageDcDialog.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	static override readonly PARTS = {
		levelInput: { template: "modules/pf2e-heroic-crafting/templates/forage/dc-input.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	static readonly SCHEMA = new foundry.data.fields.SchemaField({
		dcInput: new foundry.data.fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			positive: true,
		}),
	});

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
	}

	private static handler(this: ForageDcDialog, _event: Event, _form: HTMLFormElement, _formData: FormDataExtended) {
		this.result = _formData.object.dcInput as number;
	}

	static async GetDc(locationLevel: number) {
		return new Promise<number | undefined>((resolve) => {
			const app = new ForageDcDialog({ locationLevel, callback: resolve });
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
		const fields = ForageDcDialog.SCHEMA.fields;
		fields.dcInput.initial = LEVEL_BASED_DC.get(this.locationLevel) ?? 14;

		const buttons = [
			{
				type: "submit",
				action: "forage",
				icon: "fa-solid fa-leaf",
				default: true,
				label: "Set DC",
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
