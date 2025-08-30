import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../../types/src/module/item";
import {
	ApplicationClosingOptions,
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { CRAFTING_MATERIAL_SLUG, MATERIAL_TROVE_SLUG, SALVAGE_MATERIAL_SLUG } from "../../Helper/constants.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ReverseEngineerApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	callback: (
		result:
			| {
					uuid: string;
			  }
			| undefined
	) => void;
};

export class ReverseEngineerApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	result?: { uuid: string };
	item?: PhysicalItemPF2e;
	callback: (result: { uuid: string } | undefined) => void;
	constructor(options: ReverseEngineerApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.callback = options.callback;
	}

	static override readonly DEFAULT_OPTIONS = {
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
		"drag-drop": { template: "modules/pf2e-heroic-crafting/templates/reverseEngineer/drag-drop.hbs" },
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

	protected override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & ReverseEngineerApplicationOptions
	): ApplicationConfiguration {
		const data = super._initializeApplicationOptions(options);
		data.uniqueId = `reverse-engineer-Actor-${options.actor.id}`;
		return data;
	}

	override async render(options?: boolean | ApplicationRenderOptions): Promise<this> {
		await this.verifyItemExistence();
		return await super.render(options);
	}

	private async verifyItemExistence() {
		if (!this.item) return;
		this.item =
			(await this.getItem({
				type: "item",
				uuid: this.item.uuid,
			})) ?? undefined;
	}

	override async _onFirstRender(context: object, options: ApplicationRenderOptions) {
		await super._onFirstRender(context, options);
		this.actor.apps[this.id] = this;
	}

	protected override _onClose(options: ApplicationClosingOptions): void {
		super._onClose(options);
		this.callback(this.result);
		delete this.actor.apps[this.id];
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
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-gear-complex",
				cssClass: "reverse-engineer-button",
				label: "Reverse Engineer",
				disabled: !this.item,
			},
			{ type: "button", icon: "fa-solid fa-xmark", label: "Cancel", action: "close" },
		];
		console.log(
			this.item ?? {
				img: "systems/pf2e/icons/actions/craft/unknown-item.webp",
				name: "Drag item here...",
				level: "??",
			}
		);
		return {
			...data,
			buttons,
			item: this.item ?? {
				img: "systems/pf2e/icons/actions/craft/unknown-item.webp",
				name: "Drag item here...",
				level: "??",
			},
		};
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

		this.render();
	}

	async getItem(data: Record<string, JSONValue>): Promise<PhysicalItemPF2e | null> {
		if (typeof data.type === "string" && data.type?.toLowerCase() !== "item") {
			ui.notifications.info("Only items can be reverse engineered");
			return null;
		}

		const item = await (async () => {
			try {
				return await CONFIG.PF2E.Item.documentClasses.armor.fromDropData<ItemPF2e>(data);
			} catch {
				return null;
			}
		})();

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
}
