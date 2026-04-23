import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  role: text('role'),
  isActive: boolean('is_active'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})