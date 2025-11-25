import { getUserId } from "@/lib/get-user";
import { prisma } from "@/lib/prisma";
import {
	FlexibleFileService,
	PrismaFileRepository,
	isR2Configured,
} from "ultra-fileio";
import { fileUploadsHandler } from "ultra-fileio/server";
// Create repository
const fileRepository = new PrismaFileRepository(prisma);
let fileService: FlexibleFileService | null = null;
if (isR2Configured) fileService = new FlexibleFileService(fileRepository);
// handlers
export const { GET, POST, PUT, PATCH, DELETE } = fileUploadsHandler({
	fileService,
	fileRepository,
	getUserId,
	basePath: "/api/fileuploads",
});
