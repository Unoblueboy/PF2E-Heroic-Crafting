import {
	ConsumablePF2e,
	ItemPF2e,
	PhysicalItemPF2e,
	SpellPF2e,
	TreasurePF2e,
	WeaponPF2e,
} from "../../../types/src/module/item";
import { Coins, CoinsPF2e } from "../../../types/src/module/item/physical";
import {
	ApplicationClosingOptions,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/_module.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { CRAFTING_MATERIAL_SLUG, MATERIAL_TROVE_SLUG, SALVAGE_MATERIAL_SLUG } from "../../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../../Helper/currency.mjs";
import { calculateDC } from "../../Helper/dc.mjs";
import { MaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import { BeginProjectStartingValues } from "../types.mjs";
import { BeginProjectFullDetails } from "../types.mjs";
import { BeginProjectDetailsType } from "../types.mjs";
import { BeginProjectUpdateDetailsOptions } from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type BeginProjectApplicationOptions = {
	actor: CharacterPF2eHeroicCrafting;
	callback: (result: BeginProjectFullDetails | undefined) => void;
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

// TODO: refactor to update on actor update
export class BeginProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	callback: (result: BeginProjectFullDetails | undefined) => void;
	includeIsFormula: boolean;
	isFormulaDefaultValue: boolean;
	lockItem: boolean;
	checkFromInventory: boolean;
	result?: BeginProjectFullDetails;
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
			type: BeginProjectDetailsType.FULL,
			itemDetails: {
				dc: _formData.object["summary-dc"] as number,
				batchSize: _formData.object["summary-batch-size"] as number,
				itemData: {
					uuid: this.item.uuid,
					isFormula: isFormula,
				},
				value: this.getCurrentStartingValue(),
			},
			startingValue: this.getCurrentStartingValueBreakdown(),
		};

		if (!this.spell) return;
		this.result.itemDetails.itemData.spellUuid = this.spell.uuid;
		this.result.itemDetails.itemData.heightenedLevel = getGenericScrollOrWandRank(this.item as ConsumablePF2e);
	}

	static async GetItemDetails(
		options: Omit<BeginProjectApplicationOptions, "callback">
	): Promise<BeginProjectFullDetails | undefined> {
		return new Promise<BeginProjectFullDetails | undefined>((resolve) => {
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
		this.scaleStartingValue();
	}

	private static async decreaseSummaryBatchSize(this: BeginProjectApplication, _event: Event, _target: HTMLElement) {
		const batchSizeInput = this.element.querySelector<HTMLInputElement>(".summary-batch-size");
		if (batchSizeInput) {
			const batchSize = Number.parseInt(batchSizeInput.value) - 1;
			const batchMin = Number.parseInt(batchSizeInput.min);
			batchSizeInput.value = Math.max(batchSize, batchMin).toString();
		}
		this.scaleStartingValue();
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
		const moneyGroupDivs = this.element.querySelectorAll<HTMLElement>("div[data-action='update-money-group']");
		moneyGroupDivs.forEach((moneyGroupDiv) =>
			moneyGroupDiv.addEventListener("change", (event: Event) => this.updateStartingValue(event))
		);

		const batchSizeInputs = this.element.querySelectorAll<HTMLInputElement>(
			"input[data-action='update-batch-size']"
		);
		batchSizeInputs.forEach((batchSizeInput) =>
			batchSizeInput.addEventListener("change", (_event: Event) => this.scaleStartingValue())
		);

		const updateDetailsOptions: BeginProjectUpdateDetailsOptions = {};
		if (this.item && options.isFirstRender) {
			updateDetailsOptions.itemDropped = true;
		}
		this.updateDetails(updateDetailsOptions);
	}

	private scaleStartingValue() {
		const curValue = this.getCurrentStartingValue();
		const maxStartingValue = this.getMaxStartingValue();
		const scalingFactor = maxStartingValue.copperValue / curValue.copperValue;
		if (scalingFactor >= 1) {
			this.updateStartingValueText();
			return;
		}

		const breakdown = this.getCurrentStartingValueBreakdown();
		const newBreakdown = {
			currency: CoinsPF2eUtility.multCoins(scalingFactor, breakdown.currency ?? {}),
			trove: CoinsPF2eUtility.multCoins(scalingFactor, breakdown.generic ?? {}),
		};
		this.setInputs(newBreakdown);
		this.updateStartingValueText();
	}

	private async updateStartingValue(event: Event) {
		const element = event.currentTarget as HTMLElement;
		const curMoneyGroupInputs = element.querySelectorAll<HTMLInputElement>("input");

		await this.enforceMax(curMoneyGroupInputs, element.dataset);
		this.updateStartingValueText();
	}

	private async enforceMax(inputs: NodeListOf<HTMLInputElement>, materialData: Record<string, string | undefined>) {
		const breakdown = this.getCurrentStartingValueBreakdown();
		const curValue = this.getCurrentStartingValue();

		const maxStartingValue = this.getMaxStartingValue();
		const key = (materialData.item === "trove" ? "generic" : materialData.item) as "currency" | "generic";
		const breakdownData = new game.pf2e.Coins(breakdown[key] ?? {});

		const preMaterialContribution = CoinsPF2eUtility.subCoins(curValue, breakdownData);
		const remainingBudgetCopper = CoinsPF2eUtility.subCoins(maxStartingValue, preMaterialContribution);

		let maxSpend: CoinsPF2e;
		switch (key) {
			case "currency":
				maxSpend = CoinsPF2eUtility.minCoins(this.actor.inventory.coins, remainingBudgetCopper);
				break;
			case "generic":
				maxSpend = CoinsPF2eUtility.minCoins(await MaterialTrove.getValue(this.actor), remainingBudgetCopper);
				break;
			default:
				maxSpend = maxStartingValue;
				break;
		}
		if (breakdownData.copperValue <= maxSpend.copperValue) return;

		for (const input of inputs) {
			const name = input.name.toLowerCase();
			if (name.endsWith("pp")) {
				input.value = `${maxSpend.pp ?? 0}`;
			} else if (name.endsWith("gp")) {
				input.value = `${maxSpend.gp ?? 0}`;
			} else if (name.endsWith("sp")) {
				input.value = `${maxSpend.sp ?? 0}`;
			} else if (name.endsWith("cp")) {
				input.value = `${maxSpend.cp ?? 0}`;
			}
		}
	}

	private ResetStartingValue() {
		const inputs = this.element.querySelectorAll<HTMLInputElement>(
			".begin-project-start-summary .money-group input"
		);
		inputs.forEach((input) => (input.value = "0"));
		this.updateStartingValueText();
	}

	private setInputs(breakdown: BeginProjectStartingValues) {
		const inputs = this.element.querySelectorAll<HTMLInputElement>(
			".begin-project-start-summary .money-group input"
		);

		for (const input of inputs) {
			switch (input.name) {
				case "currency-pp":
					input.value = (breakdown.currency?.pp || 0).toString();
					break;
				case "trove-pp":
					input.value = (breakdown.generic?.pp || 0).toString();
					break;
				case "currency-gp":
					input.value = (breakdown.currency?.gp || 0).toString();
					break;
				case "trove-gp":
					input.value = (breakdown.generic?.gp || 0).toString();
					break;
				case "currency-sp":
					input.value = (breakdown.currency?.sp || 0).toString();
					break;
				case "trove-sp":
					input.value = (breakdown.generic?.sp || 0).toString();
					break;
				case "currency-cp":
					input.value = (breakdown.currency?.cp || 0).toString();
					break;
				case "trove-cp":
					input.value = (breakdown.generic?.cp || 0).toString();
					break;
				default:
					break;
			}
		}
	}

	private getCurrentStartingValueBreakdown(): BeginProjectStartingValues {
		const inputs = this.element.querySelectorAll<HTMLInputElement>(
			".begin-project-start-summary .money-group input"
		);

		const result: { currency: Coins; generic: Coins } = {
			currency: {},
			generic: {},
		};
		for (const input of inputs) {
			switch (input.name) {
				case "currency-pp":
					result.currency.pp = Number.parseInt(input.value) || 0;
					break;
				case "trove-pp":
					result.generic.pp = Number.parseInt(input.value) || 0;
					break;
				case "currency-gp":
					result.currency.gp = Number.parseInt(input.value) || 0;
					break;
				case "trove-gp":
					result.generic.gp = Number.parseInt(input.value) || 0;
					break;
				case "currency-sp":
					result.currency.sp = Number.parseInt(input.value) || 0;
					break;
				case "trove-sp":
					result.generic.sp = Number.parseInt(input.value) || 0;
					break;
				case "currency-cp":
					result.currency.cp = Number.parseInt(input.value) || 0;
					break;
				case "trove-cp":
					result.generic.cp = Number.parseInt(input.value) || 0;
					break;
				default:
					break;
			}
		}
		return result;
	}

	private getCurrentStartingValue(): CoinsPF2e {
		const inputs = this.element.querySelectorAll<HTMLInputElement>(
			".begin-project-start-summary .money-group input"
		);
		const coins: Coins = {};
		for (const input of inputs) {
			switch (input.name) {
				case "currency-pp":
				case "trove-pp":
					if (!coins.pp) coins.pp = 0;
					coins.pp += Number.parseInt(input.value) || 0;
					break;
				case "currency-gp":
				case "trove-gp":
					if (!coins.gp) coins.gp = 0;
					coins.gp += Number.parseInt(input.value) || 0;
					break;
				case "currency-sp":
				case "trove-sp":
					if (!coins.sp) coins.sp = 0;
					coins.sp += Number.parseInt(input.value) || 0;
					break;
				case "currency-cp":
				case "trove-cp":
					if (!coins.cp) coins.cp = 0;
					coins.cp += Number.parseInt(input.value) || 0;
					break;
				default:
					break;
			}
		}
		return new game.pf2e.Coins(coins);
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
			hasMaterialTrove: !!(await MaterialTrove.getMaterialTrove(this.actor)),
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
		if (item.slug && [MATERIAL_TROVE_SLUG, CRAFTING_MATERIAL_SLUG, SALVAGE_MATERIAL_SLUG].includes(item.slug)) {
			ui.notifications.info(`${item.name} cannot be crafted`);
			return null;
		}
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
			this.resetBatchSizeInput();
			this.ResetStartingValue();
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

	private resetBatchSizeInput() {
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

		const startingValueSpan = this.element.querySelector<HTMLSpanElement>(
			".begin-project-start-summary .total-starting .starting-value"
		);
		const startingMaxSpan = this.element.querySelector<HTMLSpanElement>(
			".begin-project-start-summary .total-starting .starting-max"
		);

		if (!startingValueSpan || !startingMaxSpan) return;
		startingValueSpan.textContent = this.getCurrentStartingValue().toString();
		const maxStartingValue = this.getMaxStartingValue();
		startingMaxSpan.textContent = maxStartingValue.toString();
	}

	private getMaxStartingValue(): CoinsPF2e {
		if (!this.item) return new game.pf2e.Coins();
		const batchSizeInput = this.element.querySelector<HTMLInputElement>(".summary-batch-size");
		const batchSize = batchSizeInput ? Number.parseInt(batchSizeInput.value) || 1 : 1;
		const maxStartingValue = CoinsPF2eUtility.multCoins(batchSize / 2, this.item.price.value);
		return maxStartingValue;
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
