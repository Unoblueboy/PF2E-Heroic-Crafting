import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { ProjectItemDetails } from "../../BeginProject/types.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { AProject } from "../../Projects/projects.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type EditProjectApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	project: AProject;
	callback: (result?: ProjectItemDetails) => void;
};

export class EditProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	project: AProject;
	result?: ProjectItemDetails;
	callback: (result?: ProjectItemDetails) => void;

	private constructor(options: EditProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.project = options.project;
		this.callback = options.callback;
	}

	static override readonly PARTS = {
		"item-summary": { template: "modules/pf2e-heroic-crafting/templates/editProject/item-summary.hbs" },
		"project-summary": { template: "modules/pf2e-heroic-crafting/templates/editProject/project-summary.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	static override readonly DEFAULT_OPTIONS = {
		id: "edit-project",
		classes: ["edit-project-dialog"],
		position: { width: 400 },
		tag: "form",
		window: {
			title: "Edit a Project",
			icon: "fa-solid fa-hammer",
		},
		form: {
			handler: EditProjectApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & EditProjectApplicationOptions
	): ApplicationConfiguration {
		const result = super._initializeApplicationOptions(options);
		result.uniqueId = `edit-project-Actor-${options.actor.id}-Project-${options.project.id}`;
		return result;
	}

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		if (this.callback) this.callback(this.result);
	}

	private static async handler(
		this: EditProjectApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		const value = {
			cp: _formData.object.cp as number,
			sp: _formData.object.sp as number,
			gp: _formData.object.gp as number,
			pp: _formData.object.pp as number,
		};
		this.result = {
			itemData: this.project.itemData,
			dc: _formData.object.dc as number,
			batchSize: _formData.object["batch-size"] as number,
			value,
		};
	}

	static async getNewDetails(options: { actor: CharacterPF2eHeroicCrafting; project: AProject }) {
		return new Promise<ProjectItemDetails | undefined>((resolve) => {
			const applicationOptions: EditProjectApplicationOptions = Object.assign(options, { callback: resolve });
			const app = new EditProjectApplication(applicationOptions);
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

		const buttons = [
			{
				type: "submit",
				action: "forage",
				icon: "fa-solid fa-leaf",
				default: true,
				label: "Edit Project",
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
			rootId: this.id,
			project: await this.project.getContextData(),
		});
	}
}
