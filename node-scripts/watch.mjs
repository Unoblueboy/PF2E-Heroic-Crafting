import fs from "fs";
import path from "path";

import { buildStaticFiles } from "./build-helper.mjs";

console.log(`Running initial build`);
buildStaticFiles();

const BUILD_PATH = path.join(".", "build");
const STATIC_PATH = path.join(".", "static");
const SOURCE_PATH = path.join(".", "src");
const STATIC_IGNORE = ["jsons"];

fs.watch(STATIC_PATH, { recursive: true }, (eventType, fileName) => {
	if (!fileName || STATIC_IGNORE.includes(fileName.split(path.sep)[0])) return;
	const from = path.join(STATIC_PATH, fileName);
	const to = path.join(BUILD_PATH, fileName);
	updateSystem(eventType, fileName, from, to);
});

function updateSystem(eventType, fileName, from, to) {
	if (!fs.existsSync(from)) {
		if (!fs.existsSync(to)) return;
		console.log(`[${new Date().toISOString().substring(11, 19)}] ${from} deleted: Deleting ${fileName} from ${to}`);
		fs.rmSync(to, { recursive: true });
		return;
	}

	console.log(`${fileName} ${eventType == "changed" ? "updated" : "created"}: Copying ${from} to ${to}`);
	fs.cpSync(from, to, { recursive: true });
}

console.log(
	`[${new Date()
		.toISOString()
		.substring(11, 19)}] Watching ${STATIC_PATH} and ${SOURCE_PATH} directories for file changes`
);
