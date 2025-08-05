import { ContainerPF2e, TreasurePF2e } from "../../types/src/module/item";
import { Coins, CoinsPF2e, PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { TreasureSource } from "../../types/src/module/item/treasure/data";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import {
	MATERIAL_TROVE_SLUG,
	CRAFTING_MATERIAL_SLUG,
	CRAFTING_MATERIAL_UUID,
	HEROIC_CRAFTING_SPENDING_LIMIT,
} from "../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";

import { EditMaterialTroveApplication } from "./Applications/EditMaterialTroveApplication.mjs";
import { EditMaterialTroveApplicationResult } from "./Applications/types.mjs";

async function useActorCoins(
	result: EditMaterialTroveApplicationResult,
	craftingMaterials: CoinsPF2e,
	actor: CharacterPF2eHeroicCrafting
) {
	if (result.useActorCoins) {
		const coinsToMoveCopper = result.newMaterialTroveValue.copperValue - craftingMaterials.copperValue;
		if (coinsToMoveCopper < 0) {
			// Add Coins to character Sheet
			const coinsToMove = CoinsPF2eUtility.copperValueToCoins(-coinsToMoveCopper);
			actor.inventory.addCoins(coinsToMove);
		} else if (coinsToMoveCopper > 0) {
			// Take Coins from character Sheet
			const coinsToMove = CoinsPF2eUtility.copperValueToCoins(coinsToMoveCopper);
			return await actor.inventory.removeCoins(coinsToMove);
		}
	}
	return true;
}

export async function editMaterialTrove(actor: CharacterPF2eHeroicCrafting) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	const materialTrove = await MaterialTrove.getMaterialTrove(actor);
	if (!materialTrove) return;

	// Get new value of Generic Crafting Materials
	const result = (await EditMaterialTroveApplication.EditMaterialTrove(
		materialTrove.value
	)) as EditMaterialTroveApplicationResult;
	if (!result) return;

	if (!(await useActorCoins(result, materialTrove.value, actor))) {
		ui.notifications.error("Not enough coins in inventory");
		return;
	}

	materialTrove.setValue(result.newMaterialTroveValue);
}

export class MaterialTrove {
	static readonly troves: Map<string, MaterialTrove> = new Map();

	private readonly actor: CharacterPF2eHeroicCrafting;
	private readonly materialTrove: ContainerPF2e;
	private readonly genericCraftingMaterials: {
		negligible?: TreasurePF2e;
		light?: TreasurePF2e;
	};
	value: CoinsPF2e;
	contents: Collection<string, PhysicalItemPF2e>;
	private constructor(actor: CharacterPF2eHeroicCrafting, materialTrove: ContainerPF2e) {
		this.actor = actor;
		this.materialTrove = materialTrove;
		this.genericCraftingMaterials = {};
		this.value = new game.pf2e.Coins();
		this.contents = materialTrove.contents;
	}

	private async initializeGenericCraftingMaterials(): Promise<void> {
		const craftingMaterials: TreasurePF2e<CharacterPF2eHeroicCrafting>[] = this.actor.itemTypes.treasure.filter(
			(x) => x?.slug === CRAFTING_MATERIAL_SLUG
		);
		const deleteIds = [];
		for (const craftingMaterial of craftingMaterials) {
			this.value = this.value.plus(craftingMaterial.price.value.scale(craftingMaterial.quantity));
			if (craftingMaterial.system.bulk.value === 0 && !this.genericCraftingMaterials.negligible) {
				this.genericCraftingMaterials.negligible = craftingMaterial;
			} else if (craftingMaterial.system.bulk.value === 0.1 && !this.genericCraftingMaterials.light) {
				this.genericCraftingMaterials.light = craftingMaterial;
			} else {
				deleteIds.push(craftingMaterial.id);
			}
		}
		await this.actor.deleteEmbeddedDocuments("Item", deleteIds);
	}

	private static async newMaterialTrove(
		actor: CharacterPF2eHeroicCrafting,
		materialTrove: ContainerPF2e
	): Promise<MaterialTrove> {
		const trove = new MaterialTrove(actor, materialTrove);
		await trove.initializeGenericCraftingMaterials();
		await trove.setValue(trove.value);
		return trove;
	}

	static async getMaterialTrove(
		actor: CharacterPF2eHeroicCrafting,
		notifyOnFailure: boolean = true
	): Promise<MaterialTrove | undefined> {
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

		if (this.troves.has(actor.uuid)) return this.troves.get(actor.uuid);

		const trove = await this.newMaterialTrove(
			actor,
			materialTroves[0] as ContainerPF2e<CharacterPF2eHeroicCrafting>
		);
		this.troves.set(actor.uuid, trove);
		return trove;
	}

	static removeMaterialTrove(actor: CharacterPF2eHeroicCrafting): void {
		this.troves.delete(actor.uuid);
	}

	static async getValue(actor: CharacterPF2eHeroicCrafting): Promise<CoinsPF2e> {
		const materialTrove = await MaterialTrove.getMaterialTrove(actor);
		if (!materialTrove) return new game.pf2e.Coins();

		return materialTrove.value;
	}

