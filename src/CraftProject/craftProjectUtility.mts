import { PhysicalItemPF2e } from "../../types/src/module/item";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { UnsignedCoins } from "../Helper/currencyTypes.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";
import { BasicMaterials, ProjectCraftDetails, TreasureMaterialSpent, TreasurePostUseOperation } from "./types.mjs";

type a = BasicMaterials & {
	materials?: {
		value: UnsignedCoins;
		quantity?: number;
	}[];
};

export class CraftProjectUtility {
	static getTotalMaterialSpent(materialsSpent?: a): UnsignedCoinsPF2e {
		if (!materialsSpent) return new UnsignedCoinsPF2e(); // should never happen

		return UnsignedCoinsPF2e.sumCoins(
			materialsSpent.trove ?? {},
			materialsSpent.currency ?? {},
			...(materialsSpent.materials ?? []).map((treasure) =>
				UnsignedCoinsPF2e.multiplyCoins(treasure.quantity ?? 1, treasure.value)
			)
		);
	}

	static async useMaterialSpent(
		actor: CharacterPF2eHeroicCrafting,
		craftDetails: ProjectCraftDetails
	): Promise<void> {
		const materialsSpent = craftDetails.materialsSpent;
		if (materialsSpent.trove) {
			await MaterialTrove.subtractValue(actor, materialsSpent.trove);
		}
		if (materialsSpent.currency) {
			await actor.inventory.removeCoins(materialsSpent.currency);
		}
		for (const material of materialsSpent.materials ?? []) {
			const item = await foundry.utils.fromUuid<PhysicalItemPF2e>(material.uuid);
			if (!item) continue;
			await CraftProjectUtility.updateSpentTreasure(item, material);
		}
	}

	private static async updateSpentTreasure(item: PhysicalItemPF2e, material: TreasureMaterialSpent) {
		switch (material.postUseOperation) {
			case TreasurePostUseOperation.DELETE:
				await CraftProjectUtility.deleteItem(item);
				break;
			case TreasurePostUseOperation.DECREASE_VALUE:
				await CraftProjectUtility.decreaseTreasureValue(item, material);
				break;
			case TreasurePostUseOperation.NOTHING:
			default:
				break;
		}
	}

	private static async decreaseTreasureValue(item: PhysicalItemPF2e, material: TreasureMaterialSpent) {
		const basePrice = item.price.value;
		const materialSpent = material.value;
		const newPrice = UnsignedCoinsPF2e.subtractCoins(basePrice, materialSpent);
		const baseQuantity = item.quantity;
		const quantitySpent = material.quantity ?? 1;
		if (newPrice.copperValue === 0 && baseQuantity === quantitySpent) {
			await item.delete();
		} else if (newPrice.copperValue != 0 && baseQuantity === quantitySpent) {
			await item.update({ "system.price.value": newPrice });
		} else if (newPrice.copperValue === 0 && baseQuantity != quantitySpent) {
			await item.update({ "system.quantity": baseQuantity - quantitySpent });
		} else {
			await item.update({ "system.quantity": baseQuantity - quantitySpent });
			const clone = item.clone({
				system: { price: { value: newPrice }, quantity: quantitySpent },
			});
			await Item.implementation.create(clone.toObject(), { parent: item.actor });
		}
	}

	private static async deleteItem(item: PhysicalItemPF2e) {
		if (item.quantity > 1) {
			await item.update({ "system.quantity": item.quantity - 1 });
		} else {
			await item.delete();
		}
	}

	static async getMaterialsContext(craftDetails?: ProjectCraftDetails) {
		if (!craftDetails) return [];
		const materials = [];
		if (craftDetails.materialsSpent.trove) {
			materials.push({
				item: {
					name: "Generic Crafting Material",
					img: "icons/tools/fasteners/nails-steel-brown.webp",
				},
				spent: craftDetails.materialsSpent.trove,
			});
		}
		if (craftDetails.materialsSpent.currency) {
			materials.push({
				item: {
					name: "Currency",
					img: "systems/pf2e/icons/equipment/treasure/currency/gold-pieces.webp",
				},
				spent: craftDetails.materialsSpent.currency,
			});
		}

		for (const treasureSpent of craftDetails.materialsSpent.materials ?? []) {
			const treasure = await foundry.utils.fromUuid<PhysicalItemPF2e>(treasureSpent.uuid);
			if (!treasure) continue;

			materials.push({
				item: {
					name: treasure.name,
					img: treasure.img,
				},
				quantity: treasureSpent.quantity,
				spent: treasureSpent.value,
			});
		}
		return materials;
	}
}
