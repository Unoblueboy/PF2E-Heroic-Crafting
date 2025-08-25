export async function initRuleElements() {
	console.debug("Heroic Crafting | Initializing Rule Elements");
	const { ModifyProgressRuleElement } = await import("./modifyProgressElement.mjs");
	const { TestRuleElement } = await import("./testElement.mjs");
	game.pf2e.RuleElements.custom.Test = TestRuleElement;
	game.pf2e.RuleElements.custom.ModifyProgress = ModifyProgressRuleElement;
}
