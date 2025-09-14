import { Rarity } from "../../types/src/module/data";
import { SpellPF2e } from "../../types/src/module/item";
import { PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { ItemUUID } from "../../types/types/foundry/common/documents/_module.mjs";
import { itemDataUuid, ProjectItemDetails } from "../BeginProject/types.mjs";
import { CharacterPF2eHeroicCrafting } from "../character.mjs";
import { FORMULA_PRICE, MODULE_ID, RARITIES } from "../Helper/constants.mjs";
import { UnsignedCoins } from "../Helper/currencyTypes.mjs";
import { getHeroicItemRollOptions } from "../Helper/item.mjs";
import { UnsignedCoinsPF2e } from "../Helper/unsignedCoins.mjs";

type PF2eHeroicCraftingFlags = {
	projects?: Record<string, ProjectItemDetails>;
};

function getPF2eHeroicCraftingFlags(actor: CharacterPF2eHeroicCrafting) {
	return actor.flags[MODULE_ID] as PF2eHeroicCraftingFlags | undefined;
}

export class Projects {
	static readonly collection: Map<string, Projects> = new Map<string, Projects>();

	private readonly actorProjectsMap: Map<string, AProject>;
	private readonly actor: CharacterPF2eHeroicCrafting;
	private readonly projectFactory: ProjectFactory;
	private constructor(actor: CharacterPF2eHeroicCrafting) {
		this.actor = actor;
		const projectObjects = getPF2eHeroicCraftingFlags(actor)?.projects ?? {};

		this.actorProjectsMap = new Map<string, AProject>();
		this.projectFactory = new ProjectFactory(actor);
		for (const [id, project] of Object.entries(projectObjects)) {
			this.actorProjectsMap.set(id, this.projectFactory.createProject(id, project));
		}
	}

	get ids() {
		return [...this.actorProjectsMap.keys()];
	}

	get projects() {
		return [...this.actorProjectsMap.values()];
	}

	static getProjects(actor: CharacterPF2eHeroicCrafting): Projects {
		if (this.collection.has(actor.uuid)) return this.collection.get(actor.uuid)!;

		const projects = new Projects(actor);
		this.collection.set(actor.uuid, projects);
		return projects;
	}

	static getProject(actor: CharacterPF2eHeroicCrafting, id: string): AProject | undefined {
		const projects = this.getProjects(actor);
		if (!projects) return;

		return projects.getProject(id);
	}

	static async deleteProject(actor: CharacterPF2eHeroicCrafting, id: string) {
		const projects = this.getProjects(actor);
		if (!projects) return;

		await projects.deleteProject(id);
	}

	getProject(id: string) {
		return this.actorProjectsMap.get(id);
	}

	async addProject(projectDetails: ProjectItemDetails) {
		const randomId = foundry.utils.randomID();
		const project = this.projectFactory.createProject(randomId, projectDetails);
		this.actorProjectsMap.set(randomId, project);
		await this.actor.update({ [`flags.${MODULE_ID}.projects.${randomId}`]: projectDetails });
		return project;
	}

	async deleteProject(id: string) {
		await this.actor.update({ [`flags.${MODULE_ID}.projects.-=${id}`]: null });
		return this.actorProjectsMap.delete(id);
	}

	hasProject(id: string) {
		return this.actorProjectsMap.has(id);
	}

	async getContextData() {
		return Promise.all([...this.actorProjectsMap.values()].map(async (x) => await x.getContextData()));
	}
}

class ProjectFactory {
	private readonly actor: CharacterPF2eHeroicCrafting;
	constructor(actor: CharacterPF2eHeroicCrafting) {
		this.actor = actor;
	}

	createProject(id: string, projectDetails: ProjectItemDetails): AProject {
		if (projectDetails.itemData.spellUuid) {
			return new ProjectWithSpell(projectDetails, { id, actor: this.actor });
		}
		return new Project(projectDetails, { id, actor: this.actor });
	}
}

export type ProjectContextData = {
	name: string;
	img: string;
	id: string;
	dc: number;
	batchSize: number;
	value: UnsignedCoins;
	max: UnsignedCoins;
	baseItem: PhysicalItemPF2e;
	itemLink: string;
	baseSpell?: SpellPF2e;
	spellRank?: number;
};

export abstract class AProject implements ProjectItemDetails {
	id: string;
	actor: CharacterPF2eHeroicCrafting;
	dc: number;
	batchSize: number;
	itemData: itemDataUuid;
	value: UnsignedCoins;
	protected baseItemPromise?: Promise<PhysicalItemPF2e>;
	constructor(projectDetails: ProjectItemDetails, data: { id: string; actor: CharacterPF2eHeroicCrafting }) {
		this.id = data.id;
		this.actor = data.actor;
		this.dc = projectDetails.dc;
		this.batchSize = projectDetails.batchSize;
		this.itemData = projectDetails.itemData;
		this.value = new UnsignedCoinsPF2e(projectDetails.value);
	}

	get baseItem(): Promise<PhysicalItemPF2e> {
		this.baseItemPromise ??= foundry.utils.fromUuid(this.itemData.uuid) as Promise<PhysicalItemPF2e>;
		return this.baseItemPromise;
	}

	abstract get itemLink(): Promise<string>;

	abstract get itemName(): Promise<string>;

	abstract get max(): Promise<UnsignedCoins>;

	get img(): Promise<string> {
		return this.baseItem.then((item) =>
			this.itemData.isFormula ? "icons/sundries/documents/blueprint-magical.webp" : item.img
		);
	}

	get description(): Promise<string> {
		return this.baseItem.then((item) => item.description);
	}

	abstract createItem(): Promise<PhysicalItemPF2e | undefined>;

	async setValue(value: UnsignedCoins) {
		this.value = new UnsignedCoinsPF2e(value);
		this.actor.update({ [`flags.${MODULE_ID}.projects.${this.id}.value`]: value });
	}

	async updateProject(details: ProjectItemDetails) {
		this.dc = details.dc;
		this.batchSize = details.batchSize;
		this.value = new UnsignedCoinsPF2e(details.value);
		this.itemData = details.itemData;
		await this.actor.update({ [`flags.${MODULE_ID}.projects.${this.id}`]: details });
	}

	async delete() {
		Projects.deleteProject(this.actor, this.id);
	}

	async getContextData(): Promise<ProjectContextData> {
		return {
			name: await this.itemName,
			img: await this.img,
			id: this.id,
			dc: this.dc,
			batchSize: this.batchSize,
			value: this.value,
			max: await this.max,
			baseItem: await this.baseItem,
			itemLink: await this.itemLink,
		};
	}

	async getRollOptions() {
		const item = await this.baseItem;
		return new Set([...this.actor.getRollOptions(), ...getHeroicItemRollOptions(item)]);
	}
}

class Project extends AProject {
	get itemName(): Promise<string> {
		return this.baseItem.then((item) => this.getItemName(item));
	}

	get itemLink(): Promise<string> {
		return this.baseItem.then((item) => this.getItemLink(item));
	}

	get max() {
		return this.baseItem.then((item) => {
			if (this.itemData.isFormula) return new UnsignedCoinsPF2e(FORMULA_PRICE.get(item.level));
			return UnsignedCoinsPF2e.multiplyCoins(this.batchSize, item.price.value);
		});
	}

	protected getItemName(item: PhysicalItemPF2e): string {
		if (this.itemData.isFormula) return `Formula: ${item.name}`;
		return item.name;
	}

	protected getItemLink(item: PhysicalItemPF2e): string {
		if (this.itemData.isFormula) return `Formula: ${item.link}`;
		return item.link;
	}

	async createItem(): Promise<PhysicalItemPF2e | undefined> {
		if (this.itemData.isFormula) {
			const formulas = this.actor.system.crafting?.formulas;
			if (!formulas) {
				return;
			}
			const uuid = this.itemData.uuid as ItemUUID;
			formulas.push({ uuid: uuid });
			this.actor.update({ "system.crafting.formulas": formulas });
			const newFormula = (await foundry.utils.fromUuid(uuid)) as PhysicalItemPF2e;
			ui.notifications.info(`Project Done, ${newFormula.name} Formula Created`);
		} else {
			const clone = (await this.baseItem).clone();
			clone.updateSource({ "system.quantity": this.batchSize });
			const newItem = await Item.implementation.create(clone.toObject(), { parent: this.actor });
			ui.notifications.info(`Project Done, ${newItem!.name} Created`);
		}
	}
}

class ProjectWithSpell extends Project {
	private baseSpellPromise?: Promise<SpellPF2e>;
	get baseSpell(): Promise<SpellPF2e> {
		this.baseSpellPromise ??= foundry.utils.fromUuid(this.itemData.spellUuid as string) as Promise<SpellPF2e>;
		return this.baseSpellPromise;
	}

	get itemName(): Promise<string> {
		return Promise.all([this.baseItem, this.baseSpell]).then(([item, spell]) => this.getSpellItemName(item, spell));
	}

	get itemLink(): Promise<string> {
		return Promise.all([this.baseItem, this.baseSpell]).then(([item, spell]) => this.getSpellItemLink(item, spell));
	}

	get itemRarity(): Promise<string> {
		return Promise.all([this.baseItem, this.baseSpell]).then(([item, spell]) =>
			this.getSpellItemRarity(item, spell)
		);
	}

	get description(): Promise<string> {
		return Promise.all([this.baseItem, this.baseSpell]).then(
			([item, spell]) => `<p>${spell.link}</p><hr />${item.description}`
		);
	}

	private getSpellItemName(item: PhysicalItemPF2e, spell: SpellPF2e): string {
		const itemSlug = item.slug;
		const spellName = spell.name;
		if (itemSlug?.startsWith("magic-wand")) {
			const rank = (item.level - 1) / 2;
			return `Wand of ${spell.name} (Rank ${rank})`;
		}
		if (itemSlug?.startsWith("scroll-of")) {
			const rank = (item.level + 1) / 2;
			return `Scroll of ${spell.name} (Rank ${rank})`;
		}

		return item.name + ` (${spellName})`;
	}

	private getSpellItemLink(item: PhysicalItemPF2e, spell: SpellPF2e): string {
		return item.link.replace(/(?<=^[^{]*\{).*(?=\}$)/, this.getSpellItemName(item, spell));
	}

	async createItem(): Promise<PhysicalItemPF2e | undefined> {
		const clone = (await this.baseItem).clone();

		const baseItem = await this.baseItem;
		const baseSpell = await this.baseSpell;
		const spellObject = baseSpell.toObject();
		spellObject.system.location.heightenedLevel = this.itemData.heightenedLevel;
		const description = clone.system.description.value;
		clone.updateSource({
			name: await this.itemName,
			"system.spell": spellObject,
			"system.description.value": `<p>${baseSpell.link}</p><hr />${description}`,
			"system.traits.value": [...baseItem.traits.union(baseSpell.traits)],
			"system.traits.rarity": this.getSpellItemRarity(baseItem, baseSpell),
		});

		clone.updateSource({ "system.quantity": this.batchSize });
		const newItem = await Item.implementation.create(clone.toObject(), { parent: this.actor });
		ui.notifications.info(`Project Done, ${newItem!.name} Created`);
		return newItem as PhysicalItemPF2e;
	}

	private getSpellItemRarity(item: PhysicalItemPF2e, spell: SpellPF2e): Rarity {
		const itemRarity = item.rarity;
		const itemRarityIndex = RARITIES.indexOf(itemRarity);
		const spellRarity = spell.rarity;
		const spellRarityIndex = RARITIES.indexOf(spellRarity);
		const rarityIndex = Math.max(itemRarityIndex, spellRarityIndex);
		return RARITIES[rarityIndex];
	}

	override async updateProject(details: ProjectItemDetails) {
		await super.updateProject(details);
		this.baseSpellPromise = foundry.utils.fromUuid(this.itemData.spellUuid as string) as Promise<SpellPF2e>;
	}

	override async getContextData(): Promise<ProjectContextData> {
		const data = await super.getContextData();
		const baseSpell = await this.baseSpell;
		data.baseSpell = baseSpell;
		data.spellRank = this.itemData.heightenedLevel ?? baseSpell.rank;
		return data;
	}
}
