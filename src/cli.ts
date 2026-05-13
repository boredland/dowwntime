#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { program } from "commander";
import { type DowwntimeOptions, defineConfig, run } from "./index.ts";
import "./index.ts";

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
	const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
	if (
		err.code !== "ERR_UNKNOWN_FILE_EXTENSION" ||
		!_path.endsWith(".ts") ||
		isBun
	)
		throw e;
	// Node can't import .ts configs directly; re-exec the CLI under bun so the
	// config (which may contain class instances like ConsoleAlert) loads natively.
	const result = spawnSync(
		"bun",
		[process.argv[1] ?? "", ...process.argv.slice(2)],
		{ stdio: "inherit" },
	);
	if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
		// biome-ignore lint/suspicious/noConsole: CLI user-facing error
		console.error(
			"dowwntime: loading a .ts config requires bun (or Node 24+). Install bun: https://bun.sh",
		);
		process.exit(1);
	}
	process.exit(result.status ?? 1);
}

const config = configModule.default;

if (!config || typeof config !== "object") {
	throw new Error(
		`Invalid config file: no or wrong default export found, was ${typeof config}`,
	);
}

await run(defineConfig(config as DowwntimeOptions));
