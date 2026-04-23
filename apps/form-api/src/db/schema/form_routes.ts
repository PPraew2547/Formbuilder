import { pgTable, uuid, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core'

export const formRoutes = pgTable('form_routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id'),
  siteId: uuid('site_id'),
  matchType: text('match_type'),
  urlPattern: text('url_pattern'),
  priority: integer('priority'),
  isActive: boolean('is_active'),
  startAt: timestamp('start_at'),
  endAt: timestamp('end_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})