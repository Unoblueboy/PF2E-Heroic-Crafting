import { ActorPF2e } from '../actor/index.ts';
import { SkillSlug } from '../actor/types.ts';
import { DatabaseCreateOperation, DatabaseDeleteCallbackOptions, DatabaseUpdateCallbackOptions } from '../../../types/foundry/common/abstract/_types.d.mts';
import { default as Document } from '../../../types/foundry/common/abstract/document.d.mts';
import { DocumentFlags } from '../../../types/foundry/common/data/_module.mjs';
import { TokenDocumentPF2e } from '../scene/index.ts';
import { EncounterPF2e } from './index.ts';
declare class CombatantPF2e<TParent extends EncounterPF2e | null = EncounterPF2e | null, TTokenDocument extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends Combatant<TParent, TTokenDocument> {
    #private;
    static createDocuments<TDocument extends Document>(this: ConstructorOf<TDocument>, data?: (TDocument | DeepPartial<TDocument["_source"]>)[], operation?: Partial<DatabaseCreateOperation<TDocument["parent"]>>): Promise<TDocument[]>;
    /** Get the active Combatant for the given actor, creating one if necessary */
    static fromActor(actor: ActorPF2e, render?: boolean, options?: {
        combat?: EncounterPF2e;
    }): Promise<CombatantPF2e<EncounterPF2e> | null>;
    get encounter(): TParent;
    /** The round this combatant last had a turn */
    get roundOfLastTurn(): number | null;
    /** Can the user see this combatant's name? */
    get playersCanSeeName(): boolean;
    overridePriority(initiative: number): number | null;
    hasHigherInitiative(this: RolledCombatant<NonNullable<TParent>>, { than }: {
        than: RolledCombatant<NonNullable<TParent>>;
    }): boolean;
    startTurn(): Promise<void>;
    endTurn(options: {
        round: number;
    }): Promise<void>;
    prepareBaseData(): void;
    /** Toggle the defeated status of this combatant, applying or removing the overlay icon on its token */
    toggleDefeated({ to, overlayIcon }?: {
        to?: boolean | undefined;
        overlayIcon?: boolean | undefined;
    }): Promise<void>;
    /**
     * Hide the tracked resource if the combatant represents a non-player-owned actor
     * @todo Make this a configurable with a metagame-knowledge setting
     */
    updateResource(): {
        value: number;
    } | null;
    _getInitiativeFormula(): string;
    /** Toggle the visibility of names to players */
    toggleNameVisibility(): Promise<void>;
    protected _onUpdate(changed: DeepPartial<this["_source"]>, options: DatabaseUpdateCallbackOptions, userId: string): void;
    protected _onDelete(options: DatabaseDeleteCallbackOptions, userId: string): void;
}
interface CombatantPF2e<TParent extends EncounterPF2e | null = EncounterPF2e | null, TTokenDocument extends TokenDocumentPF2e | null = TokenDocumentPF2e | null> extends Combatant<TParent, TTokenDocument> {
    flags: CombatantFlags;
}
type CombatantFlags = DocumentFlags & {
    pf2e: {
        initiativeStatistic: SkillSlug | "perception" | null;
        roundOfLastTurn: number | null;
        roundOfLastTurnEnd: number | null;
        overridePriority: Record<number, number | null | undefined>;
    };
};
type RolledCombatant<TEncounter extends EncounterPF2e> = CombatantPF2e<TEncounter, TokenDocumentPF2e> & {
    initiative: number;
};
export { CombatantPF2e };
export type { CombatantFlags, RolledCombatant };
