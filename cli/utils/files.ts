import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { constants } from "node:fs";
import type { FileTemplate } from "../types.js";

export async function ensureDir(dir: string): Promise<void> {
	try {
		await mkdir(dir, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}
}

export async function writeFiles(
	cwd: string,
	files: FileTemplate[],
): Promise<void> {
	for (const file of files) {
		const filePath = join(cwd, file.path);
		await ensureDir(dirname(filePath));
		await writeFile(filePath, file.content, "utf-8");
	}
}

export async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export async function updatePrismaSchema(
	cwd: string,
	fileModel: string,
): Promise<void> {
	const schemaPath = join(cwd, "prisma", "schema.prisma");
	const exists = await fileExists(schemaPath);

	if (!exists) {
		// Create new schema
		await ensureDir(dirname(schemaPath));
		await writeFile(schemaPath, fileModel, "utf-8");
	} else {
		// Append File model if it doesn't exist
		const content = await readFile(schemaPath, "utf-8");
		if (!content.includes("model File")) {
			await writeFile(schemaPath, `${content}\n\n${fileModel}`, "utf-8");
		}
	}
}
