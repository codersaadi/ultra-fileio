import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { PackageManager } from "../types.js";

export function validatePackageJson(cwd: string): {
	valid: boolean;
	error?: string;
} {
	const packageJsonPath = join(cwd, "package.json");

	if (!existsSync(packageJsonPath)) {
		return {
			valid: false,
			error: "package.json not found. Please run this command in a Next.js project directory.",
		};
	}

	try {
		const content = readFileSync(packageJsonPath, "utf-8");
		const packageJson = JSON.parse(content);

		if (!packageJson.name) {
			return {
				valid: false,
				error: "package.json is missing a 'name' field. Please fix your package.json.",
			};
		}

		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: `Invalid package.json: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

export async function detectPackageManager(
	cwd: string,
): Promise<PackageManager> {
	// Check lock files
	if (existsSync(join(cwd, "bun.lockb"))) return "bun";
	if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
	if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
	if (existsSync(join(cwd, "package-lock.json"))) return "npm";

	// No lock file found, ask user
	return await promptPackageManager();
}

async function promptPackageManager(): Promise<PackageManager> {
	const rl = readline.createInterface({ input, output });

	console.log("\n📦 No lock file detected. Which package manager would you like to use?");
	console.log("  1) npm (default)");
	console.log("  2) pnpm");
	console.log("  3) yarn");
	console.log("  4) bun");

	try {
		const answer = await rl.question("\nEnter your choice (1-4) or press Enter for npm: ");
		rl.close();

		switch (answer.trim()) {
			case "2":
				return "pnpm";
			case "3":
				return "yarn";
			case "4":
				return "bun";
			case "1":
			case "":
			default:
				return "npm";
		}
	} catch {
		rl.close();
		return "npm";
	}
}

export function getInstallCommand(
	packageManager: PackageManager,
	packages: string[],
): string {
	const pkgs = packages.join(" ");
	switch (packageManager) {
		case "bun":
			return `bun add ${pkgs}`;
		case "pnpm":
			return `pnpm add ${pkgs}`;
		case "yarn":
			return `yarn add ${pkgs}`;
		default:
			return `npm install ${pkgs}`;
	}
}

export function getDevInstallCommand(
	packageManager: PackageManager,
	packages: string[],
): string {
	const pkgs = packages.join(" ");
	switch (packageManager) {
		case "bun":
			return `bun add -d ${pkgs}`;
		case "pnpm":
			return `pnpm add -D ${pkgs}`;
		case "yarn":
			return `yarn add -D ${pkgs}`;
		default:
			return `npm install -D ${pkgs}`;
	}
}

export function getRunCommand(
	packageManager: PackageManager,
	script: string,
): string {
	switch (packageManager) {
		case "bun":
			return `bun ${script}`;
		case "pnpm":
			return `pnpm ${script}`;
		case "yarn":
			return `yarn ${script}`;
		default:
			return `npm run ${script}`;
	}
}
