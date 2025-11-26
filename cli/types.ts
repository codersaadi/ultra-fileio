export interface FrameworkSetup {
	name: string;
	detect: () => Promise<boolean>;
	setup: (options: SetupOptions) => Promise<void>;
}

export interface SetupOptions {
	packageManager: PackageManager;
	cwd: string;
	orm?: "prisma" | "drizzle";
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface FileTemplate {
	path: string;
	content: string;
}
