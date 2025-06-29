import fs from "fs";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const SHOW_LOGS = process.argv.length > 2 ? process.argv[2].toLowerCase() == "true" : false;

const folders = fs
	.readdirSync("./static/jsons", { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name);

const CWD = process.cwd();

for (const folder of folders) {
	if (SHOW_LOGS) console.log(`Compiling ${folder}`);
	await compilePack(`${CWD}/static/jsons/${folder}`, `${CWD}/build/packs/${folder}`, { log: SHOW_LOGS });
}
