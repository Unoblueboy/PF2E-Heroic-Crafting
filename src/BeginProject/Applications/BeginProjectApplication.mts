import { ActorPF2e } from "../../../types/src/module/actor";
import { ProjectItemDetails } from "../types.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

type BeginProjectApplicationOptions = {
	actor: ActorPF2e;
	callback: (result: ProjectItemDetails | undefined) => void;
};

export class BeginProjectApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	actor: ActorPF2e;
	callback: (result: ProjectItemDetails | undefined) => void;
	constructor(options: BeginProjectApplicationOptions) {
		super(options as object);
		this.actor = options.actor;
		this.callback = options.callback;
	}

	static async GetItemDetails(actor: ActorPF2e): Promise<ProjectItemDetails | undefined> {
		return new Promise<ProjectItemDetails | undefined>((resolve) => {
			const app = new BeginProjectApplication({ actor, callback: resolve });
			app.render(true);
		});
	}
}
