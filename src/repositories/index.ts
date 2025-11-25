/**
 * REPOSITORY INDEX - ORM-AGNOSTIC FILE STORAGE
 *
 * Export all repository-related types and classes
 */

// Interfaces and types
export * from './file.repository.interface';

// Base repository
export * from './base.repository';

// Adapters
export { DrizzleFileRepository } from './adapters/drizzle.adapter';
// export { PrismaFileRepository } from './adapters/prisma.adapter'; // Uncomment when using Prisma

// Re-export flexible service
export * from '../file.service';
