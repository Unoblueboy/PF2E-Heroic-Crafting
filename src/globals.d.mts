import { GamePF2e } from "../types/src/global";

interface GamePF2eHeroicCrafting extends GamePF2e {
	pf2eHeroicCrafting: Record<string, unknown>;
}

declare global {
	namespace globalThis {
		const game: GamePF2eHeroicCrafting;
		const libWrapper: {
			register: (
				package_id: string,
				target: number | string,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
				fn: Function,
				type?: string,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				options?: { chain?: boolean; perf_mode?: string; bind?: any[] }
			) => number;
		};

		const Handlebars: {
			registerHelper: (
				name: string,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
				fn: Function
			) => void;
		};
	}
}
