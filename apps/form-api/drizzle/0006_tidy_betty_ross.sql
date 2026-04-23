CREATE TABLE "form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"form_version_id" uuid,
	"status" text,
	"source_type" text,
	"source_url" text,
	"submit_token" text,
	"payload_json" jsonb,
	"normalized_payload_json" jsonb,
	"context_json" jsonb,
	"ip_address" text,
	"user_agent" text,
	"referer" text,
	"forward_status" text,
	"retry_count" integer,
	"submitted_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "submission_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid,
	"target_id" uuid,
	"attempt_no" integer,
	"status" text,
	"response_status_code" integer,
	"response_body" text,
	"error_message" text,
	"attempted_at" timestamp,
	"next_retry_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "submission_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid,
	"event_type" text,
	"message" text,
	"meta_json" jsonb,
	"created_at" timestamp
);
