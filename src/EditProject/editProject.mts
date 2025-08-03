import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { EditProjectApplication } from "./Applications/editProjectApplications.mjs";

export async function editProject(actor: CharacterPF2eHeroicCrafting, projectId: string) {
	const project = actor.projects?.getProject(projectId);
	if (!project) return;

	const newProjectDetails = await EditProjectApplication.getNewDetails({ actor, project });
	if (!newProjectDetails) return;
	await project.updateProject(newProjectDetails);
}
