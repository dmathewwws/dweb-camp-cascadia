import { sql } from 'drizzle-orm'
import { text, index, sqliteTable, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  did: text('did').notNull().primaryKey(),
  name: text('name'),
  avatar: text('avatar'),
  socials: text('socials'), // JSON array of strings: ["platform:handle", "platform:handle"]
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  // Required by the host console's admin "Block" action, which writes this
  // column directly through its D1 binding to this app's database.
  blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
  createdAt : integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_users_created_at').on(table.createdAt),
])

// Type inference for TypeScript
export type User = typeof users.$inferSelect
export type UserInsert = typeof users.$inferInsert

export const photos = sqliteTable('photos', {
  id: text('id').notNull().primaryKey(), // crypto.randomUUID(), also the R2 key segment
  did: text('did').notNull(), // uploader; verified JWT iss
  fullKey: text('full_key').notNull(),
  thumbKey: text('thumb_key').notNull(),
  contentType: text('content_type').notNull(),
  // Client-reported pixel dimensions of the full image, used only for aspect-ratio layout
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('idx_photos_created_at').on(table.createdAt),
  index('idx_photos_did').on(table.did),
])

export type Photo = typeof photos.$inferSelect
export type PhotoInsert = typeof photos.$inferInsert
