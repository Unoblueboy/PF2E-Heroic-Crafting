/* eslint-disable no-undef */
import fs from "fs";
import { extractPack } from "@foundryvtt/foundryvtt-cli";

const SHOW_LOGS = process.argv.length > 2 ? process.argv[2].toLowerCase() === "true" : false;

const folders = fs
	.readdirSync("./build/packs", { withFileTypes: true })
	.filter((dirent) => dirent.isDirectory())
	.map((dirent) => dirent.name);

const CWD = process.cwd();

for (const folder of folders) {
	if (SHOW_LOGS) console.log(`Extracting ${folder}`);
	await extractPack(`${CWD}/build/packs/${folder}`, `${CWD}/static/jsons/${folder}`, {
		clean: true,
		log: SHOW_LOGS,
		jsonOptions: { space: "\t" },
	});
}
