#!/usr/bin/env bun
import "./index.ts";
import path from "node:path";
import { program } from "commander";
import { type DowwntimeOptions, defineConfig, run } from "./index.ts";

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

const _path = path.resolve(process.cwd(), configPath);

let configModule: { default: unknown };
try {
	configModule = await import(_path);
} catch (e) {
	const err = e as NodeJS.ErrnoException;
	// bun's node-compat ESM loader rejects .ts extensions when the entry is .mjs;
	// spawn a bun subprocess to load and serialize the config instead.
	if (err.code !== "ERR_UNKNOWN_FILE_EXTENSION" || !_path.endsWith(".ts"))
		throw e;
	const proc = Bun.spawn(
		[
			"bun",
			"-e",
			`import c from ${JSON.stringify(_path)}; process.stdout.write(JSON.stringify(c.default ?? c))`,
		],
		{ stdout: "pipe", stderr: "inherit" },
	);
	await proc.exited;
	configModule = {
		default: JSON.parse(await new Response(proc.stdout).text()),
	};
}

const config = configModule.default;

if (!config || typeof config !== "object") {
	throw new Error(
		`Invalid config file: no or wrong default export found, was ${typeof config}`,
	);
}

await run(defineConfig(config as DowwntimeOptions));
