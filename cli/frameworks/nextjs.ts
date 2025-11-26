import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import {
	drizzleDbTemplate,
	drizzleEnvTemplate,
	drizzleRouteHandlerTemplate,
	drizzleSchemaTemplate,
	envTemplate,
	fileUploadButtonTemplate,
	fileUploadTemplate,
	getUserTemplate,
	prismaClientTemplate,
	prismaSchema,
	routeHandlerTemplate,
} from "../templates/nextjs.js";
import type { FrameworkSetup, SetupOptions, PackageManager } from "../types.js";
import { fileExists, updatePrismaSchema, writeFiles } from "../utils/files.js";
import { getInstallCommand, getRunCommand } from "../utils/package-manager.js";

const execAsync = promisify(exec);

export const nextjsSetup: FrameworkSetup = {
	name: "Next.js App Router",

	async detect(): Promise<boolean> {
		const cwd = process.cwd();
		// Check for Next.js
		const packageJsonPath = join(cwd, "package.json");
		if (!existsSync(packageJsonPath)) return false;

		try {
			const packageJson = await import(packageJsonPath, {
				with: { type: "json" },
			});
			const deps = {
				...packageJson.default.dependencies,
				...packageJson.default.devDependencies,
			};

			// Check for Next.js and App Router structure
			return deps.next !== undefined && existsSync(join(cwd, "app"));
		} catch {
			return false;
		}
	},

	async setup(options: SetupOptions): Promise<void> {
		const { packageManager, cwd, orm, drizzleConfig } = options;

		console.log("🚀 Setting up Ultra FileIO for Next.js App Router...\n");
		console.log(`📦 ORM: ${orm}\n`);

		if (orm === "prisma") {
			await setupPrisma({ packageManager, cwd });
		} else if (orm === "drizzle") {
			await setupDrizzle({ packageManager, cwd, drizzleConfig });
		}

		// Common success message
		console.log("\n✨ Setup complete! \n");
		console.log("Next steps:");
		console.log(
			"1. Update .env.local with your R2/S3 and database credentials",
		);
		console.log("2. Update lib/get-user.ts with your auth implementation");
		console.log("3. Import FileUpload component in your pages:");
		console.log("   import FileUpload from '@/components/FileUpload'");
		console.log("4. Start your dev server and test the upload");
		console.log("\nAPI endpoints created:");
		console.log("  POST   /api/fileuploads - Upload a file");
		console.log("  GET    /api/fileuploads - List user files");
		console.log("  GET    /api/fileuploads/{id} - Get file details");
		console.log("  DELETE /api/fileuploads/{id} - Delete a file");
		console.log("  POST   /api/fileuploads/presigned - Get presigned URL");
		console.log(
			"  POST   /api/fileuploads/complete - Complete presigned upload\n",
		);
	},
};

// ============================================================================
// PRISMA SETUP
// ============================================================================

