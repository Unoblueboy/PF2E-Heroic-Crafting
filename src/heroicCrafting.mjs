import { copperValueToCoins } from "./helper/currency.mjs";
import { EditMaterialTrove } from "./Applications/EditMaterialTroveApplication.mjs";
import { salvage } from "./salvage/salvage.mjs";

const CRAFTING_MATERIAL_UUID = `Compendium.pf2e-heroic-crafting.heroic-crafting-items.Item.UFqgBzSfC8XfuKVg`;

const MATERIAL_TROVE_SLUG = "material-trove";
const CRAFTING_MATERIAL_SLUG = "generic-crafting-material";

const HEROIC_CRAFTING_SPENDING_LIMIT = {
	1: { hour: 30, day: 120, week: 600 },
	2: { hour: 50, day: 200, week: 1000 },
	3: { hour: 80, day: 320, week: 1600 },
	4: { hour: 150, day: 600, week: 3000 },
	5: { hour: 200, day: 800, week: 4000 },
	6: { hour: 300, day: 1200, week: 6000 },
	7: { hour: 500, day: 2000, week: 10000 },
	8: { hour: 700, day: 2800, week: 14000 },
	9: { hour: 1000, day: 4000, week: 20000 },
	10: { hour: 1500, day: 6000, week: 30000 },
	11: { hour: 2100, day: 8400, week: 42000 },
	12: { hour: 3000, day: 12000, week: 60000 },
	13: { hour: 4000, day: 16000, week: 80000 },
	14: { hour: 7000, day: 28000, week: 140000 },
	15: { hour: 10000, day: 40000, week: 200000 },
	16: { hour: 12500, day: 50000, week: 250000 },
	17: { hour: 20000, day: 80000, week: 400000 },
	18: { hour: 30000, day: 120000, week: 600000 },
	19: { hour: 50000, day: 200000, week: 1000000 },
	20: { hour: 80000, day: 320000, week: 1600000 },
}; // prices are in CP

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
		salvage,
	};
});

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

async function updateMaterialTroveValue(genericCraftingMaterials, actor, result, materialTrove) {
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
	const lightQuantity = Math.floor(result.newMaterialCopperValue / lightValue);
	const negligibleValue = result.newMaterialCopperValue % lightValue;

	if (lightQuantity > 0 && !bulkGenericCraftingMaterials) {
		var data = await fromUuid(CRAFTING_MATERIAL_UUID);
		data = { ...data, system: { containerId: materialTrove.id, equipped: { carryType: "stowed" } } };
		bulkGenericCraftingMaterials = await Item.implementation.create(data, { parent: actor });
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
	} // "system.bulk.value, system.bulk.heldOrStowed"

	if (negligibleValue > 0 && !negligibleGenericCraftingMaterials) {
		var data = await fromUuid(CRAFTING_MATERIAL_UUID);
		data = { ...data, system: { containerId: materialTrove.id, equipped: { carryType: "stowed" } } };
		negligibleGenericCraftingMaterials = await Item.implementation.create(data, { parent: actor });
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

async function editMaterialTrove(actor) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	const materialTrove = getMaterialTrove(actor);
	const genericCraftingMaterials = getGenericCraftingMaterials(actor);

	// Get current value of Generic Crafting Materials
	var CraftingMaterialsCopperValue = 0;

	for (const material of genericCraftingMaterials) {
		const materialSystem = material.system;
		CraftingMaterialsCopperValue += materialSystem.price.value.copperValue * materialSystem.quantity;
	}

	// Get new value of Generic Crafting Materials
	const result = await EditMaterialTrove(CraftingMaterialsCopperValue);
	if (!result) return;

	if (!(await useActorCoins(result, CraftingMaterialsCopperValue, actor))) {
		ui.notifications.error("Not enough coins in inventory");
		return;
	}

	await updateMaterialTroveValue(genericCraftingMaterials, actor, result, materialTrove);
}
