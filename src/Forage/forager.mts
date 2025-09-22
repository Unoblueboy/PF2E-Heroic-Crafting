import type { CheckRoll, DegreeOfSuccessString, ChatMessagePF2e } from "foundry-pf2e";
import type { Rolled } from "foundry-pf2e/foundry/client/dice/roll.mjs";
import type { CharacterPF2eHeroicCrafting } from "../character.mjs";
import type { GetDCMessage, RollCheckMessage, SocketMessage } from "./types.mjs";

import { FORAGE_ROLL_OPTION, HEROIC_CRAFTING_GATHERED_INCOME } from "../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { ModifyProgressRuleElementHelper } from "../RuleElement/Helpers/ModifyProgressHelper.mjs";
import { ForageDcDialog } from "./Applications/ForageDcDialog.mjs";
import { ForageLocationLevelDialog } from "./Applications/ForageLocationLevelDialog.mjs";
import { ForageCraftingResourcesRequest } from "./types.mjs";

export async function forageCraftingResources(actor: CharacterPF2eHeroicCrafting) {
	if (!actor) return;
	if (!game.users.activeGM) {
		ui.notifications.info("A GM must be online for this function to run");
		return;
	}

	const locationLevel = await ForageLocationLevelDialog.GetLocationLevel();
	if (locationLevel === undefined) return;

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

	const dc = await ForageDcDialog.GetDc(locationLevel);
	if (dc === undefined) return;

	await rollForageCheck(actor, { dc, locationLevel });
}

export async function forageSocketListener(message: SocketMessage, userId: string): Promise<void> {
	switch (message.request) {
		case ForageCraftingResourcesRequest.GET_DC:
			await getForageDcSocket(message, userId);
			break;
		case ForageCraftingResourcesRequest.ROLL_CHECK:
			await rollForageCheckSocket(message, userId);
			break;

		default:
			break;
	}
}

async function getForageDcSocket(message: GetDCMessage, userId: string) {
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
async function rollForageCheckSocket(message: RollCheckMessage, _userId: string) {
	if (game.user.id !== message.receiver) return;
	if (message.dc === undefined) return;
	const actor = await foundry.utils.fromUuid<CharacterPF2eHeroicCrafting>(message.actorUuid);
	if (!actor) return;

	await rollForageCheck(actor, { dc: message.dc, locationLevel: message.locationLevel });
}

async function rollForageCheck(actor: CharacterPF2eHeroicCrafting, data: { dc: number; locationLevel: number }) {
	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			const gatheredIncome = new UnsignedCoinsPF2e(HEROIC_CRAFTING_GATHERED_INCOME.get(actor.level));
			const progress = ModifyProgressRuleElementHelper.getProgress(
				actor,
				{
					criticalSuccess: gatheredIncome,
					success: gatheredIncome,
					failure: {},
					criticalFailure: {},
				},
				new Set([FORAGE_ROLL_OPTION])
			);
			const forage = outcome ? CoinsPF2eUtility.toUnsignedCoins(progress[outcome]) : new UnsignedCoinsPF2e();
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/forage/result.hbs",
				{
					actor: actor,
					locationLevel: data.locationLevel,
					forage,
				}
			);
			if (flavor) {
				message.updateSource({ flavor: message.flavor + flavor });
			}
			ChatMessage.create(message.toObject());
		} else {
			console.error("PF2E Heroic Crafting | Unable to amend chat message with craft result.", message);
		}
	}

	actor.skills.survival.check.roll({
		dc: { value: data.dc, visible: false },
		extraRollOptions: [FORAGE_ROLL_OPTION],
		extraRollNotes: [
			{
				selector: "survival",
				text: "<strong>Success</strong> Add the amount listed on Table 2: Gathered Income for the location's level to your Material Trove each day. If you are a master in Survival, instead add twice as much..",
				outcome: ["success", "criticalSuccess"],
			},
			{
				selector: "survival",
				text: "<strong>Failure</strong> You find no materials.",
				outcome: ["failure", "criticalFailure"],
			},
		],
		label: await foundry.applications.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
			subtitle: "Survival Check",
			title: "Forage Crafting Resources",
		}),
		traits: ["downtime"],
		createMessage: false,
		callback: getStatisticRollCallback,
	});
}