async function setupPrisma({
	packageManager,
	cwd,
}: {
	packageManager: PackageManager;
	cwd: string;
}): Promise<void> {
	// 1. Install dependencies
	console.log("📦 Installing dependencies...");
	const dependencies = [
		"ultra-fileio",
		"@aws-sdk/client-s3",
		"@aws-sdk/s3-request-presigner",
		"sharp",
		"zod",
		"@prisma/client",
		"clsx",
		"tailwind-merge",
		"lucide-react",
	];
	const devDependencies = ["prisma"];

	try {
		const installCmd = getInstallCommand(packageManager, dependencies);
		console.log(`   Running: ${installCmd}`);
		await execAsync(installCmd, { cwd });

		const devInstallCmd = getInstallCommand(packageManager, devDependencies);
		console.log(`   Running: ${devInstallCmd}`);
		await execAsync(devInstallCmd, { cwd });
		console.log("✅ Dependencies installed\n");
	} catch (error) {
		console.error("\n❌ Failed to install dependencies");
		console.error("   Error:", error instanceof Error ? error.message : error);
		console.log("\n💡 You can install dependencies manually:");
		console.log(`   ${getInstallCommand(packageManager, dependencies)}`);
		console.log(`   ${getInstallCommand(packageManager, devDependencies)}`);
		console.log("\n⚠️  Continuing with file creation...\n");
	}

	// 2. Create files
	console.log("\n📝 Creating files...");
	const files = [
		routeHandlerTemplate,
		prismaClientTemplate,
		getUserTemplate,
		fileUploadButtonTemplate,
		fileUploadTemplate,
	];

	try {
		await writeFiles(cwd, files);
		console.log(
			"   ✅ Created app/api/fileuploads/[[...fileuploads]]/route.ts",
		);
		console.log("   ✅ Created lib/prisma.ts");
		console.log("   ✅ Created lib/get-user.ts");
		console.log("   ✅ Created components/FileUploadButton.tsx");
		console.log("   ✅ Created components/FileUpload.tsx");
	} catch (error) {
		console.error("❌ Failed to create files:", error);
		throw error;
	}

	// 3. Update or create Prisma schema
	console.log("\n🗄️  Setting up Prisma schema...");
	try {
		await updatePrismaSchema(cwd, prismaSchema);
		console.log("   ✅ Updated prisma/schema.prisma");
	} catch (error) {
		console.error("❌ Failed to update Prisma schema:", error);
		throw error;
	}

	// 4. Create .env.local if it doesn't exist
	const envPath = join(cwd, ".env.local");
	const envExists = await fileExists(envPath);

	if (!envExists) {
		console.log("\n🔐 Creating .env.local...");
		try {
			await writeFiles(cwd, [{ path: ".env.local", content: envTemplate }]);
			console.log("   ✅ Created .env.local");
			console.log("   ⚠️  Please update .env.local with your R2/S3 credentials");
		} catch (error) {
			console.error("❌ Failed to create .env.local:", error);
		}
	}

	// 5. Run Prisma commands
	console.log("\n🔨 Running Prisma migrations...");
	try {
		const migrateCmd = getRunCommand(
			packageManager,
			"prisma migrate dev --name init",
		);
		console.log(`   Running: ${migrateCmd}`);
		await execAsync(migrateCmd, { cwd });

		const generateCmd = getRunCommand(packageManager, "prisma generate");
		console.log(`   Running: ${generateCmd}`);
		await execAsync(generateCmd, { cwd });

		console.log("   ✅ Prisma setup complete");
	} catch (error) {
		console.log(
			"   ⚠️  Prisma migration skipped (you may need to run it manually)",
		);
	}

	console.log("\nPrisma files created:");
	console.log(
		"  📁 app/api/fileuploads/[[...fileuploads]]/route.ts - API handler",
	);
	console.log("  📁 lib/prisma.ts - Prisma client");
	console.log("  📁 lib/get-user.ts - Auth helper");
	console.log("  📁 components/FileUploadButton.tsx - Upload UI components");
	console.log("  📁 components/FileUpload.tsx - Ready-to-use upload component");
	console.log("  📁 prisma/schema.prisma - Database schema");
}

// ============================================================================
// DRIZZLE SETUP
// ============================================================================

