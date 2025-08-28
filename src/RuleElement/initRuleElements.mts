export async function initRuleElements() {
	// TODO: Update all items to have the correct rule elements
	console.debug("Heroic Crafting | Initializing Rule Elements");
	const { ModifyProgressRuleElement } = await import("./modifyProgressElement.mjs");
	const { ModifyConstantRuleElement } = await import("./modifyConstantElement.mjs");
	const { TestRuleElement } = await import("./testElement.mjs");
	game.pf2e.RuleElements.custom.Test = TestRuleElement;
	game.pf2e.RuleElements.custom.ModifyProgress = ModifyProgressRuleElement;
	game.pf2e.RuleElements.custom.ModifyConstant = ModifyConstantRuleElement;
}
