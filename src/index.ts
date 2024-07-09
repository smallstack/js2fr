#! /usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import { glob } from "glob";
import { JSONSchema7 } from "json-schema";
import { outdent } from "outdent";
import { compile } from "./js2fr";
import pkg from "../package.json";

const generatedCodeVersion = pkg.version;
const program = new Command();

program.description(
	"Generates Cloud Firestore helper functions for schema validation using JSON Schema."
);
program.argument("<input>", "input file containing JSON Schema or a glob pattern");
program.argument("<output>", "target file where js2fr will output security rule helpers");
program.option("--force", "overwrites existing js2fr code unconditionally");
program.option("--help", "displays this message");
program.option("--verbose", "enables progress logs during compilation");
program.parse(process.argv);

const options = program.opts();
const args = program.args;

const timestamp = Date.now();

const input = args[0] as string;
const output = args[1];
const isVerbose = options.verbose === true;
const isOverwriteAllowed = options.force === true;
const isOutputEmpty = !fs.existsSync(output);

function log(message: string) {
	console.log(message);
}

if (isVerbose) {
	log(`Resolving paths for ${input}`);
}

const files = glob.sync(input as string);

if (isVerbose) {
	log(`Found ${files.length} file${files.length > 1 ? "s" : ""}`);
}

const schemas: JSONSchema7[] = [];

for (const file of files) {
	if (isVerbose) log(`Reading ${file}`);
	const data: string = fs.readFileSync(file, { encoding: "utf-8" });
	schemas.push(JSON.parse(data));
}

const rules = [
	`// <js2fr version="${generatedCodeVersion}">`,
	compile(schemas),
	"// </js2fr>"
].join("\n");

if (output && isOutputEmpty) {
	if (isVerbose) log(`Creating ${output}`);
	fs.writeFileSync(output, rules);
} else if (output && !isOutputEmpty) {
	const outputContent = fs.readFileSync(output, {
		encoding: "utf-8"
	});
	const js2frRegex = /\/\/\s<js2fr version="(\d)\.(\d)\.(\d)">\n(.*)\n\/\/\s<\/js2fr>/gm;
	const js2frInfo = js2frRegex.exec(outputContent);

	if (js2frInfo === null) {
		if (isVerbose) log(`Appending <js2fr> to ${output}`);
		fs.writeFileSync(output, `${outputContent}\n\n${rules}\n`);
	} else {
		const oldVersion = js2frInfo.slice(1, 4).join(".");
		const oldMajorVersion = parseInt(js2frInfo[1], 10);
		const newMajorVersion = parseInt(generatedCodeVersion.split(".")[0], 10);
		const canOverwrite =
			oldVersion === generatedCodeVersion ||
			(oldMajorVersion === newMajorVersion && oldMajorVersion > 0);

		if (canOverwrite || isOverwriteAllowed) {
			if (isVerbose) log(`Updating js2fr tag in ${output}`);

			const newContent = outputContent.replace(js2frInfo[0], rules);
			fs.writeFileSync(output, newContent);
		} else {
			console.error(outdent`
            Output file contains a different major or pre-release version of js2fr code,
            and replacing it might break your configuration. If you know what you're doing,
            please use --force flag next time.
          `);
		}
	}
} else {
	log(rules);
}

if (isVerbose) log(`Finished in ${Date.now() - timestamp}ms`);

export { compile as convertJsonSchema } from "./js2fr";
