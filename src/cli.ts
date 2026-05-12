#!/usr/bin/env bun
import "./index.ts";
import path from "node:path";
import { program } from "commander";
import { defineConfig, run } from "./index.ts";

program.option(
	"-c, --config [string]",
	"Path to config file",
	"dowwntime.config.ts",
);

program.parse();

const options = program.opts<{
	config: string;
}>();

const configPath = options.config;

// Dynamically import the config file
const _path = path.resolve(process.cwd(), configPath);
const configModule = await import(_path);
const config = configModule.default;

if (!config || typeof config !== "object") {
	throw new Error(
		`Invalid config file: no or wrong default export found, was ${typeof config}`,
	);
}

// Run the main function with the loaded config
// Assuming the main function is named 'run' and is exported from index.ts
await run(defineConfig(config));
