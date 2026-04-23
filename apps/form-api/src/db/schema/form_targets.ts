import { pgTable, uuid, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const formTargets = pgTable('form_targets', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id'),
  targetType: text('target_type'),
  httpMethod: text('http_method'),
  targetUrl: text('target_url'),
  headersJson: jsonb('headers_json'),
  authConfigJson: jsonb('auth_config_json'),
  mappingJson: jsonb('mapping_json'),
  isActive: boolean('is_active'),
  priority: integer('priority'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})