import { ActorPF2e } from "../../../types/src/module/actor";
import {
	ConsumablePF2e,
	ItemPF2e,
	PhysicalItemPF2e,
	SpellPF2e,
	TreasurePF2e,
	WeaponPF2e,
} from "../../../types/src/module/item";
import { Coins } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/_module.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { coinsToCoinString, coinsToCopperValue, copperValueToCoins } from "../../Helper/currency.mjs";
import { calculateDC } from "../../Helper/dc.mjs";
import { BeginProjectUpdateDetailsOptions, ProjectItemDetails } from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type BeginProjectApplicationOptions = {
	actor: ActorPF2e;
	callback: (result: ProjectItemDetails | undefined) => void;
	itemSettings?: {
		formula?: {
			defaultValue: boolean;
			include: boolean;
		};
		lockItem?: boolean;
		item?: PhysicalItemPF2e;
		checkFromInventory?: boolean;
	};
};

export class BeginProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: ActorPF2e;
	callback: (result: ProjectItemDetails | undefined) => void;
	includeIsFormula: boolean;
	isFormulaDefaultValue: boolean;
	lockItem: boolean;
	checkFromInventory: boolean;
	result?: ProjectItemDetails;
	item?: PhysicalItemPF2e;
	spell?: SpellPF2e;
	constructor(options: BeginProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.callback = options.callback;
		this.includeIsFormula = options.itemSettings?.formula?.include ?? true;
		this.isFormulaDefaultValue = options.itemSettings?.formula?.defaultValue ?? false;
		this.lockItem = options.itemSettings?.lockItem ?? false;
		this.item = options.itemSettings?.item;
		this.checkFromInventory = options.itemSettings?.checkFromInventory ?? false;
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
		actions: {
			"click-is-formula": BeginProjectApplication.clickIsFormula,
			"increase-summary-batch-size": BeginProjectApplication.increaseSummaryBatchSize,
			"decrease-summary-batch-size": BeginProjectApplication.decreaseSummaryBatchSize,
		},
	};

	static override readonly PARTS = {
		"drag-drop": { template: "modules/pf2e-heroic-crafting/templates/beginProject/drag-drop.hbs" },
		summary: { template: "modules/pf2e-heroic-crafting/templates/beginProject/summary.hbs" },
		footer: { template: "templates/generic/form-footer.hbs", classes: ["footer-button-panel"] },
	};

	private static handler(
		this: BeginProjectApplication,
		_event: Event,
		_form: HTMLFormElement,
		_formData: FormDataExtended
	) {
		if (!this.item) return;

		const isFormula = this.includeIsFormula
			? (_formData.object["summary-is-formula"] as boolean)
			: this.isFormulaDefaultValue;
		this.result = {
			dc: _formData.object["summary-dc"] as number,
			batchSize: _formData.object["summary-batch-size"] as number,
			itemData: {
				uuid: this.item.uuid,
				isFormula: isFormula,
			},
			value: {}, // TODO: Get the starting value
		};

		if (!this.spell) return;
		this.result.itemData.spellUuid = this.spell.uuid;
		this.result.itemData.heightenedLevel = getGenericScrollOrWandRank(this.item as ConsumablePF2e);
	}

	static async GetItemDetails(
		options: Omit<BeginProjectApplicationOptions, "callback">
	): Promise<ProjectItemDetails | undefined> {
		return new Promise<ProjectItemDetails | undefined>((resolve) => {
			const applicationOptions: BeginProjectApplicationOptions = Object.assign(options, { callback: resolve });
			const app = new BeginProjectApplication(applicationOptions);
			app.render(true);
		});
	}

	private static async clickIsFormula(this: BeginProjectApplication, _event: Event, _target: HTMLElement) {
		this.updateDetails();
	}

	private static async increaseSummaryBatchSize(this: BeginProjectApplication, _event: Event, _target: HTMLElement) {
		const batchSizeInput = this.element.querySelector<HTMLInputElement>(".summary-batch-size");
		if (batchSizeInput) {
			const batchSize = Number.parseInt(batchSizeInput.value) + 1;
			const batchMax = Number.parseInt(batchSizeInput.max) || Infinity;
			batchSizeInput.value = Math.min(batchSize, batchMax).toString();
		}
	}

	private static async decreaseSummaryBatchSize(this: BeginProjectApplication, _event: Event, _target: HTMLElement) {
		const batchSizeInput = this.element.querySelector<HTMLInputElement>(".summary-batch-size");
		if (batchSizeInput) {
			const batchSize = Number.parseInt(batchSizeInput.value) - 1;
			const batchMin = Number.parseInt(batchSizeInput.min);
			batchSizeInput.value = Math.max(batchSize, batchMin).toString();
		}
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
		// "update-money-group": BeginProjectApplication.updateMoneyGroup,
		const moneyGroupDiv = this.element.querySelector<HTMLElement>("div[data-action='update-money-group']");
		if (moneyGroupDiv) {
			moneyGroupDiv.addEventListener("change", (event: Event) => this.updateStartingValueFromEvent(event));
		}
		const updateDetailsOptions: BeginProjectUpdateDetailsOptions = {};
		if (this.item && options.isFirstRender) {
			updateDetailsOptions.itemDropped = true;
		}
		this.updateDetails(updateDetailsOptions);
	}

	private updateStartingValueFromEvent(event: Event) {
		this.updateStartingValueFromElement(event.currentTarget as HTMLElement);
	}

	private updateStartingValueFromElement(element: HTMLElement) {
		const currentStartingValue: Coins = this.getCurrentStartingValue();
		const inputs = element.querySelectorAll<HTMLInputElement>("input");

		const maxStartingValue = this.getMaxStartingValue();
		const maxStartingValueCopper = coinsToCopperValue(maxStartingValue);
		if (maxStartingValueCopper < coinsToCopperValue(currentStartingValue)) {
			this.setMoneyGroupMax(inputs, maxStartingValue);
		}
		this.updateStartingValueText();
	}

	private updateStartingValueFromNothing() {
		const element = this.element.querySelector<HTMLElement>(".begin-project-start-summary .money-group");
		if (!element) return;
		this.updateStartingValueFromElement(element);
	}

	private setMoneyGroupMax(inputs: NodeListOf<HTMLInputElement>, maxStartingValue: Coins) {
		for (const input of inputs) {
			switch (input.name) {
				case "summary-starting-pp":
					input.value = (maxStartingValue.pp ?? 0).toString();
					break;
				case "summary-starting-gp":
					input.value = (maxStartingValue.gp ?? 0).toString();
					break;
				case "summary-starting-sp":
					input.value = (maxStartingValue.sp ?? 0).toString();
					break;
				case "summary-starting-cp":
					input.value = (maxStartingValue.cp ?? 0).toString();
					break;
				default:
					break;
			}
		}
	}

	private getCurrentStartingValue(): Coins {
		const inputs = this.element.querySelectorAll<HTMLInputElement>(
			".begin-project-start-summary .money-group input"
		);
		const coins: Coins = {};
		for (const input of inputs) {
			switch (input.name) {
				case "summary-starting-pp":
					coins.pp = Number.parseInt(input.value) || 0;
					break;
				case "summary-starting-gp":
					coins.gp = Number.parseInt(input.value) || 0;
					break;
				case "summary-starting-sp":
					coins.sp = Number.parseInt(input.value) || 0;
					break;
				case "summary-starting-cp":
					coins.cp = Number.parseInt(input.value) || 0;
					break;
				default:
					break;
			}
		}
		return coins;
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-compass-drafting",
				cssClass: "begin-project-button",
				label: "Begin Project",
				disabled: true,
			},
			{ type: "button", icon: "fa-solid fa-xmark", label: "Cancel", action: "close" },
		];
		return foundry.utils.mergeObject(data, {
			buttons,
			includeIsFormula: this.includeIsFormula,
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

	protected async onDrop(event: DragEvent) {
		const currentTarget = event.currentTarget as HTMLElement;
		const classes = currentTarget.classList;
		const data = game.pf2e.TextEditor.getDragEventData(event);
		const options: BeginProjectUpdateDetailsOptions = {};

		if (classes.contains("item-drop")) {
			const item = await this.getItem(data);
			if (item && (!this.item || (this.item && !this.lockItem))) {
				this.item = item;
				options.itemDropped = true;
			}
		} else if (classes.contains("spell-drop")) {
			const spell = await this.getSpell(data);
			if (spell) {
				this.spell = spell;
			}
		}

		this.updateDetails(options);
	}

	private async getItem(data: Record<string, JSONValue>): Promise<PhysicalItemPF2e | null> {
		const item = await CONFIG.PF2E.Item.documentClasses.armor.fromDropData<ItemPF2e>(data);

		if (!item) return null;
		if (!item.isOfType("physical")) {
			ui.notifications.info("Only physical items can be crafted");
			return null;
		}
		if (item.isOfType("treasure") && (item as TreasurePF2e).isCoinage) {
			ui.notifications.info("Coins cannot be crafted");
			return null;
		}
		if (
			item.slug &&
			["material-trove", "generic-crafting-material", "generic-salvage-material"].includes(item.slug)
		) {
			ui.notifications.info(`${item.name} cannot be crafted`);
			return null;
		}
		console.log(data);
		if (this.checkFromInventory && !data.fromInventory) {
			ui.notifications.info("Items must be from an actors inventory");
			return null;
		}
		if (this.checkFromInventory && item.actor != this.actor) {
			ui.notifications.info(`Items must be from ${this.actor.name}'s inventory`);
			return null;
		}

		return item;
	}

	private async getSpell(data: Record<string, JSONValue>): Promise<SpellPF2e | null> {
		const isFormulaCheckbox = this.element.querySelector<HTMLInputElement>(".is-formula-checkbox");
		if (isFormulaCheckbox?.checked) {
			return null;
		}

		const spell = await CONFIG.PF2E.Item.documentClasses.spell.fromDropData(data);

		if (!spell) return null;
		if (!spell.isOfType("spell")) {
			ui.notifications.info("Please drop a spell here");
			return null;
		}

		if (spell.isCantrip) {
			ui.notifications.info(`${this.item?.name} cannot contain cantrips`);
			return null;
		}

		if (spell.isFocusSpell) {
			ui.notifications.info(`${this.item?.name} cannot contain focus spells`);
			return null;
		}

		if (spell.isRitual) {
			ui.notifications.info(`${this.item?.name} cannot contain rituals`);
			return null;
		}

		const itemSpellRank = getGenericScrollOrWandRank(this.item as ConsumablePF2e);
		if (itemSpellRank < spell.rank) {
			ui.notifications.info(`Spell rank is higher than what can be contained in a ${this.item?.name}`);
			return null;
		}
		return spell;
	}

	private updateDetails(options: BeginProjectUpdateDetailsOptions = {}) {
		this.updateItemDragDropDiv();
		this.updateSpellDragDropDiv();

		if (options.itemDropped) {
			this.updateDcInput();
			this.updateBatchSizeInput();
			this.updateStartingValueFromNothing();
		}

		const submitButton = this.element.querySelector<HTMLButtonElement>(
			".footer-button-panel .begin-project-button"
		);
		if (!submitButton) return;
		submitButton.disabled = !this.item;
	}

	private updateItemDragDropDiv() {
		const itemDragDropDiv = this.element.querySelector<HTMLDivElement>(".drop-item-zone.item-drop");
		if (!itemDragDropDiv) return;

		const itemIconImg = itemDragDropDiv.querySelector<HTMLImageElement>(".item-icon");
		if (itemIconImg) {
			itemIconImg.src = this.item ? this.item.img : "systems/pf2e/icons/actions/craft/unknown-item.webp";
		}
		const itemNameInput = itemDragDropDiv.querySelector<HTMLInputElement>(".item-name");
		if (itemNameInput) {
			itemNameInput.value = this.item ? this.item.name : "Drag item here...";
		}
		const itemLevelInput = itemDragDropDiv.querySelector<HTMLInputElement>(".item-level");
		if (itemLevelInput) {
			itemLevelInput.value = this.item ? String(this.item.level).padStart(2, "0") : "??";
		}
	}

	private updateSpellDragDropDiv() {
		const spellDragDropDiv = this.element.querySelector<HTMLDivElement>(".drop-item-zone.spell-drop");
		if (!spellDragDropDiv) return;

		const isFormulaCheckbox = this.element.querySelector<HTMLInputElement>(".summary-is-formula");
		const isFormula = this.includeIsFormula ? isFormulaCheckbox?.checked : this.isFormulaDefaultValue;
		if (isFormula) {
			spellDragDropDiv.classList.add("hide");
			return;
		}
		if (!this.item) {
			spellDragDropDiv.classList.add("hide");
			return;
		}
		if (!this.item.isOfType("consumable")) {
			spellDragDropDiv.classList.add("hide");
			return;
		}
		if (!isGenericScrollOrWand(this.item)) {
			spellDragDropDiv.classList.add("hide");
			return;
		}
		const spellIconImg = spellDragDropDiv.querySelector<HTMLImageElement>(".spell-icon");
		if (spellIconImg) {
			spellIconImg.src = this.spell ? this.spell.img : "systems/pf2e/icons/actions/craft/unknown-item.webp";
		}
		const spellNameInput = spellDragDropDiv.querySelector<HTMLInputElement>(".spell-name");
		if (spellNameInput) {
			spellNameInput.value = this.spell ? this.spell.name : "Drag Spell here...";
		}
		const spellLevelInput = spellDragDropDiv.querySelector<HTMLInputElement>(".spell-rank");
		if (spellLevelInput) {
			spellLevelInput.value = this.spell ? String(this.spell.rank).padStart(2, "0") : "??";
		}
		spellDragDropDiv.classList.remove("hide");
	}

	private updateDcInput() {
		if (!this.item) return;
		const dcInput = this.element.querySelector<HTMLInputElement>(".summary-dc");
		if (dcInput) {
			const dc = calculateDC(this.item.level, this.item.rarity);
			dcInput.value = dc.toString();
		}
	}

	private updateBatchSizeInput() {
		if (!this.item) return;
		const batchSizeInput = this.element.querySelector<HTMLInputElement>(".summary-batch-size");
		if (batchSizeInput) {
			const isAmmo = this.item.isOfType("consumable") && (this.item as ConsumablePF2e).isAmmo;
			const isMundaneAmmo = isAmmo && !this.item.isMagical;
			const isConsumable =
				(this.item.isOfType("consumable") && (this.item as ConsumablePF2e).category !== "wand") ||
				(this.item.isOfType("weapon") && (this.item as WeaponPF2e).baseType === "alchemical-bomb");

			const magicalAmmo = isConsumable && !isAmmo ? 4 : 1;
			const batchSize = Math.max(
				this.item.system.price.per,
				isMundaneAmmo ? Math.clamp(this.item.system.price.per, 1, 10) : magicalAmmo
			);
			batchSizeInput.value = batchSize.toString();
			batchSizeInput.max = batchSize.toString();
		}
	}

	private updateStartingValueText() {
		if (!this.item) return;

		const startingValuesSpan = this.element.querySelector<HTMLSpanElement>(
			".begin-project-start-summary .begin-project-start-values-coins"
		);
		if (!startingValuesSpan) return;
		const maxStartingValue = this.getMaxStartingValue();
		startingValuesSpan.textContent = `${coinsToCoinString(this.getCurrentStartingValue())} / ${coinsToCoinString(
			maxStartingValue
		)}`;
	}

	private getMaxStartingValue(): Coins {
		if (!this.item) return {};
		const maxStartingValueCopper = Math.floor(this.item.price.value.copperValue / 2);
		return copperValueToCoins(maxStartingValueCopper);
	}
}

const consumableMagicSlugs = [
	"scroll-of",
	"magic-wand",
	"wand-of-mercy",
	"wand-of-legerdemain",
	"wand-of-reaching",
	"wand-of-widening",
	"wand-of-continuation",
];

function isGenericScrollOrWand(item: PhysicalItemPF2e) {
	if (!["wand", "scroll"].includes((item as ConsumablePF2e).category)) {
		return false;
	}
	if (!consumableMagicSlugs.some((slugStart) => item.slug?.startsWith(slugStart))) {
		return false;
	}
	return true;
}

function getGenericScrollOrWandRank(item: ConsumablePF2e) {
	const containedSpellRankString = /(\d+)(?=((st)|(nd)|(rd)|(th)))/.exec(item.name) ?? ["1"];
	const containedSpellRank = Number.parseInt(containedSpellRankString[0]) || 1;
	return containedSpellRank;
}
