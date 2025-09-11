import { SignedCoins } from "../../Helper/currency.mjs";
import { SignedCoinsPF2e } from "../../Helper/signedCoins.mjs";
import { UnsignedCoinsPF2e } from "../../Helper/unsignedCoins.mjs";
import { ModifyProgressSynthetic } from "../modifyProgressElement.mjs";

export class ModifyProgressRuleElementHelper {
	static getNewValue(current: SignedCoins, synthetic: ModifyProgressSynthetic): SignedCoins | undefined {
		switch (synthetic.operation) {
			case "multiply":
				return new SignedCoinsPF2e(current).multiply(synthetic.change);
			case "divide":
				if (synthetic.change === 0) return;
				return new SignedCoinsPF2e(current).multiply(1 / synthetic.change);
			case "add":
				if (synthetic.change === null) return;
				return new SignedCoinsPF2e(current).plus(synthetic.change);
			case "subtract":
				if (synthetic.change === null) return;
				return new SignedCoinsPF2e(current).subtract(synthetic.change);
			case "downgrade":
				if (synthetic.change === null) return;
				return SignedCoinsPF2e.minCoins(current, synthetic.change);
			case "upgrade":
				if (synthetic.change === null) return;
				return SignedCoinsPF2e.maxCoins(current, synthetic.change);
			case "override":
				if (synthetic.change === null) return;
				return synthetic.change;
			default:
				break;
		}
		return {};
	}

	static getSyntheticSummary(synthetic: ModifyProgressSynthetic): string | undefined {
		switch (synthetic.operation) {
			case "multiply":
				return `${synthetic.label}: ×${synthetic.change}`;
			case "divide":
				return `${synthetic.label}: /${synthetic.change}`;
			case "add":
				return `${synthetic.label}: +${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "subtract":
				return `${synthetic.label}: -${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "downgrade":
				return `${synthetic.label}: ↓${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "upgrade":
				return `${synthetic.label}: ↑${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			case "override":
				return `${synthetic.label}: =${UnsignedCoinsPF2e.toString(synthetic.change)}`;
			default:
				return;
		}
	}
}
