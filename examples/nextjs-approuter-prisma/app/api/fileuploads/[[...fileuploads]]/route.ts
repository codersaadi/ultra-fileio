import { isR2Configured,FlexibleFileService, PrismaFileRepository} from 'ultra-fileio'
import { fileUploadsHandler } from 'ultra-fileio/server'
import { getUserId } from '@/lib/get-user'
import { prisma } from '@/lib/prisma'
// Create repository
const fileRepository = new PrismaFileRepository(prisma)
let fileService: FlexibleFileService | null = null
if (isR2Configured) fileService = new FlexibleFileService(fileRepository)
// handlers
export const { GET, POST, PUT, PATCH, DELETE } = fileUploadsHandler({
  fileService,
  fileRepository,
  getUserId,
  basePath: '/api/fileuploads',
})
