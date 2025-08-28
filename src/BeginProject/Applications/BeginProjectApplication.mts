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
	ApplicationConfiguration,
	ApplicationRenderOptions,
} from "../../../types/types/foundry/client/applications/_module.mjs";
import { HandlebarsRenderOptions } from "../../../types/types/foundry/client/applications/api/_module.mjs";
import { FormDataExtended } from "../../../types/types/foundry/client/applications/ux/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../../character.mjs";
import { CRAFTING_MATERIAL_SLUG, MATERIAL_TROVE_SLUG, SALVAGE_MATERIAL_SLUG } from "../../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../../Helper/currency.mjs";
import { calculateDC } from "../../Helper/dc.mjs";
import { DENOMINATION } from "../../Helper/signedCoins.mjs";
import { MaterialTrove } from "../../MaterialTrove/materialTrove.mjs";
import {
	BeginProjectStartingValues,
	BeginProjectFullDetails,
	BeginProjectDetailsType,
	BeginProjectUpdateDetailsOptions,
} from "../types.mjs";

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

export class BeginProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: CharacterPF2eHeroicCrafting;
	callback: (result: BeginProjectFullDetails | undefined) => void;
	includeIsFormula: boolean;
	lockItem: boolean;
	checkFromInventory: boolean;
	item?: PhysicalItemPF2e;
	spell?: SpellPF2e;

	result?: BeginProjectFullDetails;
	submitDisabled: boolean;
	batchSizeMax?: number;

	formData: {
		isFormula: boolean;
		dc: number;
		batchSize: number;
		currency: Coins;
		trove: Coins;
	};

	constructor(options: BeginProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.callback = options.callback;
		this.includeIsFormula = options.itemSettings?.formula?.include ?? true;
		this.lockItem = options.itemSettings?.lockItem ?? false;
		this.item = options.itemSettings?.item;
		this.checkFromInventory = options.itemSettings?.checkFromInventory ?? false;

		this.submitDisabled = !this.item;

		this.formData = {
			isFormula: options.itemSettings?.formula?.defaultValue ?? false,
			dc: this.item ? calculateDC(this.item.level, this.item.rarity) : 1,
			batchSize: getMaxBatchSize(this.item),
			currency: new game.pf2e.Coins(),
			trove: new game.pf2e.Coins(),
		};

		if (this.item) {
			this.batchSizeMax = getMaxBatchSize(this.item);
		}
	}

	static override readonly DEFAULT_OPTIONS = {
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

		this.result = {
			type: BeginProjectDetailsType.FULL,
			itemDetails: {
				dc: this.formData.dc,
				batchSize: this.formData.batchSize,
				itemData: {
					uuid: this.item.uuid,
					isFormula: this.formData.isFormula,
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

	private static async increaseSummaryBatchSize(this: BeginProjectApplication, _event: Event, _target: HTMLElement) {
		this.formData.batchSize = Math.min(this.formData.batchSize + 1, this.batchSizeMax || Infinity);
		this.scaleStartingValue();
		this.render();
	}

	private static async decreaseSummaryBatchSize(this: BeginProjectApplication, _event: Event, _target: HTMLElement) {
		this.formData.batchSize = Math.max(this.formData.batchSize - 1, 1);
		this.scaleStartingValue();
		this.render();
	}

	override _initializeApplicationOptions(
		options: Partial<ApplicationConfiguration> & BeginProjectApplicationOptions
	): ApplicationConfiguration {
		const result = super._initializeApplicationOptions(options);
		console.log("Heroic Crafting |", options);
		result.uniqueId = "begin-project-" + options.actor.uuid.replace(".", "-");
		return result;
	}

	override async _onFirstRender(context: object, options: fa.ApplicationRenderOptions) {
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

		const manualUpdateInputs = this.element.querySelectorAll<HTMLInputElement>(
			"input[data-action='update-input-manual']"
		);
		manualUpdateInputs.forEach((batchSizeInput) => {
			batchSizeInput.addEventListener(batchSizeInput.type === "checkbox" ? "click" : "change", (event: Event) =>
				this.manualUpdateInput(event)
			);
		});

		const updateDetailsOptions: BeginProjectUpdateDetailsOptions = {};
		if (this.item && options.isFirstRender) {
			updateDetailsOptions.itemDropped = true;
		}
		this.updateDetails(updateDetailsOptions);
	}

	private manualUpdateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const totalPath = target.name;
		const pathSegments = totalPath.split(".");
		const value = Number.parseInt(target.value);

		switch (pathSegments[0]) {
			case "dc": {
				this.formData.dc = value;
				break;
			}
			case "isFormula": {
				this.formData.isFormula = target.checked;
				this.updateDetails();

				break;
			}
			case "batchSize": {
				this.formData.batchSize = value;
				this.scaleStartingValue();
				break;
			}
			case "trove":
			case "currency": {
				this.formData[pathSegments[0]][pathSegments[1] as DENOMINATION] = value;
				this.enforceMax(pathSegments[0]);
				break;
			}
			default:
				break;
		}

		this.render();
	}

	private scaleStartingValue() {
		const curValue = this.getCurrentStartingValue();
		const maxStartingValue = this.getMaxStartingValue();
		const scalingFactor = maxStartingValue.copperValue / curValue.copperValue;
		if (scalingFactor >= 1) {
			return;
		}

		const breakdown = this.getCurrentStartingValueBreakdown();
		this.formData.currency = CoinsPF2eUtility.multCoins(scalingFactor, breakdown.currency ?? {});
		this.formData.trove = CoinsPF2eUtility.multCoins(scalingFactor, breakdown.trove ?? {});
	}

	private async enforceMax(key: "currency" | "trove") {
		const breakdown = this.getCurrentStartingValueBreakdown();
		const curValue = this.getCurrentStartingValue();

		const maxStartingValue = this.getMaxStartingValue();
		const breakdownData = new game.pf2e.Coins(breakdown[key] ?? {});

		const preMaterialContribution = CoinsPF2eUtility.subCoins(curValue, breakdownData);
		const remainingBudgetCopper = CoinsPF2eUtility.subCoins(maxStartingValue, preMaterialContribution);

		let maxSpend: CoinsPF2e;
		switch (key) {
			case "currency":
				maxSpend = CoinsPF2eUtility.minCoins(this.actor.inventory.coins, remainingBudgetCopper);
				break;
			case "trove":
				maxSpend = CoinsPF2eUtility.minCoins(await MaterialTrove.getValue(this.actor), remainingBudgetCopper);
				break;
			default:
				maxSpend = maxStartingValue;
				break;
		}
		if (breakdownData.copperValue <= maxSpend.copperValue) return;

		this.formData[key] = maxSpend;
	}

	private ResetStartingValue() {
		this.formData.currency = new game.pf2e.Coins();
		this.formData.trove = new game.pf2e.Coins();
	}

	private getCurrentStartingValueBreakdown(): BeginProjectStartingValues {
		return {
			currency: this.formData.currency,
			trove: this.formData.trove,
		};
	}

	private getCurrentStartingValue(): CoinsPF2e {
		return CoinsPF2eUtility.addCoins(this.formData.currency, this.formData.trove);
	}

	override async _prepareContext(options: ApplicationRenderOptions) {
		const data = await super._prepareContext(options);

		const buttons = [
			{
				type: "submit",
				icon: "fa-solid fa-compass-drafting",
				cssClass: "begin-project-button",
				label: "Begin Project",
				disabled: this.submitDisabled,
			},
			{ type: "button", icon: "fa-solid fa-xmark", label: "Cancel", action: "close" },
		];

		return foundry.utils.mergeObject(data, {
			id: this.id,
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
		const maxTotalStarting = this.getMaxStartingValue();
		switch (partId) {
			case "drag-drop":
				this.prepareDragDropContext(context);
				break;
			case "summary":
				this.prepareSummaryContext(context, maxTotalStarting);
				break;

			default:
				break;
		}
		return context;
	}

	private prepareDragDropContext(context: Record<string, unknown>) {
		context.details = {
			item: {
				img: this.item ? this.item.img : "systems/pf2e/icons/actions/craft/unknown-item.webp",
				name: this.item ? this.item.name : "Drag item here...",
				level: this.item ? String(this.item.level).padStart(2, "0") : "??",
			},
			spell: {
				img: this.spell ? this.spell.img : "systems/pf2e/icons/actions/craft/unknown-item.webp",
				name: this.spell ? this.spell.name : "Drag Spell here...",
				rank: this.spell ? String(this.spell.rank).padStart(2, "0") : "??",
				hide: this.formData.isFormula || (this.item && !isGenericScrollOrWand(this.item)),
			},
		};
	}

	private prepareSummaryContext(context: Record<string, unknown>, maxTotalStarting: CoinsPF2e) {
		context.details = {
			formData: this.formData,
			totalStarting: {
				current: CoinsPF2eUtility.addCoins(this.formData.currency, this.formData.trove).toString(),
				max: maxTotalStarting.copperValue === 0 ? "???" : maxTotalStarting.toString(),
			},
			batchSizeMax: this.batchSizeMax,
		};
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
		this.render();
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
		if (this.formData.isFormula) {
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
		if (options.itemDropped) {
			this.updateDc();
			this.resetBatchSizeInput();
			this.ResetStartingValue();
		}

		this.submitDisabled = !this.item;
	}

	private updateDc() {
		if (!this.item) return;

		this.formData.dc = calculateDC(this.item.level, this.item.rarity);
	}

	private resetBatchSizeInput() {
		if (!this.item) return;
		const batchSize = getMaxBatchSize(this.item);
		this.formData.batchSize = batchSize;
		this.batchSizeMax = batchSize;
	}

	private getMaxStartingValue(): CoinsPF2e {
		if (!this.item) return new game.pf2e.Coins();
		const maxStartingValue = CoinsPF2eUtility.multCoins(this.formData.batchSize / 2, this.item.price.value);
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

function getMaxBatchSize(item: PhysicalItemPF2e | undefined): number {
	if (!item) return 1;
	const isAmmo = item.isOfType("consumable") && (item as ConsumablePF2e).isAmmo;
	const isMundaneAmmo = isAmmo && !item.isMagical;
	const isConsumable =
		(item.isOfType("consumable") && (item as ConsumablePF2e).category !== "wand") ||
		(item.isOfType("weapon") && (item as WeaponPF2e).baseType === "alchemical-bomb");

	const magicalAmmo = isConsumable && !isAmmo ? 4 : 1;
	const batchSize = Math.max(
		item.system.price.per,
		isMundaneAmmo ? Math.clamp(item.system.price.per, 1, 10) : magicalAmmo
	);
	return batchSize;
}
