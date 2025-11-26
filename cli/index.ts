#!/usr/bin/env node

import { parseArgs } from "node:util";
import { nextjsSetup } from "./frameworks/nextjs.js";
import { detectPackageManager, validatePackageJson } from "./utils/package-manager.js";
import { select, input as promptInput } from "./utils/prompts.js";
import type { FrameworkSetup, DrizzleConfig } from "./types.js";

const frameworks: FrameworkSetup[] = [
	nextjsSetup,
	// Add more frameworks here in the future
	// remixSetup,
	// svelteKitSetup,
];

async function main() {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			help: {
				type: "boolean",
				short: "h",
			},
			framework: {
				type: "string",
				short: "f",
			},
		},
		allowPositionals: true,
	});

	const command = positionals[0];

	// Show help
	if (values.help || !command) {
		showHelp();
		process.exit(0);
	}

	// Handle init command
	if (command === "init") {
		await handleInit(values.framework as string | undefined);
	} else {
		console.error(`Unknown command: ${command}`);
		showHelp();
		process.exit(1);
	}
}

async function handleInit(frameworkName?: string) {
	console.log("🎯 Ultra FileIO CLI\n");

	const cwd = process.cwd();

	// Validate package.json first
	const validation = validatePackageJson(cwd);
	if (!validation.valid) {
		console.error(`❌ ${validation.error}\n`);
		console.log("Current directory:", cwd);
		process.exit(1);
	}

	let selectedFramework: FrameworkSetup | undefined;

	// If framework specified, use it
	if (frameworkName) {
		selectedFramework = frameworks.find(
			(f) => f.name.toLowerCase().includes(frameworkName.toLowerCase()),
		);
		if (!selectedFramework) {
			console.error(`❌ Unknown framework: ${frameworkName}`);
			console.log("\nAvailable frameworks:");
			for (const fw of frameworks) {
				console.log(`  - ${fw.name}`);
			}
			process.exit(1);
		}
	} else {
		// Auto-detect framework
		console.log("🔍 Detecting framework...");
		for (const framework of frameworks) {
			if (await framework.detect()) {
				selectedFramework = framework;
				break;
			}
		}

		if (!selectedFramework) {
			console.error("❌ Could not detect framework");
			console.log("\nPlease specify a framework with --framework flag:");
			for (const fw of frameworks) {
				console.log(`  - ${fw.name}`);
			}
			process.exit(1);
		}

		console.log(`✅ Detected: ${selectedFramework.name}\n`);
	}

	// Detect package manager
	const packageManager = await detectPackageManager(cwd);
	console.log(`📦 Package manager: ${packageManager}\n`);

	// Prompt for ORM selection
	const orm = await select(
		"Which ORM do you want to use?",
		[
			{
				value: "prisma" as const,
				label: "Prisma",
				description: "Type-safe ORM with migrations and studio",
			},
			{
				value: "drizzle" as const,
				label: "Drizzle",
				description: "Lightweight TypeScript ORM",
			},
		],
		"prisma",
	);

	console.log(`✅ Selected ORM: ${orm}\n`);

	// If Drizzle, prompt for configuration
	let drizzleConfig: DrizzleConfig | undefined;
	if (orm === "drizzle") {
		console.log("🔧 Drizzle Configuration\n");

		const dbPath = await promptInput("Where is your Drizzle db instance exported?", {
			defaultValue: "@/lib/db",
			placeholder: "@/lib/db",
		});

		const filesSchemaPath = await promptInput(
			"Where is your files schema exported?",
			{
				defaultValue: "@/lib/schema",
				placeholder: "@/lib/schema",
			},
		);

		const usersSchemaPath = await promptInput(
			"Where is your users schema exported? (optional, press Enter to skip)",
			{
				placeholder: "@/lib/schema",
			},
		);

		drizzleConfig = {
			dbPath,
			filesSchemaPath,
			usersSchemaPath: usersSchemaPath || undefined,
		};

		console.log("");
	}

	// Run setup
	try {
		await selectedFramework.setup({
			packageManager,
			cwd,
			orm,
			drizzleConfig,
		});
	} catch (error) {
		console.error("\n❌ Setup failed:", error);
		process.exit(1);
	}
}

function showHelp() {
	console.log(`
Ultra FileIO CLI - Automatic setup for file upload in your web framework

Usage:
  ultra-fileio init [options]

Commands:
  init                 Initialize Ultra FileIO in your project

Options:
  -h, --help          Show this help message
  -f, --framework     Specify framework (auto-detected if not provided)

Available Frameworks:
  - Next.js App Router (nextjs)

Examples:
  ultra-fileio init                    # Auto-detect framework
  ultra-fileio init -f nextjs          # Force Next.js setup

For more information, visit: https://ultra-fileio.vercel.app/docs
`);
}

main().catch((error) => {
	console.error("Unexpected error:", error);
	process.exit(1);
});
