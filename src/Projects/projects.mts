import { CharacterPF2e } from "../../types/src/module/actor";
import { Rarity } from "../../types/src/module/data";
import { SpellPF2e } from "../../types/src/module/item";
import { Coins, CoinsPF2e, PhysicalItemPF2e } from "../../types/src/module/item/physical";
import { ItemUUID } from "../../types/types/foundry/common/documents/_module.mjs";
import { itemDataUuid, ProjectItemDetails } from "../BeginProject/types.mjs";
import { FORMULA_PRICE, MODULE_ID, RARITIES } from "../Helper/constants.mjs";
import { CoinsPF2eUtility } from "../Helper/currency.mjs";

type PF2eHeroicCraftingFlags = {
	projects?: Record<string, ProjectItemDetails>;
};

function getPF2eHeroicCraftingFlags(actor: CharacterPF2e) {
	return actor.flags[MODULE_ID] as PF2eHeroicCraftingFlags | undefined;
}

export class Projects {
	static readonly collection: Map<string, Projects> = new Map<string, Projects>();

	private readonly actorProjectsMap: Map<string, Project>;
	private readonly actor: CharacterPF2e;
	private readonly projectFactory: ProjectFactory;
	private constructor(actor: CharacterPF2e) {
		this.actor = actor;
		const projectObjects = getPF2eHeroicCraftingFlags(actor)?.projects ?? {};

		this.actorProjectsMap = new Map<string, Project>();
		this.projectFactory = new ProjectFactory(actor);
		for (const [id, project] of Object.entries(projectObjects)) {
			this.actorProjectsMap.set(id, this.projectFactory.createProduct(id, project));
		}
	}

	get ids() {
		return [...this.actorProjectsMap.keys()];
	}

	get projects() {
		return [...this.actorProjectsMap.values()];
	}

	static getProjects(actor: CharacterPF2e): Projects | undefined {
		if (this.collection.has(actor.uuid)) return this.collection.get(actor.uuid);

		const projects = new Projects(actor);
		this.collection.set(actor.uuid, projects);
		return projects;
	}

	static getProject(actor: CharacterPF2e, id: string): Project | undefined {
		const projects = this.getProjects(actor);
		if (!projects) return;

		return projects.getProject(id);
	}

	static async deleteProject(actor: CharacterPF2e, id: string) {
		const projects = this.getProjects(actor);
		if (!projects) return;

		await projects.deleteProject(id);
	}

	getProject(id: string) {
		return this.actorProjectsMap.get(id);
	}

	async addProject(projectDetails: ProjectItemDetails) {
		const randomId = foundry.utils.randomID();
		this.actorProjectsMap.set(randomId, this.projectFactory.createProduct(randomId, projectDetails));
		await this.actor.update({ [`flags.${MODULE_ID}.projects.${randomId}`]: projectDetails });
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
	private readonly actor: CharacterPF2e;
	constructor(actor: CharacterPF2e) {
		this.actor = actor;
	}

	createProduct(id: string, projectDetails: ProjectItemDetails): Project {
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
	value: CoinsPF2e;
	max: CoinsPF2e;
};

export abstract class AProject implements ProjectItemDetails {
	id: string;
	actor: CharacterPF2e;
	dc: number;
	batchSize: number;
	itemData: itemDataUuid;
	value: CoinsPF2e;
	protected baseItemPromise?: Promise<PhysicalItemPF2e>;
	constructor(projectDetails: ProjectItemDetails, data: { id: string; actor: CharacterPF2e }) {
		this.id = data.id;
		this.actor = data.actor;
		this.dc = projectDetails.dc;
		this.batchSize = projectDetails.batchSize;
		this.itemData = projectDetails.itemData;
		this.value = new game.pf2e.Coins(projectDetails.value);
	}

	get baseItem(): Promise<PhysicalItemPF2e> {
		this.baseItemPromise ??= foundry.utils.fromUuid(this.itemData.uuid) as Promise<PhysicalItemPF2e>;
		return this.baseItemPromise;
	}

	abstract get itemLink(): Promise<string>;

	abstract get itemName(): Promise<string>;

	abstract get max(): Promise<CoinsPF2e>;

	get img(): Promise<string> {
		return this.baseItem.then((item) =>
			this.itemData.isFormula ? "icons/sundries/documents/blueprint-magical.webp" : item.img
		);
	}

	get description(): Promise<string> {
		return this.baseItem.then((item) => item.description);
	}

	abstract createItem(): Promise<PhysicalItemPF2e | undefined>;

	async setValue(value: Coins) {
		this.value = new game.pf2e.Coins(value);
		this.actor.update({ [`flags.${MODULE_ID}.projects.${this.id}.value`]: value });
	}

	async updateProject(details: ProjectItemDetails) {
		this.dc = details.dc;
		this.batchSize = details.batchSize;
		this.value = new game.pf2e.Coins(details.value);
		this.itemData = details.itemData;
		this.actor.update({ [`flags.${MODULE_ID}.projects.${this.id}`]: details });
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
		};
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
			if (this.itemData.isFormula) return new game.pf2e.Coins(FORMULA_PRICE.get(item.level));
			return CoinsPF2eUtility.multCoins(this.batchSize, item.price.value);
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
		return item.link.replace(/(?<={).*(?=})/, this.getSpellItemName(item, spell));
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
}
