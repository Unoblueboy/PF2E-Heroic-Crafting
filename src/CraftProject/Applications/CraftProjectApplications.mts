import { ActorPF2e } from "../../../types/src/module/actor";
import { ContainerPF2e, PhysicalItemPF2e } from "../../../types/src/module/item";
import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { ProjectItemDetails } from "../../BeginProject/types.mjs";
import { FORMULA_PRICE } from "../../Helper/constants.mjs";
import { coinsToCoinString, coinsToCopperValue, copperValueToCoins, multCoins } from "../../Helper/currency.mjs";
import { fractionToPercent } from "../../Helper/generics.mjs";
import { getMaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import { ProjectCraftDetails } from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type CraftProjectApplicationOptions = {
	actor: ActorPF2e;
	projectId: string;
	callback: (result: ProjectCraftDetails | undefined) => void;
};

export class CraftProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: ActorPF2e;
	projectId: string;
	itemDetails: ProjectItemDetails;
	materialTrove?: PhysicalItemPF2e;
	result?: ProjectCraftDetails;
	callback: (result?: ProjectCraftDetails) => void;

	constructor(options: CraftProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.projectId = options.projectId;
		this.itemDetails = getItemDetails(this.actor, this.projectId);
		this.materialTrove = getMaterialTrove(this.actor, false);
		this.callback = options.callback;
	}

	static override readonly DEFAULT_OPTIONS = {
		id: "craft-project",
		classes: ["craft-project-dialog"],
		position: { width: 350, height: 485 },
		tag: "form",
		window: {
			title: "Craft a Project",
			icon: "fa-solid fa-hammer",
			resizable: true,
		},
		form: {
			handler: CraftProjectApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	static override readonly PARTS = {
		"item-summary": { template: "modules/pf2e-heroic-crafting/templates/craftProject/item-summary.hbs" },
		"project-summary": { template: "modules/pf2e-heroic-crafting/templates/craftProject/project-summary.hbs" },
		"material-summary": { template: "modules/pf2e-heroic-crafting/templates/craftProject/material-summary.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	private static handler(
		this: CraftProjectApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		// TODO: Set result
	}

	static async getCraftDetails(
		options: Omit<CraftProjectApplicationOptions, "callback">
	): Promise<ProjectCraftDetails | undefined> {
		return new Promise<ProjectCraftDetails | undefined>((resolve) => {
			const applicationOptions: CraftProjectApplicationOptions = Object.assign(options, { callback: resolve });
			const app = new CraftProjectApplication(applicationOptions);
			app.render(true);
		});
	}

	protected override _onClose(_options: ApplicationClosingOptions): void {
		this.callback(this.result);
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);
		const item = (await foundry.utils.fromUuid(this.itemDetails.itemData.uuid)) as PhysicalItemPF2e;

		const projectCur = this.itemDetails.value;
		const projectMax = getProjectMax(this.itemDetails, item);
		const project = {
			cur: coinsToCoinString(projectCur),
			max: coinsToCoinString(projectMax),
			percent: fractionToPercent(coinsToCopperValue(projectCur), coinsToCopperValue(projectMax)),
		};

		const materials: {
			img: string;
			name: string;
			uuid: string;
		}[] = [];
		if (this.materialTrove) {
			(this.materialTrove as ContainerPF2e).contents
				.filter(
					(troveItem) =>
						!!troveItem.slug &&
						!["material-trove", "generic-crafting-material", "generic-salvage-material"].includes(
							troveItem.slug
						)
				)
				.forEach((troveItem) =>
					materials.push({
						img: troveItem.img,
						name: troveItem.name,
						uuid: troveItem.uuid,
					})
				);
		}

		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-hammer",
				cssClass: "craft-project-button",
				label: "Craft Project",
			},
			{ type: "button", icon: "fa-solid fa-xmark", label: "Cancel", action: "close" },
		];
		return foundry.utils.mergeObject(data, {
			item: {
				name: item.name,
				level: item.level,
				img: item.img,
				quantity: this.itemDetails.batchSize,
			},
			buttons,
			project,
			materials,
			hasMaterialTrove: !!this.materialTrove,
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
}

export function getItemDetails(actor: ActorPF2e, projectId: string) {
	const projects = actor.flags["pf2eHeroicCrafting"].projects as Record<string, ProjectItemDetails>;
	const itemDetails = projects[projectId];
	return itemDetails;
}

export function getProjectMax(itemDetails: ProjectItemDetails, item: PhysicalItemPF2e): Coins {
	return itemDetails.itemData.isFormula
		? copperValueToCoins(FORMULA_PRICE.get(item.level) ?? 0)
		: multCoins(itemDetails.batchSize, item.price.value);
}
