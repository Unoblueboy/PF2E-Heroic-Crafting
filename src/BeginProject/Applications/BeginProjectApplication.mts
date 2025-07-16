import { ActorPF2e } from "../../../types/src/module/actor";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/_module.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { ProjectItemDetails } from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type BeginProjectApplicationOptions = {
	actor: ActorPF2e;
	callback: (result: ProjectItemDetails | undefined) => void;
};

export class BeginProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: ActorPF2e;
	callback: (result: ProjectItemDetails | undefined) => void;
	result: undefined;
	constructor(options: BeginProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.callback = options.callback;
	}

	static override readonly DEFAULT_OPTIONS = {
		id: "begin-project",
		classes: ["begin-project-dialog"],
		position: { width: 350 },
		tag: "form",
		window: {
			title: "Begin a Project",
			icon: "fa-solid fa-drafting-compass",
		},
		form: {
			handler: BeginProjectApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
		// actions: {
		// 	"on-use-savvy-teardown-click": SalvageApplication.useSavvyTeardownClick,
		// },
	};

	static override readonly PARTS = {
		tabs: { template: "templates/generic/tab-navigation.hbs", classes: ["standard-form"] },
		"drag-drop": { template: "modules/pf2e-heroic-crafting/templates/beginProject/drag-drop.hbs" },
		summary: { template: "modules/pf2e-heroic-crafting/templates/beginProject/summary.hbs" },
		advanced: {
			template: "modules/pf2e-heroic-crafting/templates/beginProject/advanced.hbs",
		},
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	static override readonly TABS = {
		primary: {
			tabs: [
				{ id: "summary", label: "Summary" },
				{ id: "advanced", label: "Advanced" },
			],
			initial: "summary",
		},
	};

	protected _onClose(_options: ApplicationClosingOptions): void {
		this.callback(this.result);
	}

	private static handler(
		this: BeginProjectApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		console.log(_event, _form, _formData);
	}

	static async GetItemDetails(actor: ActorPF2e): Promise<ProjectItemDetails | undefined> {
		return new Promise<ProjectItemDetails | undefined>((resolve) => {
			const app = new BeginProjectApplication({ actor, callback: resolve });
			app.render(true);
		});
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const buttons = [
			{ type: "submit", icon: "fa-solid fa-compass-drafting", label: "Begin Project" },
			{ type: "button", icon: "fa-solid fa-xmark", label: "Cancel", action: "close" },
		];
		return foundry.utils.mergeObject(data, {
			buttons,
		});
	}

	override async _preparePartContext(
		partId: string,
		context: Record<string, unknown>,
		options: HandlebarsRenderOptions
	) {
		super._preparePartContext(partId, context, options);
		context.partId = `${this.id}-${partId}`;
		console.log(context.tabs);
		context.tab = (context.tabs as Record<string, string>)[partId];
		return context;
	}
}
