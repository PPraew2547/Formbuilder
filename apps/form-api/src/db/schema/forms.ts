    import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

    export const forms = pgTable('forms', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    slug: text('slug').notNull().unique(),
    status: text('status'),
    currentVersion: integer('current_version'),
    title: text('title'),
    description: text('description'),
    locale: text('locale'),
    isActive: boolean('is_active'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    })