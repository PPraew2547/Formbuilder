import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const submissionAttempts = pgTable('submission_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  submissionId: uuid('submission_id'),
  targetId: uuid('target_id'),
  attemptNo: integer('attempt_no'),
  status: text('status'),
  responseStatusCode: integer('response_status_code'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  attemptedAt: timestamp('attempted_at'),
  nextRetryAt: timestamp('next_retry_at'),
})