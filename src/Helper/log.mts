export function consoleDebug(shouldLog: boolean, ...message: unknown[]) {
	if (shouldLog) {
		console.debug("HEROIC CRAFTING | DEBUG |", ...message);
	}
}
