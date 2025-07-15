import fs from "fs";
import path from "path";

export function buildStaticFiles() {
	console.log(`[${new Date().toISOString().substring(11, 19)}] Copying static folders/files`);
	fs.readdirSync(STATIC_PATH, { withFileTypes: true }).forEach((dirent) => {
		if (STATIC_IGNORE.includes(dirent.name)) return;
		const from = path.join(dirent.parentPath, dirent.name);
		const to = path.join(BUILD_PATH, dirent.name);
		console.log(`[${new Date().toISOString().substring(11, 19)}] Copying ${from} to ${to}`);
		fs.cpSync(from, to, { recursive: true });
	});
}

export const BUILD_PATH = path.join(".", "build");
export const STATIC_PATH = path.join(".", "static");
export const SOURCE_PATH = path.join(".", "src");
export const STATIC_IGNORE = ["jsons"];
