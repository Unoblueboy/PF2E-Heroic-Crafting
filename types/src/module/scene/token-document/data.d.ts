import { DocumentFlags } from '../../../../types/foundry/common/data/_module.d.mts';
import { ModelPropsFromSchema } from '../../../../types/foundry/common/data/fields.d.mts';
import { TokenSchema } from '../../../../types/foundry/common/documents/token.d.mts';
type TokenFlagsPF2e = DocumentFlags & {
    pf2e: {
        [key: string]: unknown;
        linkToActorSize: boolean;
        autoscale: boolean;
    };
};
type DetectionModeEntry = ModelPropsFromSchema<TokenSchema>["detectionModes"][number];
export type { DetectionModeEntry, TokenFlagsPF2e };
