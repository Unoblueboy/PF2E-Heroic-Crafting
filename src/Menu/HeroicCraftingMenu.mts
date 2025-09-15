import { CraftingFormula } from "../../types/src/module/actor/character/crafting";
import { ItemPF2e, PhysicalItemPF2e, TreasurePF2e } from "../../types/src/module/item";
import { ItemInstances } from "../../types/src/module/item/types";
import {
	ApplicationConfiguration,
	ApplicationRenderOptions,
	ApplicationTab,
} from "../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../types/types/foundry/client/applications/api/handlebars-application.mjs";
import { beginProject } from "../BeginProject/beginProject.mjs";
import { BeginProjectDetailsType } from "../BeginProject/types.mjs";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { craftProject } from "../CraftProject/craftProject.mjs";
import { editProject } from "../EditProject/editProject.mjs";
import { forageCraftingResources } from "../Forage/forager.mjs";
import {
	CRAFTING_MATERIAL_SLUG,
	MATERIAL_TROVE_SLUG,
	MATERIAL_TROVE_UUID,
	SALVAGE_MATERIAL_SLUG,
} from "../Helper/constants.mjs";
import { UnsignedCoins } from "../Helper/currencyTypes.mjs";
import { calculateDC } from "../Helper/dc.mjs";
import { getHeroicItemRollOptions } from "../Helper/item.mjs";
import { consoleDebug } from "../Helper/log.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { editMaterialTrove } from "../MaterialTrove/materialTroveHelper.mjs";
import { ProjectContextData, Projects } from "../Projects/projects.mjs";
import { reverseEngineer } from "../ReverseEngineer/reverseEngineer.mjs";
import { ModifyConstantRuleElementHelper } from "../RuleElement/Helpers/ModifyConstantHelper.mjs";
import { salvage } from "../Salvage/salvage.mjs";

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

type ItemType = keyof ItemInstances<CharacterPF2eHeroicCrafting>;

enum HeroCraftingMenuTab {
	BEGIN = "begin",
	CRAFT = "craft",
	SALVAGE = "salvage",
	REVERSE_ENGINEER = "reverse-engineer",
	OTHER = "forage",
	FORMULAS = "formulas",
}

enum HeroCraftingMenuSalvageTab {
	EXISTING = "existing",
	NEW = "new",
}

enum HeroCraftingMenuPart {
	TABS = "tabs",
	CHARACTER_SUMMARY = "character-summary",
}

type HeroCraftingMenuOptions = {
	actor: CharacterPF2eHeroicCrafting;
};

type HeroCraftingMenuCharacterSummaryContext = {
	actor: CharacterPF2eHeroicCrafting;
	money: {
		coinage: UnsignedCoins;
		materials: UnsignedCoins | undefined;
	};
};

type HeroCraftingMenuBeginProjectContext = {
	formulaGroups: {
		level: number;
		formulas: CraftingFormula[];
	}[];
};

type HeroCraftingMenuFormulasContext = {
	formulaGroups: {
		level: number;
		formulas: CraftingFormula[];
	}[];
};

type HeroCraftingMenuSalvageData = {
	id: string;
	img: string;
	level: number;
	name: string;
	dc: number;
	max: UnsignedCoins;
};

type HeroicCraftingMenuTabGroup<T> = {
	tabs: {
		id: T;
		icon?: string;
		label?: string;
		tooltip?: string;
		cssClass?: string;
	}[];
	initial: T;
};

