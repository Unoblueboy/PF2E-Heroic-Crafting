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

export function objectToString(obj: unknown): string {
	if (obj === null) return "null";
	switch (typeof obj) {
		case "undefined":
			return "undefined";
		case "boolean":
		case "number":
		case "bigint":
		case "symbol":
			return obj.toString();
		case "string":
			return `"${obj.toString()}"`;
		case "function":
			return obj.toString();
		case "object":
			return Array.isArray(obj) ? arrayToString(obj) : trueObjectToString(obj);
		default:
			return "";
	}
}

function trueObjectToString(obj: object): string {
	if (obj.toString !== Object.prototype.toString) {
		return obj.toString();
	}
	const keyValueList = Object.entries(obj).map(([k, v]: [string, unknown]) => `${k}: ${objectToString(v)}`);
	return "{" + keyValueList.join(", ") + "}";
}

function arrayToString(obj: unknown[]): string {
	const keyValueList = obj.map((v: unknown) => objectToString(v));
	return "[" + keyValueList.join(", ") + "]";
}
