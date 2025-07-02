import fs from "fs";
import path from "path";

const BUILD_PATH = path.join(".", "build");
const STATIC_PATH = path.join(".", "static");
const SOURCE_PATH = path.join(".", "src");
const STATIC_IGNORE = ["jsons"];

fs.watch(SOURCE_PATH, { recursive: true }, (eventType, fileName) => {
	const from = path.join(SOURCE_PATH, fileName);
	const to = path.join(BUILD_PATH, "scripts", fileName);
	updateSystem(eventType, fileName, from, to);
});

fs.watch(STATIC_PATH, { recursive: true }, (eventType, fileName) => {
	if (STATIC_IGNORE.includes(fileName.split(path.sep)[0])) return;
	const from = path.join(STATIC_PATH, fileName);
	const to = path.join(BUILD_PATH, fileName);
	updateSystem(eventType, fileName, from, to);
});

function updateSystem(eventType, fileName, from, to) {
	if (!fs.existsSync(from)) {
		if (!fs.existsSync(to)) return;
		console.log(`${from} deleted: Deleting ${fileName} from ${to}`);
		fs.rmSync(to, { recursive: true });
		return;
	}

	console.log(`${fileName} ${eventType == "changed" ? "updated" : "created"}: Copying ${from} to ${to}`);
	fs.cpSync(from, to, { recursive: true });
}

console.log(`Watching ${STATIC_PATH} and ${SOURCE_PATH} directories for file changes`);