export class HeroCraftingMenu extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	constructor(options: HeroCraftingMenuOptions) {
		super(options as object);
		this.actor = options.actor;
	}

	static override readonly DEFAULT_OPTIONS = {
		classes: ["heroic-crafting-menu"],
		tag: "section",
		window: { title: "Heroic Crafting Menu", icon: "fa-solid fa-pen-ruler", resizable: true },
		actions: {
			"delete-formula": HeroCraftingMenu.deleteFormula,
			"begin-project": HeroCraftingMenu.beginProject,
			"craft-project": HeroCraftingMenu.craftProject,
			salvage: HeroCraftingMenu.salvage,
			"open-actor-sheet": HeroCraftingMenu.openActorSheet,
			"toggle-summary": HeroCraftingMenu.toggleSummary,
			"reverse-engineer": HeroCraftingMenu.reverseEngineer,
			"edit-material-trove": HeroCraftingMenu.editMaterialTrove,
			forage: HeroCraftingMenu.forageResources,
		},
		position: { width: 700, height: 800 },
	};

	static override readonly PARTS: Record<
		HeroCraftingMenuPart | HeroCraftingMenuTab,
		{ template: string; classes: string[]; scrollable?: string[] }
	> = {
		[HeroCraftingMenuPart.CHARACTER_SUMMARY]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/character-summary.hbs",
			classes: ["charcter-summary"],
		},
		[HeroCraftingMenuPart.TABS]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/tab-navigation.hbs",
			classes: ["standard-form"],
		},
		[HeroCraftingMenuTab.FORMULAS]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/formulas.hbs",
			classes: ["formulas"],
			scrollable: [""],
		},
		[HeroCraftingMenuTab.BEGIN]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/begin.hbs",
			classes: ["begin-project"],
			scrollable: [""],
		},
		[HeroCraftingMenuTab.CRAFT]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/craft.hbs",
			classes: ["craft-project"],
			scrollable: [""],
		},
		[HeroCraftingMenuTab.SALVAGE]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/salvage/main.hbs",
			classes: ["salvage"],
			scrollable: ["section.tab.salvage-new", "section.tab.salvage-existing"],
		},
		[HeroCraftingMenuTab.REVERSE_ENGINEER]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/reverse-engineer.hbs",
			classes: ["reverse-engineer"],
			scrollable: [""],
		},
		[HeroCraftingMenuTab.OTHER]: {
			template: "modules/pf2e-heroic-crafting/templates/menu/other.hbs",
			classes: ["other"],
			scrollable: [""],
		},
	};

	static override readonly TABS: {
		primary: HeroicCraftingMenuTabGroup<HeroCraftingMenuTab>;
		salvage: HeroicCraftingMenuTabGroup<HeroCraftingMenuSalvageTab>;
	} = {
		primary: {
			tabs: [
				{ id: HeroCraftingMenuTab.FORMULAS, label: "Formulas" },
				{ id: HeroCraftingMenuTab.BEGIN, label: "Begin a Project" },
				{ id: HeroCraftingMenuTab.CRAFT, label: "Craft a Project" },
				{ id: HeroCraftingMenuTab.SALVAGE, label: "Salvage" },
				{ id: HeroCraftingMenuTab.REVERSE_ENGINEER, label: "Reverse Engineer" },
				{ id: HeroCraftingMenuTab.OTHER, label: "Other" },
			],
			initial: HeroCraftingMenuTab.BEGIN,
		},
		salvage: {
			tabs: [
				{ id: HeroCraftingMenuSalvageTab.NEW, label: "Salvage New", cssClass: "salvage-new" },
				{ id: HeroCraftingMenuSalvageTab.EXISTING, label: "Salvage Existing", cssClass: "salvage-existing" },
			],
			initial: HeroCraftingMenuSalvageTab.NEW,
		},
	};

	static openHeroCraftingMenu(actor?: CharacterPF2eHeroicCrafting | null) {
		actor ??=
			canvas.tokens.controlled.length === 1
				? (canvas.tokens.controlled[0].actor as CharacterPF2eHeroicCrafting)
				: (game.user.character as CharacterPF2eHeroicCrafting | null);
		if (!actor || actor.type !== "character") return;

		new HeroCraftingMenu({ actor: actor }).render(true);
	}

	private static async deleteFormula(this: HeroCraftingMenu, event: Event, target: HTMLElement) {
		consoleDebug(CONFIG.debug.applications, "HeroCraftingMenu.deleteFormula", event, target);

		if (!(event.target instanceof HTMLAnchorElement)) return;
		const itemUuid = target.dataset.itemUuid;
		if (!itemUuid) {
			return;
		}

		const formulas = this.actor.toObject().system.crafting?.formulas ?? [];
		formulas.findSplice((f) => f.uuid === itemUuid);
		return this.actor.update({ "system.crafting.formulas": formulas });
	}

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
		if (!(event.target instanceof HTMLElement)) return;
		const dataElement = event.target.closest("[data-project-action]") as HTMLElement;
		const projectId = target.dataset.projectId;
		if (!projectId) return;
		const project = Projects.getProject(this.actor, projectId);
		switch (dataElement?.dataset?.projectAction) {
			case "craft":
				await craftProject(this.actor, projectId);
				break;
			case "edit":
				await editProject(this.actor, projectId);
				break;
			case "delete":
				await project?.delete();
				break;
			default:
				break;
		}
	}

	private static async salvage(this: HeroCraftingMenu, event: Event, target: HTMLElement) {
		if (!(event.target instanceof HTMLButtonElement)) return;
		const itemId = target.dataset.itemId;
		if (!itemId) {
			await salvage(this.actor);
			return;
		}
		const item = this.actor.items.get<PhysicalItemPF2e<CharacterPF2eHeroicCrafting>>(itemId);
		if (!item) return;
		salvage(this.actor, item, true);
	}

	private static async openActorSheet(this: HeroCraftingMenu, _event: Event, _target: HTMLElement) {
		this.actor.sheet.render(true);
	}

	private static async toggleSummary(this: HeroCraftingMenu, _event: Event, target: HTMLElement) {
		if (target.closest<HTMLElement>("[data-item-uuid]")) {
			await this.toggleGeneralSummary(target);
		} else if (target.closest<HTMLElement>("[data-project-id]")) {
			await this.toggleProjectSummary(target);
		}
	}

	private static async reverseEngineer(this: HeroCraftingMenu, event: Event, target: HTMLElement) {
		if (!(event.target instanceof HTMLButtonElement)) return;
		const itemId = target.dataset.itemId;
		if (!itemId) {
			await reverseEngineer(this.actor);
			return;
		}
		const item = this.actor.items.get<PhysicalItemPF2e<CharacterPF2eHeroicCrafting>>(itemId);
		if (!item) return;
		reverseEngineer(this.actor, item);
	}

	private static async forageResources(this: HeroCraftingMenu, _event: Event, _target: HTMLElement) {
		forageCraftingResources(this.actor);
	}

	private static async editMaterialTrove(this: HeroCraftingMenu, _event: Event, _target: HTMLElement) {
		if (!MaterialTrove.actorHasMaterialTrove(this.actor)) {
			const createTrove = await DialogV2.confirm({
				window: { title: "Create Material Trove" },
				content: "Do you want to create a material trove?",
				rejectClose: false,
				modal: true,
			});

			if (!createTrove) return;

			const materialTrove = (await fromUuid(MATERIAL_TROVE_UUID)) as TreasurePF2e;
			await Item.implementation.create(materialTrove.toObject(), { parent: this.actor });
		}

		await editMaterialTrove(this.actor);
	}

	async toggleGeneralSummary(target: HTMLElement) {
		const parent = target.closest<HTMLElement>("[data-item-uuid]");
		if (!parent) return;

		const itemSummaryElement = parent.querySelector<HTMLElement>(".item-summary");
		if (!itemSummaryElement) return;

		if (!itemSummaryElement.hasAttribute("hidden")) {
			itemSummaryElement.innerHTML = "";
			itemSummaryElement.setAttribute("hidden", "");
			return;
		}

		const itemUuid = parent.dataset.itemUuid;
		if (!itemUuid) return;
		const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(itemUuid);
		if (!item) return;
		const chatData = await item.getChatData();
		const summaryContext = {
			item,
			description: chatData.description,
			identified: game.user.isGM || item.isIdentified,
			isCreature: item.actor?.isOfType("creature"),
			chatData: chatData,
		};

		consoleDebug(CONFIG.debug.applications, "HeroCraftingMenu.toggleGeneralSummary", chatData, summaryContext);
		const summary = await foundry.applications.handlebars.renderTemplate(
			"systems/pf2e/templates/actors/partials/item-summary.hbs",
			summaryContext
		);

		itemSummaryElement.innerHTML = summary;
		itemSummaryElement.removeAttribute("hidden");
	}

	async toggleProjectSummary(target: HTMLElement) {
		const parent = target.closest<HTMLElement>("[data-project-id]");
		if (!parent) return;

		const itemSummaryElement = parent.querySelector<HTMLElement>(".project-item-summary");
		if (!itemSummaryElement) return;

		if (!itemSummaryElement.hasAttribute("hidden")) {
			itemSummaryElement.innerHTML = "";
			itemSummaryElement.setAttribute("hidden", "");
			return;
		}

		const projectId = parent.dataset.projectId;
		if (!projectId) return;
		const project = Projects.getProject(this.actor, projectId);
		if (!project) return;
		const item = await project.baseItem;
		if (!item) return;
		const chatData = await item.getChatData();
		const descriptionValue = await game.pf2e.TextEditor.enrichHTML(await project.description);
		const summaryContext = {
			item,
			description: { ...chatData.description, value: descriptionValue },
			identified: game.user.isGM || item.isIdentified,
			isCreature: item.actor?.isOfType("creature"),
			chatData: chatData,
		};

		consoleDebug(CONFIG.debug.applications, "HeroCraftingMenu.toggleProjectSummary", chatData, summaryContext);
		const summary = await foundry.applications.handlebars.renderTemplate(
			"systems/pf2e/templates/actors/partials/item-summary.hbs",
			summaryContext
		);

		itemSummaryElement.innerHTML = summary;
		itemSummaryElement.removeAttribute("hidden");
	}

	override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & HeroCraftingMenuOptions
	): ApplicationConfiguration {
		const result = super._initializeApplicationOptions(options);
		result.uniqueId = "heroic-crafting-menu-" + options.actor.uuid.replace(".", "-");
		return result;
	}

	override async _onFirstRender(context: object, options: fa.ApplicationRenderOptions) {
		await super._onFirstRender(context, options);
		this.actor.apps[this.id] = this;
	}

	override async _onRender(context: object, options: fa.ApplicationRenderOptions) {
		await super._onRender(context, options);
		new foundry.applications.ux.DragDrop.implementation({
			dragSelector: "[data-is-formula], [data-is-item]",
			dropSelector: ".tab.formulas",
			callbacks: {
				dragstart: (event: DragEvent) => {
					this.onDragStart(event);
				},
				drop: (event: DragEvent) => {
					this.onDrop(event);
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

		if (targetElement && "isItem" in targetElement.dataset) {
			baseDragData.fromInventory = !!targetElement.dataset.fromInventory;
		}

		dataTransfer.setData("text/plain", JSON.stringify(baseDragData));
	}

	private async onDrop(event: DragEvent) {
		const data = game.pf2e.TextEditor.getDragEventData(event);
		consoleDebug(CONFIG.debug.applications, "HeroCraftingMenu onDrop", data);

		if (this.tabGroups.primary !== HeroCraftingMenuTab.FORMULAS) return;

		const item = await (async () => {
			try {
				return await (CONFIG.Item.documentClass as typeof ItemPF2e).fromDropData(data);
			} catch {
				return null;
			}
		})();
		if (item?.isOfType("physical")) {
			const formulas = this.actor.toObject().system.crafting?.formulas ?? [];
			if (!formulas.some((f) => f.uuid === item.uuid)) {
				formulas.push({ uuid: item.uuid });
				await this.actor.update({ "system.crafting.formulas": formulas });
			}
		}
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
			case HeroCraftingMenuPart.CHARACTER_SUMMARY:
				return foundry.utils.mergeObject(context, await this.getCharacterSummaryContext());
			case HeroCraftingMenuTab.BEGIN:
				return foundry.utils.mergeObject(context, await this.getBeginProjectContext());
			case HeroCraftingMenuTab.CRAFT:
				return foundry.utils.mergeObject(context, await this.getCraftProjectContext());
			case HeroCraftingMenuTab.SALVAGE:
				return foundry.utils.mergeObject(context, this.getSalvageContext());
			case HeroCraftingMenuTab.REVERSE_ENGINEER:
				return foundry.utils.mergeObject(context, this.getReverseEngineerContext());
			case HeroCraftingMenuTab.FORMULAS:
				return foundry.utils.mergeObject(context, await this.getFormulasContext());
			case HeroCraftingMenuPart.TABS:
			case HeroCraftingMenuTab.OTHER:
				return context;
			default: {
				const exhaustiveCheck: never = partId;
				throw new Error(`Unhandled color case: ${exhaustiveCheck}`);
			}
		}
	}

	private async getCharacterSummaryContext(): Promise<HeroCraftingMenuCharacterSummaryContext> {
		return {
			actor: this.actor,
			money: {
				coinage: new UnsignedCoinsPF2e(this.actor.inventory.coins),
				materials: (await MaterialTrove.getMaterialTrove(this.actor, false))?.value,
			},
		};
	}

	private async getFormulasContext(): Promise<HeroCraftingMenuFormulasContext> {
		const formulas = await this.actor.crafting.getFormulas();
		const groupedFormulas = Object.groupBy<number, CraftingFormula>(formulas, ({ item }) => item.level) as Record<
			number,
			CraftingFormula[]
		>;
		const levels = Object.keys(groupedFormulas).map((num) => Number.parseInt(num));
		levels.sort((a, b) => b - a);
		const formulaGroups = levels.map((level) => {
			return { level, formulas: groupedFormulas[level] };
		});

		return {
			formulaGroups,
		};
	}

	private async getBeginProjectContext(): Promise<HeroCraftingMenuBeginProjectContext> {
		const formulas = (await this.actor.crafting.getFormulas()).map((formula) => {
			const batchSizeMax = ModifyConstantRuleElementHelper.getConstant(
				this.actor,
				"batchSize",
				{ item: formula.item },
				new Set([
					...this.actor.getRollOptions(),
					...getHeroicItemRollOptions(formula.item),
					"action:begin-project",
				])
			);
			const formulaData = foundry.utils.deepClone(formula);
			formulaData.batchSize = batchSizeMax;
			return formulaData;
		});
		const groupedFormulas = Object.groupBy<number, CraftingFormula>(formulas, ({ item }) => item.level) as Record<
			number,
			CraftingFormula[]
		>;
		const levels = Object.keys(groupedFormulas).map((num) => Number.parseInt(num));
		levels.sort((a, b) => b - a);
		const formulaGroups = levels.map((level) => {
			return { level, formulas: groupedFormulas[level] };
		});

		return {
			formulaGroups,
		};
	}

	private async getCraftProjectContext(): Promise<{ projects: ProjectContextData[] }> {
		return {
			projects: (await Projects.getProjects(this.actor)?.getContextData()) ?? [],
		};
	}

	private getSalvageContext(): {
		salvages: HeroCraftingMenuSalvageData[];
		salvageTabs: Record<string, ApplicationTab>;
		itemGroups: { name: string; items: PhysicalItemPF2e[] }[];
	} {
		const salvageItems = this.actor.itemTypes.treasure.filter(
			(x: TreasurePF2e) => x.slug && x.slug === SALVAGE_MATERIAL_SLUG
		);
		const itemGroups: { name: string; items: PhysicalItemPF2e[] }[] = this.getItemGroups();
		const salvageData = salvageItems.map((x: TreasurePF2e) => {
			return {
				id: x.id,
				img: x.img,
				level: x.level,
				name: x.name,
				dc: calculateDC(x.level, x.rarity),
				max: x.price.value,
			};
		});
		return {
			salvages: salvageData.toSorted((a, b) => a.level - b.level),
			salvageTabs: this._prepareTabs("salvage"),
			itemGroups,
		};
	}

	private getItemGroups() {
		const itemGroups: { name: string; items: PhysicalItemPF2e[] }[] = [];

		for (const itemType of [["weapon", "shield"], "armor", "equipment", "consumable", "treasure", "backpack"] as (
			| ItemType
			| ItemType[]
		)[]) {
			const allItems = Array.isArray(itemType)
				? itemType.flatMap((it) => this.actor.itemTypes[it])
				: this.actor.itemTypes[itemType];
			const items = allItems.filter(
				(item) =>
					!(
						item.slug &&
						[MATERIAL_TROVE_SLUG, SALVAGE_MATERIAL_SLUG, CRAFTING_MATERIAL_SLUG].includes(item.slug)
					)
			);
			if (items.length === 0) continue;
			itemGroups.push({
				name: this.getItemGroupName(itemType),
				items: items,
			});
		}
		return itemGroups;
	}

	private getItemGroupName(itemType: ItemType | ItemType[]): string {
		if (itemType instanceof Array) {
			return itemType.map((t) => game.i18n.localize(`TYPES.Item.${t}`)).join(" & ");
		}
		return game.i18n.localize(`TYPES.Item.${itemType}`);
	}

	private getReverseEngineerContext() {
		return {
			itemGroups: this.getItemGroups(),
		};
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);
		consoleDebug(CONFIG.debug.applications, "HeroCraftingMenu._prepareContext", data);
		return foundry.utils.mergeObject(data, {
			tabs: this._prepareTabs("primary"),
			rootId: this.id,
		});
	}

	override async _preRender(context: object, options: ApplicationRenderOptions) {
		await super._preRender(context, options);
		await foundry.applications.handlebars.loadTemplates([
			"modules/pf2e-heroic-crafting/templates/menu/salvage/tabs/existing.hbs",
			"modules/pf2e-heroic-crafting/templates/menu/salvage/tabs/new.hbs",
			"modules/pf2e-heroic-crafting/templates/menu/salvage/tab-navigation.hbs",
		]);
	}
}
