export enum ForageCraftingResourcesRequest {
	GET_DC = "get-dc",
	ROLL_CHECK = "roll-check",
}

export type GetDCMessage = { request: ForageCraftingResourcesRequest.GET_DC; locationLevel: number; actorUuid: string };

export type RollCheckMessage = {
	request: ForageCraftingResourcesRequest.ROLL_CHECK;
	locationLevel: number;
	dc: number | undefined;
	actorUuid: string;
	receiver: string;
};

export type SocketMessage = GetDCMessage | RollCheckMessage;
