import { default as DocumentDirectory } from '../../applications/sidebar/document-directory.mjs';
import { default as WorldCollection } from '../abstract/world-collection.mjs';
import { default as Macro } from '../macro.mjs';
/**
 * The Collection of Macro documents which exist within the active World.
 * This Collection is accessible within the Game object as game.macros.
 */
export default class Macros<TMacro extends Macro> extends WorldCollection<TMacro> {
    static override documentName: "Macro";

    override get directory(): DocumentDirectory<TMacro>;

    override fromCompendium(document: TMacro): TMacro["_source"];
}
