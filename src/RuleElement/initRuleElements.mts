import { consoleDebug } from "../Helper/log.mjs";

export async function initRuleElements() {
	consoleDebug(CONFIG.debug.ruleElement, "Initializing Rule Elements");
	const { ModifyProgressRuleElement } = await import("./modifyProgressElement.mjs");
	const { ModifyConstantRuleElement } = await import("./modifyConstantElement.mjs");
	game.pf2e.RuleElements.custom.ModifyProgress = ModifyProgressRuleElement;
	game.pf2e.RuleElements.custom.ModifyConstant = ModifyConstantRuleElement;
}
