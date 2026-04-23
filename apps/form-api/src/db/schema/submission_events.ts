import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const submissionEvents = pgTable('submission_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  submissionId: uuid('submission_id'),
  eventType: text('event_type'),
  message: text('message'),
  metaJson: jsonb('meta_json'),
  createdAt: timestamp('created_at'),
})