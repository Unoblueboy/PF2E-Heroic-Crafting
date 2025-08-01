import { CharacterPF2e } from "../../types/src/module/actor";
import { CraftingFormula } from "../../types/src/module/actor/character/crafting";
import { PhysicalItemPF2e, TreasurePF2e } from "../../types/src/module/item";
import {
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { beginProject } from "../BeginProject/beginProject.mjs";
import { BeginProjectDetailsType } from "../BeginProject/types.mjs";
import { craftProject } from "../CraftProject/craftProject.mjs";
import { SALVAGE_MATERIAL_SLUG } from "../Helper/constants.mjs";
import { calculateDC } from "../Helper/dc.mjs";
import { Projects } from "../Projects/projects.mjs";
import { salvage } from "../Salvage/salvage.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

enum HeroCraftingMenuTab {
	BEGIN = "begin",
	CRAFT = "craft",
	SALVAGE = "salvage",
	OTHER = "other",
}

enum HeroCraftingMenuPart {
	TABS = "tabs",
}

type HeroCraftingMenuOptions = {
	actor: CharacterPF2e;
};

export class HeroCraftingMenu extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2e;
	constructor(options: HeroCraftingMenuOptions) {
		super(options as object);
		this.actor = options.actor;
	}

	static override readonly DEFAULT_OPTIONS = {
		classes: ["heroic-crafting-menu"],
		tag: "section",
		window: { title: "Heroic Crafting Menu", icon: "fa-solid fa-pen-ruler", resizable: true },
		actions: {
			"begin-project": HeroCraftingMenu.beginProject,
			"craft-project": HeroCraftingMenu.craftProject,
			salvage: HeroCraftingMenu.salvage,
		},
		position: { width: 700 },
	};

	static override readonly PARTS = {
		[HeroCraftingMenuPart.TABS]: { template: "templates/generic/tab-navigation.hbs", classes: ["standard-form"] },
		[HeroCraftingMenuTab.BEGIN]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/begin.hbs",
			classes: ["begin-project"],
		},
		[HeroCraftingMenuTab.CRAFT]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/craft.hbs",
			classes: ["craft-project"],
		},
		[HeroCraftingMenuTab.SALVAGE]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/salvage.hbs",
			classes: ["salvage"],
		},
		[HeroCraftingMenuTab.OTHER]: { template: "modules/pf2e-heroic-crafting/templates/menu/other.hbs" },
	};

	static override readonly TABS = {
		primary: {
			tabs: [
				{ id: HeroCraftingMenuTab.BEGIN, label: "Begin a Project" },
				{ id: HeroCraftingMenuTab.CRAFT, label: "Craft a Project" },
				{ id: HeroCraftingMenuTab.SALVAGE, label: "Salvage" },
				{ id: HeroCraftingMenuTab.OTHER, label: "Other" },
			],
			initial: HeroCraftingMenuTab.BEGIN,
		},
	};

	private static async beginProject(this: HeroCraftingMenu, event: Event, target: HTMLElement) {
		if (!(event.target instanceof HTMLButtonElement)) return;
		const itemUuid = target.dataset.itemUuid;
		if (!itemUuid) {
			beginProject(this.actor);
			return;
		}

		await beginProject(this.actor, { type: BeginProjectDetailsType.PARTIAL, itemUuid: itemUuid });
	}

	private static async craftProject(this: HeroCraftingMenu, event: Event, target: HTMLElement) {
		if (!(event.target instanceof HTMLButtonElement)) return;
		const projectId = target.dataset.projectId;
		if (!projectId) return;
		switch (event.target?.dataset?.projectAction) {
			case "craft":
				craftProject(this.actor, projectId);
				break;
			case "edit":
				// TODO: Add the ability to edit a project
				break;
			default:
				break;
		}
	}

	private static async salvage(this: HeroCraftingMenu, event: Event, target: HTMLElement) {
		if (!(event.target instanceof HTMLButtonElement)) return;
		const salvageId = target.dataset.salvageId;
		if (!salvageId) {
			await salvage(this.actor);
			return;
		}
		const item = this.actor.items.get<PhysicalItemPF2e<CharacterPF2e>>(salvageId);
		if (!item) return;
		salvage(this.actor, item, true);
	}

	override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & HeroCraftingMenuOptions
	): ApplicationConfiguration {
		console.log(options);
		const result = super._initializeApplicationOptions(options);
		console.log(result);
		result.uniqueId = "heroic-crafting-menu-" + options.actor.uuid.replace(".", "-");
		console.log(result);
		return result;
	}

	override async _onFirstRender(context: object, options: fa.ApplicationRenderOptions) {
		await super._onFirstRender(context, options);
		this.actor.apps[this.id] = this;
	}

	override async _onRender(context: object, options: fa.ApplicationRenderOptions) {
		await super._onRender(context, options);
		new foundry.applications.ux.DragDrop.implementation({
			dragSelector: "[data-is-formula]",
			callbacks: {
				dragstart: (event: DragEvent) => {
					this.onDragStart(event);
				},
			},
		}).bind(this.element);
	}

	private onDragStart(event: DragEvent) {
		const { dataTransfer, target: targetElement } = event;
		if (!(targetElement instanceof HTMLElement) || !dataTransfer) return;

		const itemId = targetElement?.dataset.itemId;
		const item = this.actor.items.get(itemId ?? "");

		const baseDragData: { [key: string]: unknown } = {
			actorId: this.actor.id,
			actorUUID: this.actor.uuid,
			sceneId: canvas.scene?.id ?? null,
			tokenId: this.actor.token?.id ?? null,
			...item?.toDragData(),
		};

		if (targetElement && "isFormula" in targetElement.dataset) {
			baseDragData.isFormula = true;
			baseDragData.ability = targetElement.dataset.ability;
			baseDragData.uuid = targetElement.dataset.itemUuid;
		}

		dataTransfer.setData("text/plain", JSON.stringify(baseDragData));
	}

	override _onClose(options: fa.ApplicationClosingOptions) {
		super._onClose(options);
		delete this.actor.apps[this.id];
	}

	override async _preparePartContext(
		partId: HeroCraftingMenuPart | HeroCraftingMenuTab,
		context: Record<string, unknown>,
		options: HandlebarsRenderOptions
	) {
		context = (await super._preparePartContext(partId, context, options)) as Record<string, unknown>;
		context = foundry.utils.mergeObject(context, {
			partId: `${this.id}-${partId}`,
			tab: (context.tabs as Record<string, unknown>)[partId],
		});
		switch (partId) {
			case HeroCraftingMenuTab.BEGIN:
				context = foundry.utils.mergeObject(context, {
					formulaGroups: await this.getFormulaGroups(),
				});
				break;
			case HeroCraftingMenuTab.CRAFT:
				context = foundry.utils.mergeObject(context, {
					projects: (await Projects.getProjects(this.actor)?.getContextData()) ?? [],
				});
				break;
			case HeroCraftingMenuTab.SALVAGE:
				context = foundry.utils.mergeObject(context, {
					salvages: this.actor.itemTypes.treasure
						.filter((x: TreasurePF2e) => x.slug && x.slug === SALVAGE_MATERIAL_SLUG)
						.map((x: TreasurePF2e) => {
							return {
								id: x.id,
								img: x.img,
								level: x.level,
								name: x.name,
								dc: calculateDC(x.level, x.rarity),
								max: x.price.value,
							};
						})
						.toSorted((a, b) => a.level - b.level),
				});
				break;

			default:
				break;
		}
		return context;
	}

	async getFormulaGroups() {
		const formulas = await this.actor.crafting.getFormulas();
		return Object.entries(Object.groupBy(formulas, ({ item }: CraftingFormula) => item.level))
			.toSorted(([k1, _v1], [k2, _v2]) => Number.parseInt(k2) - Number.parseInt(k1))
			.map(([level, formulas]) => {
				return { level, formulas };
			});
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);
		return foundry.utils.mergeObject(data, {
			rootId: this.id,
		});
	}
}
