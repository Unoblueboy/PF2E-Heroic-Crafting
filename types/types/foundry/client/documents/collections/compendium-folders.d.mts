import { ApplicationRenderOptions } from '../../applications/_types.mjs';
import { AppV1RenderOptions } from '../../appv1/api/application-v1.mjs';
import { DatabaseAction, DatabaseCreateOperation, DatabaseOperation } from '../../../common/abstract/_types.mjs';
import { Folder, FolderSource, User } from '../_module.mjs';
import { default as DocumentCollection } from '../abstract/document-collection.mjs';
import { default as CompendiumCollection } from './compendium-collection.mjs';
/**
 * A Collection of Folder documents within a Compendium pack.
 */
export default class CompendiumFolderCollection extends DocumentCollection<Folder> {
    constructor(pack: CompendiumCollection, data?: FolderSource[]);

    /**
     * The CompendiumCollection instance that contains this CompendiumFolderCollection
     */
    pack: CompendiumCollection;

    override get documentName(): "Folder";

    override render(force: boolean, options?: ApplicationRenderOptions | AppV1RenderOptions): void;

    override updateAll(
        transformation: Record<string, unknown> | ((document: Folder) => Record<string, unknown>),
        condition?: ((document: Folder) => boolean) | null,
        options?: DatabaseCreateOperation<null>,
    ): Promise<Folder[]>;

    override _onModifyContents(
        action: DatabaseAction,
        documents: Folder[],
        result: unknown[],
        operation: DatabaseOperation<null>,
        user: User,
    ): void;
}
