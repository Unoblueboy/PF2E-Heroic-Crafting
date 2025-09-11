import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { MaterialTrove } from "../MaterialTrove/materialTrove.mjs";

const ChatMessage = CONFIG.ChatMessage.documentClass as typeof ChatMessagePF2e;

export async function forageCraftingResourcesChatButtonListener(
	message: ChatMessagePF2e,
	html: HTMLElement,
	_data: unknown
) {
	const forageResults = html.querySelector("[data-forage-results]");
	if (forageResults) forageResults.addEventListener("click", (e: Event) => addResourcesToTrove(e, message));
}

async function addResourcesToTrove(event: Event, message: ChatMessagePF2e): Promise<void> {
	const actor = message.actor as CharacterPF2eHeroicCrafting;

	const button = event.target as HTMLButtonElement;
	const div = event.currentTarget as HTMLDivElement;
	const data = { ...button.dataset, ...div.dataset };

	const forage = UnsignedCoinsPF2e.fromString(data.forageAmount ?? "");
	const materialTrove = await MaterialTrove.getMaterialTrove(actor);
	const duration = Number.parseInt(data.duration ?? "") || 1;
	const totalForage = UnsignedCoinsPF2e.multiplyCoins(duration, forage);
	await materialTrove?.add(totalForage);
	const durationString = duration === 1 ? "1 day" : "1 week";
	ChatMessage.create({
		style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
		speaker: ChatMessage.getSpeaker(actor),
		content: `<i>${actor.name} foraged ${totalForage} worth of crafting resources over ${durationString}</i>`,
	});
}
