import { default as AdaptiveIlluminationShader } from '../illumination-lighting.mjs';
import { default as AdaptiveColorationShader } from '../coloration-lighting.mjs';
/**
 * Allow coloring of illumination
 */
export class TorchIlluminationShader extends AdaptiveIlluminationShader {
}
/**
 * Torch animation coloration shader
 */
export class TorchColorationShader extends AdaptiveColorationShader {
    /** @inheritdoc */
    static defaultUniforms: {
        ratio: number;
        brightnessPulse: number;
        technique: number;
        shadows: number;
        contrast: number;
        saturation: number;
        colorationAlpha: number;
        intensity: number;
        attenuation: number;
        color: number[];
        time: number;
        hasColor: boolean;
        screenDimensions: number[];
        useSampler: boolean;
        primaryTexture: null;
        depthTexture: null;
        darknessLevelTexture: null;
        depthElevation: number;
        ambientBrightest: number[];
        ambientDarkness: number[];
        ambientDaylight: number[];
        weights: number[];
        dimLevelCorrection: number;
        brightLevelCorrection: number;
        computeIllumination: boolean;
        globalLight: boolean;
        globalLightThresholds: number[];
    };
}
