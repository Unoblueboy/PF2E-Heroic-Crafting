import { EditMaterialTroveApplication } from "./Applications/EditMaterialTroveApplication.mjs";

const HEROIC_CRAFTING_PREFIX = "Compendium.pf2e-heroic-crafting.heroic-crafting";
const HEROIC_CRAFTING_ITEMS_PREFIX = `${HEROIC_CRAFTING_PREFIX}-items.Item`;
const MATERIAL_TROVE_UUID = `${HEROIC_CRAFTING_ITEMS_PREFIX}.wtpSAjQwSyPOglzU`;
const CRAFTING_MATERIAL_UUID = `${HEROIC_CRAFTING_ITEMS_PREFIX}.UFqgBzSfC8XfuKVg`;

Hooks.on("init", () => {
	game.pf2eHeroicCrafting = {
		editMaterialTrove,
	};
});

async function editMaterialTrove(actor) {
	if (!actor) {
		ui.notifications.error("An actor must be selected");
		return;
	}

	// Heroic Crafting Items
	const heroicCraftingItems = actor.items.filter((x) => x.sourceId.startsWith(HEROIC_CRAFTING_ITEMS_PREFIX));

	// Get Material Trove
	const materialTroves = heroicCraftingItems.filter((x) => x.sourceId == MATERIAL_TROVE_UUID);

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
	const materialTrove = materialTroves[0];

	// Get Generic Crafting Materials
	const genericCraftingMaterials = heroicCraftingItems.filter((x) => x.sourceId == CRAFTING_MATERIAL_UUID);
	if (genericCraftingMaterials.length == 0) {
		var data = await fromUuid(CRAFTING_MATERIAL_UUID);
		data = { ...data, system: { containerId: materialTrove.id, equipped: { carryType: "stowed" } } };
		console.log(data);
		const newMaterials = Item.implementation.create(data, { parent: actor });
		genericCraftingMaterials.push(newMaterials);
		ui.notifications.info("Generic Crafting Materials Created");
	}

	// Consolidate Money
	var CraftingMaterialsCopperValue = 0;

	for (const material of genericCraftingMaterials) {
		const materialSystem = material.system;
		CraftingMaterialsCopperValue += materialSystem.price.value.copperValue * materialSystem.quantity;
	}

	new EditMaterialTroveApplication(CraftingMaterialsCopperValue).render(true);
}
