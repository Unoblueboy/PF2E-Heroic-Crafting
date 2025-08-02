import { CharacterPF2e } from "../../types/src/module/actor";
import { ForageDcDialog } from "./Applications/ForageDcDialog.mjs";
import { ForageLocationLevelDialog } from "./Applications/ForageLocationLevelDialog.mjs";
import { ForageCraftingResourcesRequest, GetDCMessage, SocketMessage } from "./types.mjs";

export async function forageCraftingResources(actor: CharacterPF2e) {
	if (!actor) return;
	if (!game.users.activeGM) {
		ui.notifications.info("A GM must be online for this function to run");
		return;
	}

	const locationLevel = await ForageLocationLevelDialog.GetLocationLevel();
	if (!locationLevel) return;

	if (!game.user.isGM && game.users.activeGM) {
		game.socket.emit("module.pf2e-heroic-crafting", {
			request: ForageCraftingResourcesRequest.GET_DC,
			locationLevel,
			actorUuid: actor.uuid,
		});
		return;
	}

	if (!game.users.activeGM) {
		ui.notifications.info("A GM must be online for this function to run");
		return;
	}
	// TODO: Handle case where GM runs this function

	const dc = await ForageDcDialog.GetDc(locationLevel);
	if (!dc) return;
}

game.socket.on("module.pf2e-heroic-crafting", (...[_message, userId]: [SocketMessage, string]) => {
	switch (_message.request) {
		case ForageCraftingResourcesRequest.GET_DC:
			getForageDc(_message, userId);
			break;

		default:
			break;
	}
});

async function getForageDc(message: GetDCMessage, userId: string) {
	if (!game.user.isActiveGM) return;

	const dc = await ForageDcDialog.GetDc(message.locationLevel);
	if (!dc) return;

	game.socket.emit("module.pf2e-heroic-crafting", {
		...message,
		request: ForageCraftingResourcesRequest.ROLL_CHECK,
		dc,
		receiver: userId,
	});
}
