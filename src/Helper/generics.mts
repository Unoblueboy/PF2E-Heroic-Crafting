type Only<T, U> = {
	[P in keyof T]: T[P];
} & {
	[P in keyof U]?: never;
};

export type Either<T, U> = Only<T, U> | Only<U, T>;
export function fractionToPercent(numerator: number, denominator: number) {
	const projectProgressFraction = Math.clamp(numerator / (denominator || 1), 0, 1);
	const projectProgressPercent = projectProgressFraction.toLocaleString("en", {
		style: "percent",
		maximumFractionDigits: 2,
	});
	return projectProgressPercent;
}