	static async addValue(actor: CharacterPF2eHeroicCrafting, value: Coins) {
		const materialTrove = await MaterialTrove.getMaterialTrove(actor);
		if (!materialTrove) return;

		materialTrove.add(value);
	}

	static async subtractValue(actor: CharacterPF2eHeroicCrafting, value: Coins) {
		const materialTrove = await MaterialTrove.getMaterialTrove(actor);
		if (!materialTrove) return;

		materialTrove.subtract(value);
	}

	async syncValue() {
		await this.setValue(this.value);
	}

	async setValue(value: Coins) {
		const spendingLimitForLevel = HEROIC_CRAFTING_SPENDING_LIMIT.get(this.actor.level);
		if (!spendingLimitForLevel) {
			return;
		}
		const coinValue = new game.pf2e.Coins(value);

		const lightValue = CoinsPF2eUtility.multCoins(1 / 20, spendingLimitForLevel.week);
		const lightQuantity = Math.floor(coinValue.copperValue / lightValue.copperValue);
		const negligibleValue = CoinsPF2eUtility.copperValueToCoins(coinValue.copperValue % lightValue.copperValue);
		const negligibleQuantity = 1;

		const operations = [
			await this.getGenericCraftingMaterialUpdates(lightValue, lightQuantity, "light"),
			await this.getGenericCraftingMaterialUpdates(negligibleValue, negligibleQuantity, "negligible"),
		].reduce<{
			create: TreasureSource[];
			update: EmbeddedDocumentUpdateData[];
			delete: string[];
		}>(
			(accumulator, currentValue) => {
				if (currentValue.create != undefined) accumulator.create.push(currentValue.create);
				if (currentValue.update != undefined) accumulator.update.push(currentValue.update);
				if (currentValue.delete != undefined) accumulator.delete.push(currentValue.delete);
				return accumulator;
			},
			{ create: [], update: [], delete: [] }
		);

		for (const item of (await this.actor.createEmbeddedDocuments(
			"Item",
			operations.create
		)) as TreasurePF2e<CharacterPF2eHeroicCrafting>[]) {
			if (item.system.bulk.value === 0.1) {
				this.genericCraftingMaterials.light = item;
			} else {
				this.genericCraftingMaterials.negligible = item;
			}
		}
		await this.actor.updateEmbeddedDocuments("Item", operations.update);
		for (const item of (await this.actor.deleteEmbeddedDocuments(
			"Item",
			operations.delete
		)) as TreasurePF2e<CharacterPF2eHeroicCrafting>[]) {
			if (item.system.bulk.value === 0.1) {
				this.genericCraftingMaterials.light = undefined;
			} else {
				this.genericCraftingMaterials.negligible = undefined;
			}
		}

		this.value = coinValue;
	}

	async add(value: Coins) {
		const newValue = this.value.plus(value);
		await this.setValue(newValue);
	}

	async subtract(value: Coins) {
		const newValue = CoinsPF2eUtility.subCoins(this.value, value);
		await this.setValue(newValue);
	}

	private async getGenericCraftingMaterialUpdates(
		value: CoinsPF2e,
		quantity: number,
		bulk: "light" | "negligible"
	): Promise<{
		create?: TreasureSource;
		update?: EmbeddedDocumentUpdateData;
		delete?: string;
	}> {
		const genericCraftingMaterial = this.genericCraftingMaterials[bulk];
		const operations: {
			create?: TreasureSource;
			update?: EmbeddedDocumentUpdateData;
			delete?: string;
		} = {};
		if (value.copperValue > 0 && !genericCraftingMaterial) {
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
			foundry.utils.mergeObject(data, this.getUpdateDetails(value, quantity, bulk === "negligible"), {
				inplace: true,
			});
			operations.create = data;
			ui.notifications.info(`Generic Crafting Materials (${bulk} Bulk) Created`);
		}
		if (value.copperValue > 0 && !!genericCraftingMaterial) {
			const updateDetails: EmbeddedDocumentUpdateData = this.getUpdateDetails(
				value,
				quantity,
				bulk === "negligible"
			);
			operations.update = updateDetails;
		}

		if ((value.copperValue === 0 || quantity === 0) && !!genericCraftingMaterial) {
			operations.delete = genericCraftingMaterial.id;
			ui.notifications.info(`Generic Crafting Materials (${bulk} Bulk) Deleted`);
		}

		return operations;
	}

	private getUpdateDetails(price: Coins, quantity: number, isNegligibleBulk: boolean) {
		const id = isNegligibleBulk
			? this.genericCraftingMaterials.negligible?.id
			: this.genericCraftingMaterials.light?.id;
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
		if (isNegligibleBulk) {
			foundry.utils.mergeObject(
				updateDetails,
				{ system: { bulk: { value: 0, heldOrStowed: 0 } } },
				{ inplace: true }
			);
		}
		return updateDetails;
	}
}
