export async function initRuleElements() {
	// TODO: Update all items to have the correct rule elements
	// TODO: Implement rule element into relevant property retrieval throughout codebase
	console.debug("Heroic Crafting | Initializing Rule Elements");
	const { ModifyProgressRuleElement } = await import("./modifyProgressElement.mjs");
	const { ModifyConstantRuleElement } = await import("./modifyConstantElement.mjs");
	game.pf2e.RuleElements.custom.ModifyProgress = ModifyProgressRuleElement;
	game.pf2e.RuleElements.custom.ModifyConstant = ModifyConstantRuleElement;
}
