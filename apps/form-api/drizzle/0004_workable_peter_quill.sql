CREATE TABLE "form_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"target_type" text,
	"http_method" text,
	"target_url" text,
	"headers_json" jsonb,
	"auth_config_json" jsonb,
	"mapping_json" jsonb,
	"is_active" boolean,
	"priority" integer,
	"created_at" timestamp,
	"updated_at" timestamp
);
