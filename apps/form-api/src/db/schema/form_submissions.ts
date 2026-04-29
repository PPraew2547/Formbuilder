import { pgTable, uuid, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'

export const formSubmissions = pgTable('form_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id'),
  formVersionId: uuid('form_version_id'),

  // pipeline status: received / validated / stored / forwarded / failed
  status: text('status'),

  // admin review status: new / reviewed / archived
  reviewStatus: text('review_status').default('new'),

  sourceType: text('source_type'),
  sourceUrl: text('source_url'),
  submitToken: text('submit_token'),
  payloadJson: jsonb('payload_json'),
  normalizedPayloadJson: jsonb('normalized_payload_json'),
  contextJson: jsonb('context_json'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  forwardStatus: text('forward_status'),
  retryCount: integer('retry_count'),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})