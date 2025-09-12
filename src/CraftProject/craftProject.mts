import { ChatMessagePF2e } from "../../types/src/module/chat-message";
import { PhysicalItemPF2e } from "../../types/src/module/item";
import { CheckRoll } from "../../types/src/module/system/check";
import { DegreeOfSuccessString } from "../../types/src/module/system/degree-of-success";
import { Rolled } from "../../types/types/foundry/client/dice/_module.mjs";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { fractionToPercent } from "../Helper/generics.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";
import { Projects } from "../Projects/projects.mjs";
import { ModifyProgressRuleElementHelper } from "../RuleElement/Helpers/ModifyProgressHelper.mjs";
import { CraftProjectApplication } from "./Applications/CraftProjectApplications.mjs";
import { CraftProjectUtility } from "./craftProjectUtility.mjs";
import { ProjectCraftDetails, ProjectCraftDuration } from "./types.mjs";

export async function craftProject(actor: CharacterPF2eHeroicCrafting, projectId: string) {
	if (!actor) return;
	if (!projectId) return;
	const projects = Projects.getProjects(actor);
	if (!projects) return;
	const project = projects.getProject(projectId);
	if (!project) return;

	const craftDetails = await CraftProjectApplication.getCraftDetails({ actor, projectId });
	if (!craftDetails) return;

	const totalCost = await CraftProjectUtility.getTotalCost(craftDetails.materialsSpent);
	const item = (await foundry.utils.fromUuid(project.itemData.uuid)) as PhysicalItemPF2e;

	async function getStatisticRollCallback(
		_roll: Rolled<CheckRoll>,
		outcome: DegreeOfSuccessString | null | undefined,
		message: ChatMessagePF2e,
		_event: Event | null
	) {
		if (message instanceof CONFIG.ChatMessage.documentClass) {
			if (!project || !craftDetails) return; // this should never happen
			const materials = await getMaterialsContext(craftDetails);

			const projectProgress = ModifyProgressRuleElementHelper.getProgress(
				actor,
				{
					criticalFailure: { ...totalCost, isNegative: true },
					failure: {},
					success: totalCost,
					criticalSuccess: totalCost,
				},
				[
					...item.getRollOptions(item.type),
					...actor.getRollOptions(),
					"action:craft",
					"action:craft-project",
					`heroic:crafting:duration:${craftDetails.duration}`,
				]
			);
			console.log("Heroic Crafting |", projectProgress);

			const projectMax = await project.max;
			const projectCur = project.value;
			const flavor = await foundry.applications.handlebars.renderTemplate(
				"modules/pf2e-heroic-crafting/templates/chat/craftProject/result.hbs",
				{
					item: item,
					actorUuid: actor.uuid,
					project: {
						id: project.id,
						max: await project.max,
						cur: projectCur,
						percent: fractionToPercent(
							UnsignedCoinsPF2e.getCopperValue(projectCur),
							UnsignedCoinsPF2e.getCopperValue(projectMax)
						),
					},
					itemLink: await foundry.applications.ux.TextEditor.enrichHTML(await project.itemLink, {
						rollData: item.getRollData(),
					}),
					craftDetails: JSON.stringify(craftDetails),
					materials,
					totalMaterialsSpent: totalCost,
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
		extraRollOptions: ["action:craft-project", "action:craft"],
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

async function getMaterialsContext(craftDetails?: ProjectCraftDetails) {
	if (!craftDetails) return [];
	const materials = [];
	if (craftDetails.materialsSpent.trove) {
		materials.push({
			item: {
				name: "Generic Crafting Material",
				img: "icons/tools/fasteners/nails-steel-brown.webp",
			},
			spent: craftDetails.materialsSpent.trove,
		});
	}
	if (craftDetails.materialsSpent.currency) {
		materials.push({
			item: {
				name: "Currency",
				img: "systems/pf2e/icons/equipment/treasure/currency/gold-pieces.webp",
			},
			spent: craftDetails.materialsSpent.currency,
		});
	}

	for (const treasureSpent of craftDetails.materialsSpent.treasure ?? []) {
		const treasure = await foundry.utils.fromUuid<PhysicalItemPF2e>(treasureSpent.uuid);
		if (!treasure) continue;

		materials.push({
			item: {
				name: treasure.name,
				img: treasure.img,
			},
			quantity: treasureSpent.quantity,
			spent: treasureSpent.value,
		});
	}
	return materials;
}
