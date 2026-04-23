import { pgTable, uuid, text, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'

export const formVersions = pgTable('form_versions', {
  id: uuid('id').defaultRandom().primaryKey(),

  formId: uuid('form_id'),

  version: integer('version'),

  schemaJson: jsonb('schema_json'),

  isPublished: boolean('is_published'),

  createdAt: timestamp('created_at'),
})