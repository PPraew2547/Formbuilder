CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid,
	"field_key" text,
	"label" text,
	"type" text,
	"placeholder" text,
	"required" boolean,
	"options_json" jsonb,
	"validation_json" jsonb,
	"visibility_json" jsonb,
	"default_value_json" jsonb,
	"sort_order" integer,
	"is_active" boolean,
	"created_at" timestamp,
	"updated_at" timestamp
);
