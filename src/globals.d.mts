import { GamePF2e } from "../types/src/global";

interface GamePF2eHeroicCrafting extends GamePF2e {
	pf2eHeroicCrafting: Record<string, unknown>;
}

declare global {
	namespace globalThis {
		const game: GamePF2eHeroicCrafting;
	}
}
