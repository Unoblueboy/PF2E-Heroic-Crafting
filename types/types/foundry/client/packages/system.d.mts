import { default as ClientPackageMixin } from './client-package.mjs';
import { DataModelConstructionContext } from '../../common/abstract/_types.mjs';
import { default as BaseSystem, SystemSource } from '../../common/packages/base-system.mjs';
export default class System extends ClientPackageMixin(BaseSystem) {
    constructor(data: DeepPartial<SystemSource>, options?: DataModelConstructionContext<null>);

    protected override _configure(options?: Record<string, unknown>): void;
}
