import { default as ClientPackageMixin } from './client-package.mjs';
import { DataModelConstructionContext } from '../../common/abstract/_types.mjs';
import { default as BaseWorld, WorldSource } from '../../common/packages/base-world.mjs';
import { default as Collection } from '../../common/utils/collection.mjs';
import { Module, PackageCompatibilityBadge, PackageManifestData, RelatedPackage, System } from './_module.mjs';
export default class World extends ClientPackageMixin(BaseWorld) {
    static override getVersionBadge(
        availability: number,
        data: Partial<PackageManifestData>,
        options?: { modules?: Collection<string, Module>; systems?: Collection<string, System> },
    ): PackageCompatibilityBadge | null;

    constructor(data: DeepPartial<WorldSource>, options?: DataModelConstructionContext<null>);

    /**
     * Provide data for a system badge displayed for the world which reflects the system ID and its availability
     * @param system A specific system to use, otherwise use the installed system.
     */
    getSystemBadge(system?: System): PackageCompatibilityBadge | null;

    static override _formatBadDependenciesTooltip(
        availability: number,
        data: Partial<PackageManifestData>,
        deps: Iterable<RelatedPackage>,
        options?: { modules?: Collection<string, Module>; systems?: Collection<string, System> },
    ): string;
}
