import { copperValueToCoins } from "../helper/currency.mjs";
import { HEROIC_CRAFTING_SPENDING_LIMIT } from "../helper/limits.mjs";
import { EditMaterialTrove } from "./Applications/EditMaterialTroveApplication.mjs";

function getMaterialTrove(actor) {
	// Get Material Trove
	const materialTroves = actor.items.filter((x) => x?.slug == MATERIAL_TROVE_SLUG);

	if (materialTroves.length == 0) {
		ui.notifications.error(
			"No Material Trove Found, please add a material trove from the Heroic Crafting Items Compendium"
		);
		return;
	}
	if (materialTroves.length > 1) {
		ui.notifications.error(
			"Multiple Material Troves Found, please make sure that you only have one Material Trove"
		);
	}
	return materialTroves[0];
}
function getGenericCraftingMaterials(actor) {
	// Get Generic Crafting Materials
	return actor.items.filter((x) => x?.slug == CRAFTING_MATERIAL_SLUG);
}

async function useActorCoins(result, CraftingMaterialsCopperValue, actor) {
	if (!!result.useActorCoins) {
		const coinsToMoveCopper = result.newMaterialCopperValue - CraftingMaterialsCopperValue;
		if (coinsToMoveCopper < 0) {
			// Add Coins to character Sheet
			const coinsToMove = copperValueToCoins(-coinsToMoveCopper);
			actor.inventory.addCoins(coinsToMove);
		} else if (coinsToMoveCopper > 0) {
			// Take Coins from character Sheet
			const coinsToMove = copperValueToCoins(coinsToMoveCopper);
			return await actor.inventory.removeCoins(coinsToMove);
		}
	}
	return true;
}

async function updateMaterialTroveValue(
	actor,
	newMaterialCopperValue,
	materialTrove = null,
	genericCraftingMaterials = null
) {
	if (!genericCraftingMaterials) {
		genericCraftingMaterials = getGenericCraftingMaterials(actor);
	}
	if (!materialTrove) {
		materialTrove = getMaterialTrove(actor);
	}
	if (!materialTrove) {
		ui.notifications.error("Material Trove not found, update failed");
		return;
	}
	var bulkGenericCraftingMaterials = null;
	var negligibleGenericCraftingMaterials = null;
	for (const craftingMaterial of genericCraftingMaterials) {
		if (craftingMaterial.system.bulk.value > 0) {
			if (!bulkGenericCraftingMaterials) {
				bulkGenericCraftingMaterials = craftingMaterial;
			} else {
				craftingMaterial.delete();
			}
			continue;
		}

		if (!negligibleGenericCraftingMaterials) {
			negligibleGenericCraftingMaterials = craftingMaterial;
		} else {
			craftingMaterial.delete();
		}
	}

	const lightValue = HEROIC_CRAFTING_SPENDING_LIMIT[actor.level].week / 20;
	const lightQuantity = Math.floor(newMaterialCopperValue / lightValue);
	const negligibleValue = newMaterialCopperValue % lightValue;

	if (lightQuantity > 0 && !bulkGenericCraftingMaterials) {
		const data = await fromUuid(CRAFTING_MATERIAL_UUID);
		const clone = data.clone({
			system: { containerId: materialTrove.id, equipped: { carryType: "stowed", handsHeld: 0, inSlot: false } },
		});
		bulkGenericCraftingMaterials = await Item.implementation.create(clone, { parent: actor });
		ui.notifications.info("Generic Crafting Materials (Light Bulk) Created");
	}
	if (lightQuantity > 0) {
		await bulkGenericCraftingMaterials.update({
			"system.level.value": actor.level,
			"system.price.value": copperValueToCoins(lightValue),
			"system.quantity": lightQuantity,
		});
	}

	if (lightQuantity == 0 && !!bulkGenericCraftingMaterials) {
		bulkGenericCraftingMaterials.delete();
		ui.notifications.info("Generic Crafting Materials (Light Bulk) Deleted");
	}

	if (negligibleValue > 0 && !negligibleGenericCraftingMaterials) {
		const data = await fromUuid(CRAFTING_MATERIAL_UUID);
		const clone = data.clone({
			system: { containerId: materialTrove.id, equipped: { carryType: "stowed", handsHeld: 0, inSlot: false } },
		});
		negligibleGenericCraftingMaterials = await Item.implementation.create(clone, { parent: actor });
		ui.notifications.info("Generic Crafting Materials (Negligible Bulk) Created");
	}
	if (negligibleValue > 0) {
		negligibleGenericCraftingMaterials.update({
			"system.level.value": actor.level,
			"system.price.value": copperValueToCoins(negligibleValue),
			"system.quantity": 1,
			"system.bulk": {
				value: 0,
				heldOrStowed: 0,
			},
		});
	}

	if (negligibleValue == 0 && !!negligibleGenericCraftingMaterials) {
		negligibleGenericCraftingMaterials.delete();
		ui.notifications.info("Generic Crafting Materials (Negligible Bulk) Deleted");
	}
}

export async function addMaterialTroveValue(
	actor,
	addedCopperValue,
	materialTrove = null,
	genericCraftingMaterials = null
) {
	var copperValue = await getCurrentMaterialTroveValue(actor, genericCraftingMaterials);
	copperValue += addedCopperValue;
	copperValue = Math.max(copperValue, 0);
	await updateMaterialTroveValue(actor, copperValue, materialTrove, genericCraftingMaterials);
}

async function getCurrentMaterialTroveValue(actor, genericCraftingMaterials = null) {
	if (!genericCraftingMaterials) {
		genericCraftingMaterials = getGenericCraftingMaterials(actor);
	}

	var copperValue = 0;

	for (const material of genericCraftingMaterials) {
		const materialSystem = material.system;
		copperValue += materialSystem.price.value.copperValue * materialSystem.quantity;
	}

	return copperValue;
}

export async function editMaterialTrove(actor) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	const materialTrove = getMaterialTrove(actor);
	const genericCraftingMaterials = getGenericCraftingMaterials(actor);

	// Get current value of Generic Crafting Materials
	var CraftingMaterialsCopperValue = await getCurrentMaterialTroveValue(actor, genericCraftingMaterials);

	// Get new value of Generic Crafting Materials
	const result = await EditMaterialTrove(CraftingMaterialsCopperValue);
	if (!result) return;

	if (!(await useActorCoins(result, CraftingMaterialsCopperValue, actor))) {
		ui.notifications.error("Not enough coins in inventory");
		return;
	}

	await updateMaterialTroveValue(actor, result.newMaterialCopperValue, materialTrove, genericCraftingMaterials);
}

export const MATERIAL_TROVE_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.wtpSAjQwSyPOglzU`;
export const CRAFTING_MATERIAL_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.UFqgBzSfC8XfuKVg`;

export const MATERIAL_TROVE_SLUG = "material-trove";
export const CRAFTING_MATERIAL_SLUG = "generic-crafting-material";
