import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../../types/src/module/item";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { CRAFTING_MATERIAL_SLUG, MATERIAL_TROVE_SLUG, SALVAGE_MATERIAL_SLUG } from "../../Helper/constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// TODO: refactor to update on actor update
export class ReverseEngineerApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	result?: { uuid: string };
	item?: PhysicalItemPF2e;
	callback: (result: { uuid: string } | undefined) => void;
	constructor(options: {
		actor: CharacterPF2eHeroicCrafting;
		callback: (result: { uuid: string } | undefined) => void;
	}) {
		super(options as object);
		this.actor = options.actor;
		this.callback = options.callback;
	}

	static override readonly DEFAULT_OPTIONS = {
		id: "reverse-engineer",
		classes: ["reverse-engineer-dialog"],
		position: { width: 350 },
		tag: "form",
		window: {
			title: "Reverse Engineer",
			icon: "fa-solid fa-gear-complex",
		},
		form: {
			handler: ReverseEngineerApplication.handler,
			submitOnChange: false,
			closeOnSubmit: true,
		},
	};

	static override readonly PARTS = {
		"drag-drop": { template: "modules/pf2e-heroic-crafting/templates/salvage/drag-drop.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	private static handler(
		this: ReverseEngineerApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		if (!this.item) return;

		this.result = { uuid: this.item.uuid };
	}

	static async GetItemUuid(actor: CharacterPF2eHeroicCrafting): Promise<{ uuid: string } | undefined> {
		return new Promise<{ uuid: string } | undefined>((resolve) => {
			const app = new ReverseEngineerApplication({ actor, callback: resolve });
			app.render(true);
		});
	}

	protected override _onClose(_options: ApplicationClosingOptions): void {
		this.callback(this.result);
	}

	protected override async _onRender(context: object, options: ApplicationRenderOptions) {
		super._onRender(context, options);
		new foundry.applications.ux.DragDrop.implementation({
			dropSelector: ".drop-item-zone",
			callbacks: {
				drop: (event: DragEvent) => {
					this.onDrop(event);
				},
			},
		}).bind(this.element);

		this.updateDetails();
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-gear-complex",
				cssClass: "reverse-engineer-button",
				label: "Reverse Engineer",
				disabled: true,
			},
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
		return context;
	}

	private async onDrop(event: DragEvent) {
		const data = game.pf2e.TextEditor.getDragEventData(event);

		const item = await this.getItem(data);
		if (!item) return;

		this.item = item;

		this.updateDetails();
	}

	async getItem(data: Record<string, JSONValue>): Promise<PhysicalItemPF2e | null> {
		if (typeof data.type === "string" && data.type?.toLowerCase() != "item") {
			ui.notifications.info("Only items can be reverse engineered");
			return null;
		}

		const item = await CONFIG.PF2E.Item.documentClasses.armor.fromDropData<ItemPF2e>(data);

		if (!item) return null;
		if (!data.fromInventory && !item.parent) {
			ui.notifications.info("Only items from an actors inventory can be reverse engineered");
			return null;
		}
		if (!item.sourceId) {
			ui.notifications.info("Only items with a sourceId can be reverse engineered");
			return null;
		}
		if (!item.isOfType("physical")) {
			ui.notifications.info("Only physical items can be reverse engineered");
			return null;
		}
		if (item.isOfType("treasure") && (item as TreasurePF2e).isCoinage) {
			ui.notifications.info("Coins cannot be salvaged");
			return null;
		}
		if (item.slug && [MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(item.slug)) {
			ui.notifications.info(`${item.name} cannot be reverse engineered`);
			return null;
		}
		if (this.actor && this.actor != item.parent) {
			ui.notifications.info(`Item must be from ${this.actor.name}`);
			return null;
		}

		return item;
	}

	private updateDetails() {
		this.UpdateDragDropDiv();

		const submitButton = this.element.querySelector<HTMLButtonElement>(
			".footer-button-panel .reverse-engineer-button"
		);
		if (!submitButton) return;
		submitButton.disabled = !this.item;
	}

	private UpdateDragDropDiv() {
		if (!this.item) return;

		const dragDropDiv = this.element.querySelector<HTMLDivElement>(".drop-item-zone");
		if (!dragDropDiv) return;

		const itemIconImg = dragDropDiv.querySelector<HTMLImageElement>(".item-icon");
		if (itemIconImg) itemIconImg.src = this.item.img;
		const itemNameSpan = dragDropDiv.querySelector<HTMLSpanElement>(".item-name");
		if (itemNameSpan) itemNameSpan.textContent = this.item.name;

		const itemLevelSpan = dragDropDiv.querySelector<HTMLSpanElement>(".item-level");
		if (itemLevelSpan) itemLevelSpan.textContent = String(this.item.level).padStart(2, "0");
	}
}
