import { default as AbstractWeatherShader } from './base-weather.mjs';
/**
 * Snow shader effect.
 */
export default class SnowShader extends AbstractWeatherShader {
    /** @inheritdoc */
    static defaultUniforms: {
        direction: number;
    };
    /** @inheritdoc */
    static fragmentShader: string;
}
