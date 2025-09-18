import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { Projects } from "../Projects/projects.mjs";
import { CraftProjectApplication } from "./Applications/CraftProjectApplications.mjs";
import { CraftProjectUtility } from "./craftProjectUtility.mjs";
import { ProjectCraftDuration } from "./types.mjs";

export async function craftProject(actor: CharacterPF2eHeroicCrafting, projectId: string) {
	if (!actor) return;
	if (!projectId) return;
	const project = Projects.getProject(actor, projectId);
	if (!project) return;

	const craftDetails = await CraftProjectApplication.getCraftDetails({ actor, projectId });
	if (!craftDetails) return;

	const item = (await foundry.utils.fromUuid(project.itemData.uuid)) as PhysicalItemPF2e;

	const basicTotal = UnsignedCoinsPF2e.addCoins(project.value, craftDetails.cost);
	if (basicTotal.copperValue >= (await project.max).copperValue) {
		await foundry.applications.handlebars.loadTemplates([
			"modules/pf2e-heroic-crafting/templates/chat/craftProject/card-content.hbs",
		]);
		const flavor =
			(await foundry.applications.handlebars.renderTemplate("systems/pf2e/templates/chat/action/flavor.hbs", {
				action: { title: "Craft A Project", subtitle: "Auto Create" },
				outcome: "success",
				traits: [
					craftDetails.duration === ProjectCraftDuration.HOUR
						? {
								name: "exploration",
								description: "PF2E.TraitDescriptionExploration",
								label: "PF2E.TraitExploration",
						  }
						: {
								name: "downtime",
								description: "PF2E.TraitDescriptionDowntime",
								label: "PF2E.TraitDowntime",
						  },
					{
						name: "manipulate",
						description: "PF2E.TraitDescriptionManipulate",
						label: "PF2E.TraitManipulate",
					},
				],
			})) +
			(await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/auto-create.hbs",
				{
					craftDetails: JSON.stringify(craftDetails),
					actorUuid: actor.uuid,
					project: await project.getContextData(),
					item: item,
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(await project.itemLink, {
						rollData: item.getRollData(),
					}),
					materials: await CraftProjectUtility.getMaterialsContext(craftDetails),
					totalMaterialsSpent: CraftProjectUtility.getTotalMaterialSpent(craftDetails.materialsSpent),
					cost: craftDetails.cost,
					progress: craftDetails.progress,
				}
			));
		ChatMessage.create({
			style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
			speaker: ChatMessage.getSpeaker(actor),
			flavor: flavor,
			content: `${actor.name}`,
		});
		return;
	}

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			if (!project || !craftDetails) return; // this should never happen

			const projectProgress = craftDetails.progress;
			console.log("Heroic Crafting |", projectProgress);

			await foundry.applications.handlebars.loadTemplates([
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/card-content.hbs",
			]);
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/result.hbs",
				{
					craftDetails: JSON.stringify(craftDetails),
					actorUuid: actor.uuid,
					project: await project.getContextData(),
					item: item,
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(await project.itemLink, {
						rollData: item.getRollData(),
					}),
					materials: await CraftProjectUtility.getMaterialsContext(craftDetails),
					totalMaterialsSpent: CraftProjectUtility.getTotalMaterialSpent(craftDetails.materialsSpent),
					cost: craftDetails.cost,
					progress: craftDetails.progress,
					outcome,
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

	actor.skills?.crafting?.check?.roll({
		dc: { value: project.dc, visible: true },
		extraRollOptions: [...craftDetails.rollOptions],
		extraRollNotes: [
			{
				selector: "skill-check",
				text: "<strong>Success</strong> You work productively during this period. Add double this activity's Cost to the project's Current Value.",
				outcome: ["success", "criticalSuccess"],
			},
			{
				selector: "skill-check",
				text: "<strong>Failure</strong> You work unproductively during this period. Add half this activity's Cost to the project's Current Value.",
				outcome: ["failure"],
			},
			{
				selector: "skill-check",
				text: "<strong>Critical Failure</strong> You ruin your materials and suffer a setback while crafting. Deduct this activity's Cost from the project's Current Value. If this reduces the project's Current Value below 0, the project is ruined and must be started again.",
				outcome: ["criticalFailure"],
			},
		],
		label: await foundry.applications.handlebars.renderTemplate("systems/pf2e/templates/chat/action/header.hbs", {
			subtitle: "Crafting Check",
			title: "Craft A Project",
		}),
		traits: [craftDetails.duration === ProjectCraftDuration.HOUR ? "exploration" : "downtime", "manipulate"],
		createMessage: false,
		callback: getStatisticRollCallback,
	});
}
