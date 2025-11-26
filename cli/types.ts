export interface FrameworkSetup {
	name: string;
	detect: () => Promise<boolean>;
	setup: (options: SetupOptions) => Promise<void>;
}

export interface SetupOptions {
	packageManager: PackageManager;
	cwd: string;
	orm: "prisma" | "drizzle";
	drizzleConfig?: DrizzleConfig;
}

export interface DrizzleConfig {
	dbPath: string; // e.g., "@/lib/db"
	filesSchemaPath: string; // e.g., "@/lib/schema"
	usersSchemaPath?: string; // Optional, e.g., "@/lib/schema"
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface FileTemplate {
	path: string;
	content: string;
}
