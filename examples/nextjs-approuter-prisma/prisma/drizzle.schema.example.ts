// /**
//  * DRIZZLE SCHEMA EXAMPLE
//  *
//  * This is an example of how to define your File schema using Drizzle ORM.
//  * Copy this to your project and adapt as needed.
//  *
//  * Installation:
//  * npm install drizzle-orm @libsql/client
//  * # or for PostgreSQL:
//  * npm install drizzle-orm pg
//  */

// import { bigint, pgTable, text, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core';

// // NOTE: Import your users table from wherever you define it
// // import { users } from './users.schema';

// /**
//  * Files table schema for Drizzle ORM
//  */
// export const files = pgTable(
//   'files',
//   {
//     id: uuid('id').primaryKey().defaultRandom(),

//     // R2 Storage Information
//     r2Key: text('r2_key').notNull().unique(),

//     // Basic file metadata
//     originalFilename: varchar('original_filename', { length: 512 }).notNull(),
//     fileSize: bigint('file_size', { mode: 'number' }).notNull(),

//     // Public URL for direct access
//     publicUrl: text('public_url').notNull(),

//     // Ownership
//     uploadedBy: text('uploaded_by').notNull(),
//     // If you have a users table, add the foreign key:
//     // .references(() => users.id, { onDelete: 'cascade' }),

//     // Timestamps
//     createdAt: timestamp('created_at', { withTimezone: true })
//       .defaultNow()
//       .notNull(),
//   },
//   t => [
//     // Essential indexes
//     index('files_r2_key_idx').on(t.r2Key),
//     index('files_uploaded_by_idx').on(t.uploadedBy),
//     index('files_created_at_idx').on(t.createdAt),
//   ]
// );

// // ============================================================================
// // TYPE EXPORTS
// // ============================================================================

// export type FileRecord = typeof files.$inferSelect;
// export type FileInsert = typeof files.$inferInsert;
