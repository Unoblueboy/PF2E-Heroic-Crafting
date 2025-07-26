import { ActorPF2e } from "../../types/src/module/actor";
import { EquipmentPF2e, TreasurePF2e } from "../../types/src/module/item";
import {
	MATERIAL_TROVE_SLUG,
	CRAFTING_MATERIAL_SLUG,
	CRAFTING_MATERIAL_UUID,
	HEROIC_CRAFTING_SPENDING_LIMIT,
} from "../Helper/constants.mjs";
import { copperValueToCoins } from "../Helper/currency.mjs";

import { EditMaterialTroveApplication } from "./Applications/EditMaterialTroveApplication.mjs";
import { EditMaterialTroveApplicationResult } from "./Applications/types.mjs";

export function getMaterialTrove(actor: ActorPF2e, errorOnFailure: boolean = true) {
	// Get Material Trove
	const materialTroves = actor.items.filter((x) => x?.slug == MATERIAL_TROVE_SLUG);

	if (materialTroves.length == 0) {
		if (errorOnFailure)
			ui.notifications.error(
				"No Material Trove Found, please add a material trove from the Heroic Crafting Items Compendium"
			);
		return;
	}
	if (materialTroves.length > 1) {
		if (errorOnFailure)
			ui.notifications.error(
				"Multiple Material Troves Found, please make sure that you only have one Material Trove"
			);
	}
	return materialTroves[0] as EquipmentPF2e;
}
function getGenericCraftingMaterials(actor: ActorPF2e) {
	// Get Generic Crafting Materials
	return actor.items.filter((x) => x?.slug == CRAFTING_MATERIAL_SLUG) as TreasurePF2e[];
}

async function useActorCoins(
	result: EditMaterialTroveApplicationResult,
	CraftingMaterialsCopperValue: number,
	actor: ActorPF2e
) {
	if (result.useActorCoins) {
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
	actor: ActorPF2e,
	newMaterialCopperValue: number,
	materialTrove?: EquipmentPF2e,
	genericCraftingMaterials?: TreasurePF2e[]
) {
	genericCraftingMaterials ??= getGenericCraftingMaterials(actor);
	materialTrove ??= getMaterialTrove(actor);
	if (!materialTrove) {
		ui.notifications.error("Material Trove not found, update failed");
		return;
	}

	const spendingLimitForLevel = HEROIC_CRAFTING_SPENDING_LIMIT.get(actor.level);
	if (!spendingLimitForLevel) {
		return;
	}

	const lightValue = spendingLimitForLevel.week / 20;
	const lightQuantity = Math.floor(newMaterialCopperValue / lightValue);
	const negligibleValue = newMaterialCopperValue % lightValue;
	const negligibleQuantity = 1;

	await updateGenericCraftingMaterials(
		actor,
		lightQuantity,
		lightValue,
		false,
		genericCraftingMaterials,
		materialTrove
	);
	await updateGenericCraftingMaterials(
		actor,
		negligibleQuantity,
		negligibleValue,
		true,
		genericCraftingMaterials,
		materialTrove
	);
}

async function updateGenericCraftingMaterials(
	actor: ActorPF2e,
	quantity: number,
	value: number,
	isNegligibleBulk: boolean,
	genericCraftingMaterials: TreasurePF2e[],
	materialTrove: EquipmentPF2e
) {
	let genericCraftingMaterial = null;
	for (const craftingMaterial of genericCraftingMaterials) {
		if (
			(craftingMaterial.system.bulk.value == 0 && isNegligibleBulk) ||
			(craftingMaterial.system.bulk.value > 0 && !isNegligibleBulk)
		) {
			if (!genericCraftingMaterial) {
				genericCraftingMaterial = craftingMaterial;
			} else {
				craftingMaterial.delete();
			}
		}
	}

	if (value > 0 && !genericCraftingMaterial) {
		const data = (await fromUuid(CRAFTING_MATERIAL_UUID)) as TreasurePF2e;
		const clone = data.clone({
			system: { containerId: materialTrove.id, equipped: { carryType: "stowed", handsHeld: 0, inSlot: false } },
		});
		genericCraftingMaterial = await Item.implementation.create(clone.toObject(), { parent: actor });
		createCraftingMaterialNotifications(isNegligibleBulk, "Created");
	}
	if (value > 0 && !!genericCraftingMaterial) {
		const updateDetails: Record<string, unknown> = getUpdateDetails(actor, value, quantity, isNegligibleBulk);
		genericCraftingMaterial.update(updateDetails);
	}

	if (value == 0 && !!genericCraftingMaterial) {
		genericCraftingMaterial.delete();
		createCraftingMaterialNotifications(isNegligibleBulk, "Deleted");
	}
}

function getUpdateDetails(actor: ActorPF2e, value: number, quantity: number, isNegligibleBulk: boolean) {
	const updateDetails: Record<string, unknown> = {
		"system.level.value": actor.level,
		"system.price.value": copperValueToCoins(value),
		"system.quantity": quantity,
	};
	if (isNegligibleBulk) {
		updateDetails["system.bulk"] = {
			value: 0,
			heldOrStowed: 0,
		};
	}
	return updateDetails;
}

function createCraftingMaterialNotifications(isNegligibleBulk: boolean, operation: "Created" | "Deleted") {
	ui.notifications.info(
		`Generic Crafting Materials (${isNegligibleBulk ? "Negligible" : "Light"} Bulk) ${operation}`
	);
}

export async function addMaterialTroveValue(
	actor: ActorPF2e,
	addedCopperValue: number,
	materialTrove?: EquipmentPF2e,
	genericCraftingMaterials?: TreasurePF2e[]
) {
	let copperValue = await getCurrentMaterialTroveValue(actor, genericCraftingMaterials);
	copperValue += addedCopperValue;
	copperValue = Math.max(copperValue, 0);
	await updateMaterialTroveValue(actor, copperValue, materialTrove, genericCraftingMaterials);
}

export async function getCurrentMaterialTroveValue(actor: ActorPF2e, genericCraftingMaterials?: TreasurePF2e[]) {
	genericCraftingMaterials ??= getGenericCraftingMaterials(actor);

	let copperValue = 0;

	for (const material of genericCraftingMaterials) {
		const materialSystem = material.system;
		copperValue += materialSystem.price.value.copperValue * materialSystem.quantity;
	}

	return copperValue;
}

export async function editMaterialTrove(actor: ActorPF2e) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	const materialTrove = getMaterialTrove(actor);
	const genericCraftingMaterials = getGenericCraftingMaterials(actor);

	// Get current value of Generic Crafting Materials
	const CraftingMaterialsCopperValue = await getCurrentMaterialTroveValue(actor, genericCraftingMaterials);

	// Get new value of Generic Crafting Materials
	const result = (await EditMaterialTroveApplication.EditMaterialTrove(
		CraftingMaterialsCopperValue
	)) as EditMaterialTroveApplicationResult;
	if (!result) return;

	if (!(await useActorCoins(result, CraftingMaterialsCopperValue, actor))) {
		ui.notifications.error("Not enough coins in inventory");
		return;
	}

	await updateMaterialTroveValue(actor, result.newMaterialCopperValue, materialTrove, genericCraftingMaterials);
}
