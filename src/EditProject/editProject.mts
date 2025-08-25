import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { Projects } from "../Projects/projects.mjs";
import { EditProjectApplication } from "./Applications/editProjectApplications.mjs";

export async function editProject(actor: CharacterPF2eHeroicCrafting, projectId: string) {
	const project = Projects.getProject(actor, projectId)!;
	if (!project) return;

	const newProjectDetails = await EditProjectApplication.getNewDetails({ actor, project });
	if (!newProjectDetails) return;
	await project.updateProject(newProjectDetails);
}
