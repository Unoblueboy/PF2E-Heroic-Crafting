import fs from "fs";
import path from "path";

const BUILD_PATH = path.join(".", "build");
const STATIC_PATH = path.join(".", "static");
const SOURCE_PATH = path.join(".", "src");
const STATIC_IGNORE = ["jsons"];

const DEV_BUILD = process.argv.length > 2 ? ["true", "dev"].includes(process.argv[2].toLowerCase()) : false;

if (!DEV_BUILD) {
	if (fs.existsSync(BUILD_PATH)) {
		console.log("Existing build folder found. Deleting...");
		fs.rmSync(BUILD_PATH, { recursive: true });
		console.log("Build folder deleted.");
	}

	console.log("Creating Build folder");
	fs.mkdirSync(BUILD_PATH);
}

console.log("Copying static folders/files");
fs.readdirSync(STATIC_PATH, { withFileTypes: true }).forEach((dirent) => {
	if (STATIC_IGNORE.includes(dirent.name)) return;
	const from = path.join(dirent.path, dirent.name);
	const to = path.join(BUILD_PATH, dirent.name);
	console.log(`Copying ${from} to ${to}`);
	fs.cpSync(from, to, { recursive: true });
});

console.log("Building source script");
fs.readdirSync(SOURCE_PATH, { withFileTypes: true }).forEach((dirent) => {
	const from = path.join(dirent.path, dirent.name);
	const to = path.join(BUILD_PATH, "scripts", dirent.name);
	console.log(`Copying ${from} to ${to}`);
	fs.cpSync(from, to, { recursive: true });
});