async function setupDrizzle({
	packageManager,
	cwd,
	drizzleConfig,
}: {
	packageManager: PackageManager;
	cwd: string;
	drizzleConfig?: {
		dbPath: string;
		filesSchemaPath: string;
		usersSchemaPath?: string;
	};
}): Promise<void> {
	if (!drizzleConfig) {
		throw new Error("Drizzle configuration is required");
	}

	// 1. Install dependencies
	console.log("📦 Installing dependencies...");
	const dependencies = [
		"ultra-fileio",
		"@aws-sdk/client-s3",
		"@aws-sdk/s3-request-presigner",
		"sharp",
		"zod",
		"drizzle-orm",
		"postgres",
		"clsx",
		"tailwind-merge",
		"lucide-react",
	];
	const devDependencies = ["drizzle-kit", "@types/pg"];

	try {
		const installCmd = getInstallCommand(packageManager, dependencies);
		console.log(`   Running: ${installCmd}`);
		await execAsync(installCmd, { cwd });

		const devInstallCmd = getInstallCommand(packageManager, devDependencies);
		console.log(`   Running: ${devInstallCmd}`);
		await execAsync(devInstallCmd, { cwd });
		console.log("✅ Dependencies installed\n");
	} catch (error) {
		console.error("\n❌ Failed to install dependencies");
		console.error("   Error:", error instanceof Error ? error.message : error);
		console.log("\n💡 You can install dependencies manually:");
		console.log(`   ${getInstallCommand(packageManager, dependencies)}`);
		console.log(`   ${getInstallCommand(packageManager, devDependencies)}`);
		console.log("\n⚠️  Continuing with file creation...\n");
	}

	// 2. Create files
	console.log("\n📝 Creating files...");
	const files = [
		drizzleRouteHandlerTemplate(
			drizzleConfig.dbPath,
			drizzleConfig.filesSchemaPath,
			drizzleConfig.usersSchemaPath,
		),
		drizzleDbTemplate,
		drizzleSchemaTemplate,
		getUserTemplate,
		fileUploadButtonTemplate,
		fileUploadTemplate,
	];

	try {
		await writeFiles(cwd, files);
		console.log(
			"   ✅ Created app/api/fileuploads/[[...fileuploads]]/route.ts",
		);
		console.log("   ✅ Created lib/db.ts");
		console.log("   ✅ Created lib/schema.ts");
		console.log("   ✅ Created lib/get-user.ts");
		console.log("   ✅ Created components/FileUploadButton.tsx");
		console.log("   ✅ Created components/FileUpload.tsx");
	} catch (error) {
		console.error("❌ Failed to create files:", error);
		throw error;
	}

	// 3. Create .env.local if it doesn't exist
	const envPath = join(cwd, ".env.local");
	const envExists = await fileExists(envPath);

	if (!envExists) {
		console.log("\n🔐 Creating .env.local...");
		try {
			await writeFiles(cwd, [
				{ path: ".env.local", content: drizzleEnvTemplate },
			]);
			console.log("   ✅ Created .env.local");
			console.log(
				"   ⚠️  Please update .env.local with your R2/S3 and database credentials",
			);
		} catch (error) {
			console.error("❌ Failed to create .env.local:", error);
		}
	}

	// 4. Create drizzle.config.ts
	console.log("\n🔧 Creating Drizzle config...");
	const drizzleConfigContent = `import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./lib/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
`;

	try {
		await writeFiles(cwd, [
			{ path: "drizzle.config.ts", content: drizzleConfigContent },
		]);
		console.log("   ✅ Created drizzle.config.ts");
	} catch (error) {
		console.error("❌ Failed to create drizzle.config.ts:", error);
	}

	console.log("\nDrizzle files created:");
	console.log(
		"  📁 app/api/fileuploads/[[...fileuploads]]/route.ts - API handler",
	);
	console.log("  📁 lib/db.ts - Drizzle client");
	console.log("  📁 lib/schema.ts - Database schema");
	console.log("  📁 lib/get-user.ts - Auth helper");
	console.log("  📁 components/FileUploadButton.tsx - Upload UI components");
	console.log("  📁 components/FileUpload.tsx - Ready-to-use upload component");
	console.log("  📁 drizzle.config.ts - Drizzle configuration");

	console.log("\n📝 Next Drizzle steps:");
	console.log("  1. Update DATABASE_URL in .env.local");
	console.log("  2. Run migrations: npx drizzle-kit push");
	console.log("  3. (Optional) Use Drizzle Studio: npx drizzle-kit studio");
}
