import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PackageManager } from "../types.js";

export async function detectPackageManager(
	cwd: string,
): Promise<PackageManager> {
	// Check lock files
	if (existsSync(join(cwd, "bun.lockb"))) return "bun";
	if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
	if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
	if (existsSync(join(cwd, "package-lock.json"))) return "npm";

	// Default to npm
	return "npm";
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
