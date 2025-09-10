import { ActorPF2e } from "../../types/src/module/actor";
import { ContainerPF2e, TreasurePF2e } from "../../types/src/module/item";
import { Coins, PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { TreasureSource } from "../../types/src/module/item/treasure/data";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import {
	MATERIAL_TROVE_SLUG,
	CRAFTING_MATERIAL_SLUG,
	CRAFTING_MATERIAL_UUID,
	HEROIC_CRAFTING_SPENDING_LIMIT,
} from "../Helper/constants.mjs";
import { UnsignedCoins } from "../Helper/currency.mjs";
import { SignedCoinsPF2e } from "../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";

import { EditMaterialTroveApplication } from "./Applications/EditMaterialTroveApplication.mjs";
import { EditMaterialTroveApplicationResult } from "./Applications/types.mjs";

export async function useActorCoins(
	result: EditMaterialTroveApplicationResult,
	craftingMaterials: UnsignedCoins,
	actor: CharacterPF2eHeroicCrafting
) {
	if (result.updateActorCoins) {
		const coinsToMove = SignedCoinsPF2e.subtractCoins(result.newMaterialTroveValue, craftingMaterials);
		if (coinsToMove.copperValue < 0) {
			// Add Coins to character Sheet
			coinsToMove.isNegative = false;
			actor.inventory.addCoins(coinsToMove);
		} else if (coinsToMove.copperValue > 0) {
			// Take Coins from character Sheet
			return await actor.inventory.removeCoins(coinsToMove);
		}
	}
	return true;
}

export class MaterialTrove {
	private static readonly troves: Map<string, MaterialTrove> = new Map();

	private readonly actor: CharacterPF2eHeroicCrafting;
	private readonly materialTrove: ContainerPF2e;
	value: UnsignedCoins;
	get contents() {
		return this.materialTrove.contents;
	}
	private constructor(actor: CharacterPF2eHeroicCrafting, materialTrove: ContainerPF2e) {
		this.actor = actor;
		this.materialTrove = materialTrove;
		this.value = new UnsignedCoinsPF2e();
	}

	private async initializeGenericCraftingMaterials(): Promise<void> {
		const craftingMaterials: Partial<Record<number, TreasurePF2e<CharacterPF2eHeroicCrafting>[]>> =
			this.getCraftingMaterials();
		const deleteIds = [];

		for (const [bulkString, bulkCraftingMaterials] of Object.entries(craftingMaterials)) {
			if (!bulkCraftingMaterials) continue;

			bulkCraftingMaterials.forEach((material) => {
				const addedValue = UnsignedCoinsPF2e.multiplyCoins(material.quantity, material.price.value);
				this.value = UnsignedCoinsPF2e.addCoins(this.value, addedValue);
			});

			const bulk = Number.parseFloat(bulkString);
			deleteIds.push(...bulkCraftingMaterials.slice(bulk < 1 ? 1 : 0).map((item) => item.id));
		}

		await this.actor.deleteEmbeddedDocuments("Item", deleteIds);
		await this.updateCraftingMaterials(this.value);
	}

	private getCraftingMaterials(): Partial<Record<number, TreasurePF2e<CharacterPF2eHeroicCrafting>[]>> {
		const craftingMaterials = this.materialTrove.contents.filter<TreasurePF2e<CharacterPF2eHeroicCrafting>>(
			(x) => x?.slug === CRAFTING_MATERIAL_SLUG
		);
		const groupedCraftingMaterials = Object.groupBy(craftingMaterials, (item) => item.system.bulk.value);
		for (const bulk of [0, 0.1]) {
			if (!(bulk in groupedCraftingMaterials)) groupedCraftingMaterials[bulk] = [];
		}
		return groupedCraftingMaterials;
	}

	private static async newMaterialTrove(
		actor: CharacterPF2eHeroicCrafting,
		materialTrove: ContainerPF2e
	): Promise<MaterialTrove> {
		const trove = new MaterialTrove(actor, materialTrove);
		await trove.initializeGenericCraftingMaterials();
		MaterialTrove.troves.set(actor.uuid, trove);
		return trove;
	}

	static actorHasMaterialTrove(actor: ActorPF2e) {
		return MaterialTrove.troves.has(actor.uuid);
	}

	static async getMaterialTrove(
		actor: ActorPF2e,
		notifyOnFailure: boolean = true
	): Promise<MaterialTrove | undefined> {
		if (actor.type !== "character") return;
		if (MaterialTrove.troves.has(actor.uuid)) return MaterialTrove.troves.get(actor.uuid)!;

		const materialTroves = actor.itemTypes.backpack.filter((x) => x?.slug === MATERIAL_TROVE_SLUG);

		if (materialTroves.length === 0) {
			if (notifyOnFailure)
				ui.notifications.error(
					"No Material Trove Found, please add a material trove from the Heroic Crafting Items Compendium"
				);
			return;
		}

		if (materialTroves.length > 1) {
			if (notifyOnFailure)
				ui.notifications.error(
					"Multiple Material Troves Found, please make sure that you only have one Material Trove"
				);
			return;
		}

		const trove = await MaterialTrove.newMaterialTrove(
			actor as CharacterPF2eHeroicCrafting,
			materialTroves[0] as ContainerPF2e<CharacterPF2eHeroicCrafting>
		);

		return trove;
	}

	static async editMaterialTrove(actor: CharacterPF2eHeroicCrafting) {
		if (!actor) {
			ui.notifications.error("An actor must be selected");
			return;
		}

		const materialTrove = await MaterialTrove.getMaterialTrove(actor);
		if (!materialTrove) return;

		// Get new value of Generic Crafting Materials
		const result = (await EditMaterialTroveApplication.EditMaterialTrove({
			actor,
			materialTrove,
		})) as EditMaterialTroveApplicationResult;
		if (!result) return;

		if (!(await useActorCoins(result, materialTrove.value, actor))) {
			ui.notifications.error("Not enough coins in inventory");
			return;
		}

		await materialTrove.updateCraftingMaterials(result.newMaterialTroveValue);
	}

	static async getValue(actor: CharacterPF2eHeroicCrafting, notifyOnFailure: boolean = true): Promise<UnsignedCoins> {
		const materialTrove = await MaterialTrove.getMaterialTrove(actor, notifyOnFailure);
		if (!materialTrove) return new UnsignedCoinsPF2e();

		return materialTrove.value;
	}

	static async addValue(actor: CharacterPF2eHeroicCrafting, value: Coins, notifyOnFailure: boolean = true) {
		const materialTrove = await MaterialTrove.getMaterialTrove(actor, notifyOnFailure);
		if (!materialTrove) return;

		await materialTrove.add(value);
	}

	static async subtractValue(actor: CharacterPF2eHeroicCrafting, value: Coins, notifyOnFailure: boolean = true) {
		const materialTrove = await MaterialTrove.getMaterialTrove(actor, notifyOnFailure);
		if (!materialTrove) return;

		await materialTrove.subtract(value);
	}

	async syncValue() {
		await this.updateCraftingMaterials(this.value);
	}

	async updateCraftingMaterials(value: Coins) {
		console.debug(
			`HEROIC CRAFTING | DEBUG | updateCraftingMaterials {pp: ${value.pp}, gp: ${value.gp}, sp: ${value.sp}, cp: ${value.cp}}`
		);
		const coinValue = new UnsignedCoinsPF2e(value);

		const lightBulkCoins = this.getLightBulkCoins();
		const lightBulkQuantity = Math.floor(coinValue.copperValue / lightBulkCoins.copperValue);
		const negligibleBulkCoins = UnsignedCoinsPF2e.copperValueToCoins(
			coinValue.copperValue % lightBulkCoins.copperValue
		);

		const newDetails: Partial<Record<number, { coins: Coins; quantity: number }>> = {
			0: { coins: negligibleBulkCoins, quantity: 1 },
			0.1: { coins: lightBulkCoins, quantity: lightBulkQuantity },
		};

		const operationsByBulk = await Promise.all(
			Object.entries(this.getCraftingMaterials()).map(([bulkString, bulkCraftingMaterials]) => {
				const bulk = Number.parseFloat(bulkString);
				return this.getGenericCraftingMaterialUpdates(
					new UnsignedCoinsPF2e(newDetails[bulk]?.coins ?? {}),
					newDetails[bulk]?.quantity || 0,
					bulkCraftingMaterials,
					bulk
				);
			})
		);

		console.log("Heroic Crafting | operations by bulk", operationsByBulk);
		const operations = operationsByBulk.reduce<{
			create: TreasureSource[];
			update: EmbeddedDocumentUpdateData[];
			delete: string[];
		}>(
			(accumulator, currentValue) => {
				if (currentValue.create != undefined) accumulator.create.push(currentValue.create);
				if (currentValue.update != undefined) accumulator.update.push(currentValue.update);
				if (currentValue.delete != undefined) accumulator.delete.push(...currentValue.delete);
				return accumulator;
			},
			{ create: [], update: [], delete: [] }
		);

		await this.actor.createEmbeddedDocuments("Item", operations.create);
		await this.actor.updateEmbeddedDocuments("Item", operations.update);
		await this.actor.deleteEmbeddedDocuments("Item", operations.delete);
	}

	private getLightBulkCoins() {
		const spendingLimitForLevel = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level);
		if (!spendingLimitForLevel) {
			return new UnsignedCoinsPF2e({});
		}

		return UnsignedCoinsPF2e.multiplyCoins(1 / 20, spendingLimitForLevel.week);
	}

	async add(value: Coins) {
		const newValue = UnsignedCoinsPF2e.addCoins(this.value, value);
		await this.updateCraftingMaterials(newValue);
	}

	async subtract(value: Coins) {
		const newValue = UnsignedCoinsPF2e.subtractCoins(this.value, value);
		await this.updateCraftingMaterials(newValue);
	}

	private getUpdateDetails(price: Coins, quantity: number, bulk: number, id?: string) {
		const updateDetails: EmbeddedDocumentUpdateData = {
			_id: id ?? foundry.utils.randomID(),
			system: {
				level: {
					value: this.actor.level,
				},
				price: {
					value: price,
				},
				quantity: quantity,
			},
		};
		foundry.utils.mergeObject(
			updateDetails,
			{ system: { bulk: { value: bulk, heldOrStowed: bulk } } },
			{ inplace: true }
		);

		return updateDetails;
	}

	private async getGenericCraftingMaterialUpdates(
		value: UnsignedCoins,
		quantity: number,
		genericCraftingMaterials: TreasurePF2e<CharacterPF2eHeroicCrafting>[] | undefined,
		bulk: number
	): Promise<{
		create?: TreasureSource;
		update?: EmbeddedDocumentUpdateData;
		delete?: string[];
	}> {
		const genericCraftingMaterial = genericCraftingMaterials?.[0];
		const operations: {
			create?: TreasureSource;
			update?: EmbeddedDocumentUpdateData;
			delete?: string[];
		} = {};

		const canCreateOrUpdate = UnsignedCoinsPF2e.getCopperValue(value) > 0 && quantity > 0 && bulk < 1;
		if (canCreateOrUpdate && !genericCraftingMaterial) {
			const data = ((await fromUuid(CRAFTING_MATERIAL_UUID)) as TreasurePF2e).toObject();
			foundry.utils.mergeObject(
				data,
				{
					system: {
						containerId: this.materialTrove.id,
						equipped: { carryType: "stowed", handsHeld: 0, inSlot: false },
					},
				},
				{ inplace: true }
			);
			foundry.utils.mergeObject(data, this.getUpdateDetails(value, quantity, bulk), {
				inplace: true,
			});
			operations.create = data;
			ui.notifications.info(`Generic Crafting Materials (${bulk} Bulk) Created`);
		} else if (canCreateOrUpdate && !!genericCraftingMaterial) {
			const updateDetails: EmbeddedDocumentUpdateData = this.getUpdateDetails(
				value,
				quantity,
				bulk,
				genericCraftingMaterial.id
			);
			operations.update = updateDetails;
		} else if (!canCreateOrUpdate) {
			operations.delete = genericCraftingMaterials?.map((material) => material.id);
			if (operations.delete && operations.delete.length > 0) {
				ui.notifications.info(`Generic Crafting Materials (${bulk} Bulk) Deleted`);
			}
		}

		if (operations.delete && operations.delete.length === 0) {
			delete operations.delete;
		}
		return operations;
	}

	static onInit() {
		MaterialTrove.initialiseHooks();
	}

	private static initialiseHooks() {
		console.debug("Heroic Crafting | Initialising Material Trove hooks");
		Hooks.on("preCreateItem", MaterialTrove.onPreCreateItem);
		Hooks.on("createItem", MaterialTrove.onCreateItem);
		Hooks.on("preUpdateItem", MaterialTrove.onPreUpdateItem);
		Hooks.on("preDeleteItem", MaterialTrove.onPreDeleteItem);
		Hooks.on("updateActor", MaterialTrove.onUpdateActor);
	}

	private static onPreCreateItem(...args: unknown[]) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreCreateItem`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", ...args);

		const item = args[0] as PhysicalItemPF2e;
		const preCreateData = args[1] as { system?: { slug?: string } };
		const _databaseOperation = args[2];
		const _id = args[3];

		const actor = item.actor;
		if (!actor) return;
		switch (preCreateData.system?.slug) {
			case MATERIAL_TROVE_SLUG:
				return MaterialTrove.onPreCreateMaterialTrove(actor);
			case CRAFTING_MATERIAL_SLUG:
				return MaterialTrove.onPreCreateGenericCraftingMaterial(actor, item);
			default:
				break;
		}
	}

	private static onPreCreateMaterialTrove(actor: ActorPF2e) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreCreateMaterialTrove`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", actor);

		if (actor.type !== "character") {
			ui.notifications.error(`A ${actor.type} can not have a Material Trove`);
			return false;
		}
		const materialTroves = actor.itemTypes.backpack.filter((x) => x?.slug === MATERIAL_TROVE_SLUG);
		if (materialTroves.length > 0) {
			ui.notifications.error("A character can not have more than 1 Material Trove");
			return false;
		}
	}

	private static onPreCreateGenericCraftingMaterial(actor: ActorPF2e, item: PhysicalItemPF2e) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreCreateGenericCraftingMaterial`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", actor, item);

		const materialTrove = MaterialTrove.troves.get(actor.uuid);
		if (!materialTrove) return;

		if (item.system.containerId !== materialTrove.materialTrove.id) {
			const addedValue = SignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);
			materialTrove.add(addedValue);
			ui.notifications.info("Generic Crafting Materials automatically added to material trove");
			return false;
		} else if (item.system.containerId === materialTrove.materialTrove.id) {
			switch (item.system.bulk.value) {
				case 0:
					return MaterialTrove.onPreCreateNegligibleBulkGenericCraftingMaterial(item, materialTrove);
				case 0.1:
					return MaterialTrove.onPreCreateLightBulkGenericCraftingMaterial(item, materialTrove);
				default:
					return MaterialTrove.onPreCreateDefaultBulkGenericCraftingMaterial(item, materialTrove);
			}
		}
	}

	private static onPreCreateNegligibleBulkGenericCraftingMaterial(
		item: PhysicalItemPF2e,
		materialTrove: MaterialTrove
	) {
		if (CONFIG.debug.hooks)
			console.debug(`HEROIC CRAFTING | DEBUG | onPreCreateNegligibleBulkGenericCraftingMaterial`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", item, materialTrove);

		const craftingMaterials = materialTrove.getCraftingMaterials();
		const addedValue = UnsignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);

		const bulkCraftingMaterials = craftingMaterials[item.system.bulk.value];
		const noCraftingMaterials = !bulkCraftingMaterials || bulkCraftingMaterials.length == 0;
		const itemAutoGenerated =
			item.system.quantity === 1 &&
			item.system.price.value.copperValue < materialTrove.getLightBulkCoins().copperValue;
		if (noCraftingMaterials && itemAutoGenerated) {
			materialTrove.value = UnsignedCoinsPF2e.addCoins(materialTrove.value, addedValue);
			return;
		}

		materialTrove.add(addedValue);
		return false;
	}

	private static onPreCreateLightBulkGenericCraftingMaterial(item: PhysicalItemPF2e, materialTrove: MaterialTrove) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreCreateLightBulkGenericCraftingMaterial`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", item, materialTrove);
		const craftingMaterials = materialTrove.getCraftingMaterials();
		const addedValue = UnsignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);

		const bulkCraftingMaterials = craftingMaterials[item.system.bulk.value];
		const noCraftingMaterials = !bulkCraftingMaterials || bulkCraftingMaterials.length == 0;
		const itemAutoGenerated = item.system.price.value.copperValue === materialTrove.getLightBulkCoins().copperValue;
		if (noCraftingMaterials && itemAutoGenerated) {
			materialTrove.value = UnsignedCoinsPF2e.addCoins(materialTrove.value, addedValue);
			return;
		}

		materialTrove.add(addedValue);
		return false;
	}

	private static onPreCreateDefaultBulkGenericCraftingMaterial(item: PhysicalItemPF2e, materialTrove: MaterialTrove) {
		if (CONFIG.debug.hooks)
			console.debug(`HEROIC CRAFTING | DEBUG | onPreCreateDefaultBulkGenericCraftingMaterial`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", item, materialTrove);

		const addedValue = SignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);
		materialTrove.add(addedValue);
		return false;
	}

	private static onCreateItem(...args: unknown[]) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onCreateItem`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", ...args);

		const item = args[0] as PhysicalItemPF2e;

		const actor = item.actor;
		if (!actor) return;

		if (item.system.slug === MATERIAL_TROVE_SLUG) {
			this.newMaterialTrove(
				actor as CharacterPF2eHeroicCrafting,
				item as ContainerPF2e<CharacterPF2eHeroicCrafting>
			);
		}
	}

	private static onPreUpdateItem(...args: unknown[]) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreUpdateItem`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", ...args);

		const item = args[0] as PhysicalItemPF2e;
		const preUpdateData = args[1] as { system?: { slug?: string | null; containerId?: string | null } };

		const actor = item.actor;
		if (!actor) return;

		if (item.system.slug === CRAFTING_MATERIAL_SLUG) {
			return MaterialTrove.onPreUpdateItemGenericCraftingMaterial(actor, item, preUpdateData);
		}
	}

	private static onPreUpdateItemGenericCraftingMaterial(
		actor: ActorPF2e,
		item: PhysicalItemPF2e,
		preUpdateData: { system?: { slug?: string | null; containerId?: string | null } }
	) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreUpdateItemGenericCraftingMaterial`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", actor, item, preUpdateData);

		const fromContainerID = item.system.containerId;
		const toContainerID = preUpdateData.system?.containerId;
		const materialTrove = MaterialTrove.troves.get(actor.uuid);
		if (!materialTrove) return;

		const materialTroveCointainerID = materialTrove.materialTrove.id;
		if (toContainerID !== undefined) {
			if (fromContainerID !== materialTroveCointainerID && toContainerID === materialTroveCointainerID) {
				return MaterialTrove.onPreUpdateItemGenericCraftingMaterialIntoMaterialTrove(item, materialTrove);
			}

			if (fromContainerID === materialTroveCointainerID && toContainerID !== materialTroveCointainerID) {
				return MaterialTrove.onPreUpdateItemGenericCraftingMaterialOutOfMaterialTrove(item, materialTrove);
			}
		} else if (fromContainerID === materialTroveCointainerID) {
			return MaterialTrove.onPreUpdateItemGenericCraftingMaterialInPlace(item, materialTrove, preUpdateData);
		}
	}

	private static onPreUpdateItemGenericCraftingMaterialIntoMaterialTrove(
		item: PhysicalItemPF2e,
		materialTrove: MaterialTrove
	) {
		if (CONFIG.debug.hooks)
			console.debug(`HEROIC CRAFTING | DEBUG | onPreUpdateItemGenericCraftingMaterialIntoMaterialTrove`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", item, materialTrove);

		const baseItemValue = UnsignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);
		const newValue = UnsignedCoinsPF2e.addCoins(materialTrove.value, baseItemValue);
		item.delete();
		materialTrove.updateCraftingMaterials(newValue);
		return false;
	}

	private static onPreUpdateItemGenericCraftingMaterialOutOfMaterialTrove(
		item: PhysicalItemPF2e,
		materialTrove: MaterialTrove
	) {
		if (CONFIG.debug.hooks)
			console.debug(`HEROIC CRAFTING | DEBUG | onPreUpdateItemGenericCraftingMaterialOutOfMaterialTrove`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", item, materialTrove);

		const baseItemValue = UnsignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);
		materialTrove.value = UnsignedCoinsPF2e.subtractCoins(materialTrove.value, baseItemValue);
	}

	private static onPreUpdateItemGenericCraftingMaterialInPlace(
		item: PhysicalItemPF2e,
		materialTrove: MaterialTrove,
		preUpdateData: { system?: object }
	) {
		if (CONFIG.debug.hooks)
			console.debug(`HEROIC CRAFTING | DEBUG | onPreUpdateItemGenericCraftingMaterialInPlace`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", item, materialTrove, preUpdateData);
		const baseItemValue = UnsignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);
		const newItemSystemData = foundry.utils.mergeObject(item.system, preUpdateData.system, {
			inplace: false,
		});

		const newItemValue = UnsignedCoinsPF2e.multiplyCoins(newItemSystemData.quantity, newItemSystemData.price.value);
		const difference = UnsignedCoinsPF2e.subtractCoins(newItemValue, baseItemValue);
		const isAutoGeneratedLightBulk =
			newItemSystemData.bulk.value === 0.1 &&
			newItemSystemData.price.value.copperValue === materialTrove.getLightBulkCoins().copperValue;
		const isAutoGeneratedNegligibleBulk =
			newItemSystemData.bulk.value === 0 &&
			newItemSystemData.quantity === 1 &&
			newItemSystemData.price.value.copperValue < materialTrove.getLightBulkCoins().copperValue;
		if (isAutoGeneratedLightBulk || isAutoGeneratedNegligibleBulk) {
			materialTrove.value = UnsignedCoinsPF2e.addCoins(materialTrove.value, difference);
		} else {
			return false;
		}
	}

	private static onPreDeleteItem(...args: unknown[]) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreDeleteItem`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", ...args);

		const item = args[0] as PhysicalItemPF2e;

		const actor = item.actor;
		if (!actor) return;

		if (item.system.slug === MATERIAL_TROVE_SLUG) {
			MaterialTrove.onPreDeleteMaterialTrove(actor);
		}

		if (item.system.slug === CRAFTING_MATERIAL_SLUG) {
			MaterialTrove.onPreDeleteGenericCraftingMaterial(actor, item);
		}
	}

	private static onPreDeleteMaterialTrove(actor: ActorPF2e): void {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreDeleteMaterialTrove`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", actor);

		MaterialTrove.troves.delete(actor.uuid);
	}

	private static onPreDeleteGenericCraftingMaterial(actor: ActorPF2e, item: PhysicalItemPF2e): void {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onPreDeleteGenericCraftingMaterial`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", actor, item);

		const materialTrove = MaterialTrove.troves.get(actor.uuid);
		if (!materialTrove) return;

		if (item.system.containerId === materialTrove.materialTrove.id) {
			const totalItemValue = UnsignedCoinsPF2e.multiplyCoins(item.system.quantity, item.system.price.value);
			materialTrove.value = UnsignedCoinsPF2e.subtractCoins(materialTrove.value, totalItemValue);
		}
	}

	private static onUpdateActor(...args: unknown[]) {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onUpdateActor`);
		if (CONFIG.debug.hooks) console.debug("HEROIC CRAFTING | DEBUG |", ...args);

		const actor = args[0] as ActorPF2e;
		const _preUpdateData = args[1] as { system?: { details?: { level?: { value?: number } } } };
		const _databaseOperation = args[2];
		const _id = args[3];

		const materialTrove = MaterialTrove.troves.get(actor.uuid);
		if (!materialTrove) return;

		materialTrove.syncValue();
	}

	static onReady() {
		if (CONFIG.debug.hooks) console.debug(`HEROIC CRAFTING | DEBUG | onReady`);

		game.actors.forEach((actor) => {
			if (actor.type !== "character") return;
			MaterialTrove.getMaterialTrove(actor, false);
		});
	}
}
