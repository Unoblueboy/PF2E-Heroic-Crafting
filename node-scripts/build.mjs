/* eslint-disable no-undef */
import fs from "fs";
import { buildStaticFiles, BUILD_PATH } from "./build-helper.mjs";

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

buildStaticFiles();
