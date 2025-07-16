import { ItemPF2e, PhysicalItemPF2e } from "../../types/src/module/item";

export function checkItemPhysical(item: ItemPF2e): item is PhysicalItemPF2e {
	return ["armor", "backpack", "book", "consumable", "equipment", "shield", "treasure", "weapon"].includes(item.type);
}
